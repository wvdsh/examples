const GameMode = enum(u8) {
    serve,
    play,
    game_over,
};

const StartupPhase = enum(u8) {
    prepare_game,
    init_sdk,
    wait_for_sdk,
    finalize_startup,
    ready,
    fatal,
};

extern fn js_clear(r: u8, g: u8, b: u8, a: u8) void;
extern fn js_fill_rect(x: f32, y: f32, width: f32, height: f32, r: u8, g: u8, b: u8, a: u8) void;
extern fn js_draw_text(ptr: [*]const u8, len: usize, x: f32, y: f32, size: f32, r: u8, g: u8, b: u8, a: u8) void;
extern fn js_host_set_loading(step_ptr: [*]const u8, step_len: usize, detail_ptr: [*]const u8, detail_len: usize, progress: f32) void;
extern fn js_host_set_status(ptr: [*]const u8, len: usize, r: u8, g: u8, b: u8, a: u8) void;
extern fn js_host_set_user(ptr: [*]const u8, len: usize) void;
extern fn js_host_hide_overlay() void;
extern fn js_host_show_fatal(message_ptr: [*]const u8, message_len: usize, detail_ptr: [*]const u8, detail_len: usize) void;
extern fn js_host_has_error() u8;
extern fn js_host_write_error(ptr: [*]u8, max_len: usize) usize;
extern fn js_wd_init(debug: u8, defer_events: u8) void;
extern fn js_wd_is_ready() u8;
extern fn js_wd_update_load_progress(progress: f32) void;
extern fn js_wd_ready_for_events() void;
extern fn js_wd_load_complete() void;
extern fn js_wd_write_user_name(ptr: [*]u8, max_len: usize) usize;

const win_score: i32 = 7;

var world_w: f32 = 960.0;
var world_h: f32 = 540.0;

var player_y: f32 = 0.0;
var ai_y: f32 = 0.0;
var ai_target_y: f32 = 0.0;
var ai_retarget_in: f32 = 0.0;

var ball_x: f32 = 0.0;
var ball_y: f32 = 0.0;
var ball_vx: f32 = 0.0;
var ball_vy: f32 = 0.0;
var serve_direction: f32 = 1.0;

var player_score: i32 = 0;
var ai_score: i32 = 0;
var winner: i32 = 0;
var mode: GameMode = .serve;
var startup_phase: StartupPhase = .prepare_game;
var startup_phase_elapsed: f32 = 0.0;
var fatal_visible = false;

var rng_state: u32 = 0x13572468;
var user_name_buf: [64]u8 = undefined;
var host_error_buf: [192]u8 = undefined;

fn absf(value: f32) f32 {
    return if (value < 0.0) -value else value;
}

fn clampf(value: f32, low: f32, high: f32) f32 {
    if (value < low) return low;
    if (value > high) return high;
    return value;
}

fn minf(a: f32, b: f32) f32 {
    return if (a < b) a else b;
}

fn scale_factor() f32 {
    const sx = world_w / 960.0;
    const sy = world_h / 540.0;
    return if (sx < sy) sx else sy;
}

fn paddle_w() f32 {
    return 18.0 * scale_factor();
}

fn paddle_h() f32 {
    return 108.0 * scale_factor();
}

fn ball_size() f32 {
    return 16.0 * scale_factor();
}

fn player_speed() f32 {
    return 520.0 * scale_factor();
}

fn ai_speed() f32 {
    return 430.0 * scale_factor();
}

fn player_x() f32 {
    return 40.0 * scale_factor();
}

fn ai_x() f32 {
    return world_w - paddle_w() - (40.0 * scale_factor());
}

fn random_unit() f32 {
    rng_state = rng_state *% 1664525 +% 1013904223;
    const raw: u32 = (rng_state >> 8) & 0x00ff_ffff;
    return @as(f32, @floatFromInt(raw)) / 16777215.0;
}

fn reflect_y(value: f32, min_y: f32, max_y: f32) f32 {
    var reflected = value;
    var guard: u8 = 0;
    while ((reflected < min_y or reflected > max_y) and guard < 8) : (guard += 1) {
        if (reflected < min_y) {
            reflected = min_y + (min_y - reflected);
        } else {
            reflected = max_y - (reflected - max_y);
        }
    }
    return clampf(reflected, min_y, max_y);
}

fn draw_text(text: []const u8, x: f32, y: f32, size: f32, r: u8, g: u8, b: u8, a: u8) void {
    js_draw_text(text.ptr, text.len, x, y, size, r, g, b, a);
}

fn score_text(score: i32) []const u8 {
    return switch (score) {
        0 => "0",
        1 => "1",
        2 => "2",
        3 => "3",
        4 => "4",
        5 => "5",
        6 => "6",
        7 => "7",
        8 => "8",
        else => "9",
    };
}

fn host_set_loading(step: []const u8, detail: []const u8, progress: f32) void {
    js_host_set_loading(step.ptr, step.len, detail.ptr, detail.len, progress);
    js_wd_update_load_progress(progress);
}

fn host_set_status(text: []const u8, r: u8, g: u8, b: u8, a: u8) void {
    js_host_set_status(text.ptr, text.len, r, g, b, a);
}

fn host_set_user(name: []const u8) void {
    js_host_set_user(name.ptr, name.len);
}

fn sync_user_from_sdk() void {
    const len = js_wd_write_user_name(&user_name_buf, user_name_buf.len);
    if (len > 0) {
        host_set_user(user_name_buf[0..len]);
    } else {
        host_set_user("");
    }
}

fn show_fatal(message: []const u8, detail: []const u8) void {
    if (!fatal_visible) {
        js_host_show_fatal(message.ptr, message.len, detail.ptr, detail.len);
        fatal_visible = true;
    }
    startup_phase = .fatal;
}

fn show_host_error() void {
    const len = js_host_write_error(&host_error_buf, host_error_buf.len);
    const detail = if (len > 0) host_error_buf[0..len] else "Unknown host error.";
    show_fatal("The Zig startup bridge hit an error.", detail);
}

fn check_host_error() bool {
    if (js_host_has_error() == 0) {
        return false;
    }

    show_host_error();
    return true;
}

fn transition_startup(next: StartupPhase) void {
    startup_phase = next;
    startup_phase_elapsed = 0.0;

    switch (next) {
        .prepare_game => {
            host_set_status("SDK pending", 148, 163, 184, 255);
            host_set_user("");
            host_set_loading(
                "Preparing Zig game state",
                "Handing Wavedash startup control to Zig.",
                0.42,
            );
        },
        .init_sdk => {
            host_set_status("SDK starting", 250, 204, 21, 255);
            host_set_loading(
                "Initializing Wavedash SDK",
                "Calling imported Wavedash bindings from Zig.",
                0.58,
            );
            js_wd_init(1, 1);
        },
        .wait_for_sdk => {
            host_set_loading(
                "Waiting for SDK readiness",
                "Polling WavedashJS.isReady() before gameplay begins.",
                0.82,
            );
        },
        .finalize_startup => {
            host_set_loading(
                "Finalizing game startup",
                "Preparing the first playable Pong serve state.",
                0.96,
            );
        },
        .ready => {
            host_set_loading(
                "Loading complete",
                "Releasing deferred SDK events and handing over to gameplay.",
                1.0,
            );
            js_wd_ready_for_events();
            js_wd_load_complete();
            js_host_hide_overlay();
        },
        .fatal => {},
    }
}

fn update_startup(dt: f32) void {
    if (startup_phase == .ready or startup_phase == .fatal) {
        return;
    }

    if (check_host_error()) {
        return;
    }

    startup_phase_elapsed += dt;

    switch (startup_phase) {
        .prepare_game => {
            if (startup_phase_elapsed >= 0.08) {
                transition_startup(.init_sdk);
            }
        },
        .init_sdk => {
            if (startup_phase_elapsed >= 0.08) {
                transition_startup(.wait_for_sdk);
            }
        },
        .wait_for_sdk => {
            if (js_wd_is_ready() != 0) {
                host_set_status("SDK ready", 34, 197, 94, 255);
                sync_user_from_sdk();
                transition_startup(.finalize_startup);
            } else if (startup_phase_elapsed >= 6.0) {
                show_fatal(
                    "Wavedash SDK did not become ready.",
                    "WavedashJS.isReady() did not report ready before the startup timeout.",
                );
            }
        },
        .finalize_startup => {
            if (startup_phase_elapsed >= 0.08) {
                transition_startup(.ready);
            }
        },
        .ready, .fatal => {},
    }
}

fn center_paddles() void {
    const centered = (world_h - paddle_h()) * 0.5;
    player_y = centered;
    ai_y = centered;
    ai_target_y = world_h * 0.5;
}

fn reset_ball() void {
    const size = ball_size();
    ball_x = (world_w - size) * 0.5;
    ball_y = (world_h - size) * 0.5;
    ball_vx = 0.0;
    ball_vy = 0.0;
}

fn prepare_serve(direction: f32) void {
    serve_direction = direction;
    mode = .serve;
    ai_retarget_in = 0.0;
    center_paddles();
    reset_ball();
}

fn restart_match() void {
    player_score = 0;
    ai_score = 0;
    winner = 0;
    prepare_serve(if (random_unit() < 0.5) -1.0 else 1.0);
}

fn start_serve() void {
    const sf = scale_factor();
    mode = .play;
    ball_x = (world_w - ball_size()) * 0.5;
    ball_y = (world_h - ball_size()) * 0.5;
    ball_vx = serve_direction * (350.0 * sf);
    ball_vy = (random_unit() * 2.0 - 1.0) * (160.0 * sf);

    if (absf(ball_vy) < 70.0 * sf) {
        ball_vy = if (ball_vy < 0.0) -(90.0 * sf) else (90.0 * sf);
    }
}

fn award_point(player_scored: bool) void {
    if (player_scored) {
        player_score += 1;
        if (player_score >= win_score) {
            winner = 1;
            mode = .game_over;
            reset_ball();
            return;
        }
        prepare_serve(1.0);
    } else {
        ai_score += 1;
        if (ai_score >= win_score) {
            winner = 2;
            mode = .game_over;
            reset_ball();
            return;
        }
        prepare_serve(-1.0);
    }
}

fn update_player(dt: f32, move_up: bool, move_down: bool) void {
    var direction: f32 = 0.0;
    if (move_up) direction -= 1.0;
    if (move_down) direction += 1.0;

    player_y = clampf(
        player_y + direction * player_speed() * dt,
        0.0,
        world_h - paddle_h(),
    );
}

fn update_ai(dt: f32) void {
    const size = ball_size();
    const ph = paddle_h();

    if (mode == .play and ball_vx > 0.0) {
        ai_retarget_in -= dt;
        if (ai_retarget_in <= 0.0) {
            ai_retarget_in = 0.08 + random_unit() * 0.09;

            const ball_center_x = ball_x + size * 0.5;
            const ball_center_y = ball_y + size * 0.5;
            const distance_to_paddle = ai_x() - ball_center_x;
            const lead_time = if (ball_vx > 0.0 and distance_to_paddle > 0.0) distance_to_paddle / ball_vx else 0.0;
            const projected = reflect_y(
                ball_center_y + ball_vy * lead_time,
                size * 0.5,
                world_h - size * 0.5,
            );

            const miss_window = ph * (0.18 + random_unit() * 0.32);
            ai_target_y = projected + (random_unit() * 2.0 - 1.0) * miss_window;
        }
    } else {
        ai_retarget_in = 0.0;
        ai_target_y = world_h * 0.5;
    }

    const current_center = ai_y + ph * 0.5;
    var move = ai_target_y - current_center;
    const max_move = ai_speed() * dt;

    if (move > max_move) move = max_move;
    if (move < -max_move) move = -max_move;

    ai_y = clampf(ai_y + move, 0.0, world_h - ph);
}

fn bounce_from_paddle(left_side: bool, paddle_top: f32, paddle_left: f32) void {
    const sf = scale_factor();
    const size = ball_size();
    const ph = paddle_h();

    const impact = clampf(
        ((ball_y + size * 0.5) - (paddle_top + ph * 0.5)) / (ph * 0.5),
        -1.0,
        1.0,
    );

    const next_speed_x = minf(absf(ball_vx) * 1.05 + 22.0 * sf, 820.0 * sf);
    var next_speed_y = clampf(ball_vy + impact * (250.0 * sf), -560.0 * sf, 560.0 * sf);

    if (absf(next_speed_y) < 80.0 * sf) {
        next_speed_y = if (impact < 0.0) -(100.0 * sf) else (100.0 * sf);
    }

    next_speed_y += (random_unit() * 2.0 - 1.0) * (22.0 * sf);

    if (left_side) {
        ball_x = paddle_left + paddle_w();
        ball_vx = next_speed_x;
    } else {
        ball_x = paddle_left - size;
        ball_vx = -next_speed_x;
    }

    ball_vy = next_speed_y;
}

fn update_ball(dt: f32) void {
    if (mode != .play) return;

    const size = ball_size();
    const pw = paddle_w();
    const ph = paddle_h();
    const px = player_x();
    const ax = ai_x();

    ball_x += ball_vx * dt;
    ball_y += ball_vy * dt;

    if (ball_y <= 0.0) {
        ball_y = 0.0;
        ball_vy = absf(ball_vy);
    } else if (ball_y + size >= world_h) {
        ball_y = world_h - size;
        ball_vy = -absf(ball_vy);
    }

    if (ball_vx < 0.0 and
        ball_x <= px + pw and
        ball_x + size >= px and
        ball_y + size >= player_y and
        ball_y <= player_y + ph)
    {
        bounce_from_paddle(true, player_y, px);
    } else if (ball_vx > 0.0 and
        ball_x + size >= ax and
        ball_x <= ax + pw and
        ball_y + size >= ai_y and
        ball_y <= ai_y + ph)
    {
        bounce_from_paddle(false, ai_y, ax);
    }

    if (ball_x + size < 0.0) {
        award_point(false);
    } else if (ball_x > world_w) {
        award_point(true);
    }
}

fn current_banner() []const u8 {
    return switch (mode) {
        .serve => "PRESS SPACE TO SERVE",
        .play => "FIRST TO 7",
        .game_over => if (winner == 1) "YOU WIN - PRESS SPACE TO PLAY AGAIN" else "CPU WINS - PRESS SPACE TO TRY AGAIN",
    };
}

fn current_subtitle() []const u8 {
    return switch (mode) {
        .serve => "W/S or arrow keys move the paddle",
        .play => "Hard AI, but it can be beaten with angled returns",
        .game_over => "Mix in quick direction changes to beat the CPU",
    };
}

fn render() void {
    const sf = scale_factor();
    const size = ball_size();
    const pw = paddle_w();
    const ph = paddle_h();

    js_clear(3, 7, 18, 255);

    var dash_y = 28.0 * sf;
    while (dash_y < world_h - 28.0 * sf) : (dash_y += 32.0 * sf) {
        js_fill_rect(world_w * 0.5 - 3.0 * sf, dash_y, 6.0 * sf, 18.0 * sf, 119, 138, 160, 110);
    }

    js_fill_rect(0.0, 0.0, world_w, 6.0 * sf, 8, 15, 36, 255);
    js_fill_rect(0.0, world_h - 6.0 * sf, world_w, 6.0 * sf, 8, 15, 36, 255);

    js_fill_rect(player_x(), player_y, pw, ph, 92, 227, 255, 255);
    js_fill_rect(ai_x(), ai_y, pw, ph, 255, 181, 71, 255);
    js_fill_rect(ball_x, ball_y, size, size, 248, 250, 252, 255);

    draw_text("PLAYER", world_w * 0.20, 46.0 * sf, 18.0 * sf, 148, 163, 184, 255);
    draw_text("CPU", world_w * 0.73, 46.0 * sf, 18.0 * sf, 148, 163, 184, 255);
    draw_text(score_text(player_score), world_w * 0.41, 78.0 * sf, 54.0 * sf, 230, 244, 255, 255);
    draw_text(score_text(ai_score), world_w * 0.55, 78.0 * sf, 54.0 * sf, 255, 237, 213, 255);

    js_fill_rect(world_w * 0.19, world_h * 0.74, world_w * 0.62, 76.0 * sf, 8, 15, 30, 170);
    draw_text(current_banner(), world_w * 0.24, world_h * 0.80, 22.0 * sf, 226, 232, 240, 255);
    draw_text(current_subtitle(), world_w * 0.24, world_h * 0.86, 14.0 * sf, 148, 163, 184, 255);
}

export fn wd_init(width: f32, height: f32) void {
    world_w = if (width > 320.0) width else 960.0;
    world_h = if (height > 240.0) height else 540.0;
    fatal_visible = false;
    restart_match();
    transition_startup(.prepare_game);
    render();
}

export fn wd_resize(width: f32, height: f32) void {
    world_w = if (width > 320.0) width else world_w;
    world_h = if (height > 240.0) height else world_h;

    player_y = clampf(player_y, 0.0, world_h - paddle_h());
    ai_y = clampf(ai_y, 0.0, world_h - paddle_h());
    ball_x = clampf(ball_x, 0.0, world_w - ball_size());
    ball_y = clampf(ball_y, 0.0, world_h - ball_size());

    render();
}

export fn wd_tick(dt_seconds: f32, move_up: u8, move_down: u8, action_pressed: u8) void {
    const dt = clampf(dt_seconds, 0.0, 0.033);

    if (check_host_error()) {
        return;
    }

    if (startup_phase == .fatal) {
        return;
    }

    if (startup_phase != .ready) {
        update_startup(dt);
        render();
        return;
    }

    if (action_pressed != 0) {
        if (mode == .serve) {
            start_serve();
        } else if (mode == .game_over) {
            restart_match();
        }
    }

    update_player(dt, move_up != 0, move_down != 0);
    update_ai(dt);
    update_ball(dt);
    render();
}
