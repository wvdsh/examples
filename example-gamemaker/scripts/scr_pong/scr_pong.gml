#macro FIELD_W  960
#macro FIELD_H  540

#macro PADDLE_W       12
#macro PADDLE_H       80
#macro PADDLE_MARGIN  30
#macro BALL_RADIUS    8
#macro WIN_SCORE      7

#macro PLAYER_SPEED       480
#macro CPU_SPEED          340
#macro START_BALL_SPEED_X 520
#macro START_BALL_SPEED_Y 180
#macro MAX_BALL_SPEED_X   780
#macro MAX_BALL_SPEED_Y   420

function pong_prepare_serve(_direction) {
    phase       = "serve";
    serve_dir   = _direction;
    player_y    = FIELD_H / 2;
    cpu_y       = FIELD_H / 2;
    cpu_target_y    = FIELD_H / 2;
    cpu_retarget_in = 0;
    ball_x = FIELD_W / 2;
    ball_y = FIELD_H / 2;
    ball_vx = 0;
    ball_vy = 0;
}

function pong_start_serve() {
    phase   = "play";
    ball_vx = serve_dir * START_BALL_SPEED_X;
    ball_vy = random_range(-START_BALL_SPEED_Y, START_BALL_SPEED_Y);

    if (abs(ball_vy) < 40) {
        ball_vy = (ball_vy < 0) ? -50 : 50;
    }
}

function pong_restart_match() {
    player_score = 0;
    cpu_score    = 0;
    winner       = "";
    pong_prepare_serve(choose(-1, 1));
}

function pong_update_player(_dt) {
    var _move_up   = keyboard_check(ord("W")) || keyboard_check(vk_up);
    var _move_down = keyboard_check(ord("S")) || keyboard_check(vk_down);
    var _dir       = _move_down - _move_up;
    var _half_h    = PADDLE_H / 2;

    player_y = clamp(player_y + _dir * PLAYER_SPEED * _dt, _half_h, FIELD_H - _half_h);
}

function pong_update_cpu(_dt) {
    var _half_h = PADDLE_H / 2;
    var _min_y  = _half_h;
    var _max_y  = FIELD_H - _half_h;

    if (phase == "play" && ball_vx > 0) {
        cpu_retarget_in -= _dt;

        if (cpu_retarget_in <= 0) {
            cpu_retarget_in = 0.16 + random(0.18);
            cpu_target_y    = ball_y + random_range(-20, 20);
        }
    } else {
        cpu_retarget_in = 0;
        cpu_target_y    = FIELD_H / 2;
    }

    var _max_move = CPU_SPEED * _dt;
    var _diff     = cpu_target_y - cpu_y;
    var _move     = clamp(_diff, -_max_move, _max_move);
    cpu_y = clamp(cpu_y + _move, _min_y, _max_y);
}

function pong_update_ball(_dt) {
    ball_x += ball_vx * _dt;
    ball_y += ball_vy * _dt;

    if (ball_y <= BALL_RADIUS) {
        ball_y  = BALL_RADIUS;
        ball_vy = abs(ball_vy);
    } else if (ball_y >= FIELD_H - BALL_RADIUS) {
        ball_y  = FIELD_H - BALL_RADIUS;
        ball_vy = -abs(ball_vy);
    }

    var _paddle_half  = PADDLE_H / 2;
    var _player_right = PADDLE_MARGIN + PADDLE_W;
    var _cpu_left     = FIELD_W - PADDLE_MARGIN - PADDLE_W;

    if (ball_vx < 0
        && ball_x - BALL_RADIUS <= _player_right
        && ball_x + BALL_RADIUS >= PADDLE_MARGIN
        && abs(ball_y - player_y) <= _paddle_half) {
        pong_bounce_paddle(true);
    }

    if (ball_vx > 0
        && ball_x + BALL_RADIUS >= _cpu_left
        && ball_x - BALL_RADIUS <= FIELD_W - PADDLE_MARGIN
        && abs(ball_y - cpu_y) <= _paddle_half) {
        pong_bounce_paddle(false);
    }

    if (ball_x < -BALL_RADIUS * 3) {
        pong_award_point(false);
    } else if (ball_x > FIELD_W + BALL_RADIUS * 3) {
        pong_award_point(true);
    }
}

function pong_bounce_paddle(_is_player) {
    var _paddle_y    = _is_player ? player_y : cpu_y;
    var _paddle_half = PADDLE_H / 2;
    var _impact      = clamp((ball_y - _paddle_y) / max(_paddle_half, 1), -1, 1);

    var _next_speed_x = min(abs(ball_vx) * 1.08 + 20, MAX_BALL_SPEED_X);
    var _next_speed_y = clamp(ball_vy + _impact * 160, -MAX_BALL_SPEED_Y, MAX_BALL_SPEED_Y);

    if (abs(_next_speed_y) < 40) {
        _next_speed_y = (_impact < 0) ? -50 : 50;
    }

    _next_speed_y += random_range(-10, 10);

    if (_is_player) {
        ball_x  = PADDLE_MARGIN + PADDLE_W + BALL_RADIUS + 1;
        ball_vx = _next_speed_x;
    } else {
        ball_x  = FIELD_W - PADDLE_MARGIN - PADDLE_W - BALL_RADIUS - 1;
        ball_vx = -_next_speed_x;
    }

    ball_vy = _next_speed_y;
}

function pong_award_point(_player_scored) {
    if (_player_scored) {
        player_score += 1;

        if (player_score >= WIN_SCORE) {
            phase   = "game_over";
            winner  = "Player";
            ball_vx = 0;
            ball_vy = 0;
            return;
        }

        pong_prepare_serve(1);
        pong_start_serve();
        return;
    }

    cpu_score += 1;

    if (cpu_score >= WIN_SCORE) {
        phase   = "game_over";
        winner  = "CPU";
        ball_vx = 0;
        ball_vy = 0;
        return;
    }

    pong_prepare_serve(-1);
    pong_start_serve();
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

function pong_shorten(_text, _max_len) {
    if (string_length(_text) <= _max_len) return _text;
    return string_copy(_text, 1, _max_len - 3) + "...";
}

function pong_draw_game() {
    draw_set_colour(c_dkgray);
    var _cx = FIELD_W / 2;
    for (var _y = 0; _y < FIELD_H; _y += 20) {
        draw_rectangle(_cx - 1, _y, _cx + 1, min(_y + 10, FIELD_H), false);
    }

    draw_set_colour(c_white);

    draw_rectangle(
        PADDLE_MARGIN,               player_y - PADDLE_H / 2,
        PADDLE_MARGIN + PADDLE_W,    player_y + PADDLE_H / 2,
        false);

    var _cpu_x = FIELD_W - PADDLE_MARGIN - PADDLE_W;
    draw_rectangle(
        _cpu_x,              cpu_y - PADDLE_H / 2,
        _cpu_x + PADDLE_W,  cpu_y + PADDLE_H / 2,
        false);

    draw_circle(ball_x, ball_y, BALL_RADIUS, false);

    draw_set_halign(fa_center);
    draw_set_valign(fa_top);
    draw_set_colour(c_white);
    draw_text(FIELD_W / 2 - 80, 40, string(player_score));
    draw_text(FIELD_W / 2 + 80, 40, string(cpu_score));

    draw_set_colour(c_gray);
    draw_text(FIELD_W / 2 - 80, 56, "PLAYER");
    draw_text(FIELD_W / 2 + 80, 56, "CPU");

}

