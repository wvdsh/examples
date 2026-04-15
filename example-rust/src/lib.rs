use std::cell::RefCell;

type Rgba = [u8; 4];

const DEFAULT_WORLD_W: f32 = 960.0;
const DEFAULT_WORLD_H: f32 = 540.0;
const MIN_WORLD_W: f32 = 320.0;
const MIN_WORLD_H: f32 = 240.0;
const WIN_SCORE: i32 = 7;

const STARTUP_STEP_DELAY: f32 = 0.08;
const STARTUP_TIMEOUT: f32 = 6.0;

const STATUS_PENDING: Rgba = [148, 163, 184, 255];
const STATUS_STARTING: Rgba = [250, 204, 21, 255];
const STATUS_READY: Rgba = [34, 197, 94, 255];
const BACKGROUND_COLOR: Rgba = [3, 7, 18, 255];
const ARENA_EDGE_COLOR: Rgba = [8, 15, 36, 255];
const CENTER_DASH_COLOR: Rgba = [119, 138, 160, 110];
const PLAYER_COLOR: Rgba = [92, 227, 255, 255];
const CPU_COLOR: Rgba = [255, 181, 71, 255];
const BALL_COLOR: Rgba = [248, 250, 252, 255];
const BANNER_PANEL_COLOR: Rgba = [8, 15, 30, 170];
const SCORE_PLAYER_COLOR: Rgba = [230, 244, 255, 255];
const SCORE_CPU_COLOR: Rgba = [255, 237, 213, 255];
const BANNER_TEXT_COLOR: Rgba = [226, 232, 240, 255];

// Rust owns game state and startup sequencing. The JS host only provides
// browser bindings, canvas drawing primitives, input, and WavedashJS access.
std::thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());
}

// Raw imports implemented by `web/game.js`.
unsafe extern "C" {
    fn js_clear(r: u8, g: u8, b: u8, a: u8);
    fn js_fill_rect(x: f32, y: f32, width: f32, height: f32, r: u8, g: u8, b: u8, a: u8);
    fn js_draw_text(ptr: *const u8, len: usize, x: f32, y: f32, size: f32, r: u8, g: u8, b: u8, a: u8);

    fn js_host_set_loading(
        step_ptr: *const u8,
        step_len: usize,
        detail_ptr: *const u8,
        detail_len: usize,
        progress: f32,
    );
    fn js_host_set_status(ptr: *const u8, len: usize, r: u8, g: u8, b: u8, a: u8);
    fn js_host_set_user(ptr: *const u8, len: usize);
    fn js_host_hide_overlay();
    fn js_host_show_fatal(
        message_ptr: *const u8,
        message_len: usize,
        detail_ptr: *const u8,
        detail_len: usize,
    );
    fn js_host_has_error() -> u8;
    fn js_host_write_error(ptr: *mut u8, max_len: usize) -> usize;

    fn js_wd_init(debug: u8, defer_events: u8);
    fn js_wd_is_ready() -> u8;
    fn js_wd_update_load_progress(progress: f32);
    fn js_wd_ready_for_events();
    fn js_wd_load_complete();
    fn js_wd_write_user_name(ptr: *mut u8, max_len: usize) -> usize;
}

#[derive(Copy, Clone, Eq, PartialEq)]
enum GameMode {
    Serve,
    Play,
    GameOver,
}

#[derive(Copy, Clone, Eq, PartialEq)]
enum StartupPhase {
    PrepareGame,
    InitSdk,
    WaitForSdk,
    FinalizeStartup,
    Ready,
    Fatal,
}

struct State {
    world_w: f32,
    world_h: f32,
    player_y: f32,
    ai_y: f32,
    ai_target_y: f32,
    ai_retarget_in: f32,
    ball_x: f32,
    ball_y: f32,
    ball_vx: f32,
    ball_vy: f32,
    serve_direction: f32,
    player_score: i32,
    ai_score: i32,
    winner: i32,
    mode: GameMode,
    startup_phase: StartupPhase,
    startup_phase_elapsed: f32,
    fatal_visible: bool,
    rng_state: u32,
    user_name_buf: [u8; 64],
    host_error_buf: [u8; 192],
}

impl Default for State {
    fn default() -> Self {
        Self {
            world_w: DEFAULT_WORLD_W,
            world_h: DEFAULT_WORLD_H,
            player_y: 0.0,
            ai_y: 0.0,
            ai_target_y: 0.0,
            ai_retarget_in: 0.0,
            ball_x: 0.0,
            ball_y: 0.0,
            ball_vx: 0.0,
            ball_vy: 0.0,
            serve_direction: 1.0,
            player_score: 0,
            ai_score: 0,
            winner: 0,
            mode: GameMode::Serve,
            startup_phase: StartupPhase::PrepareGame,
            startup_phase_elapsed: 0.0,
            fatal_visible: false,
            rng_state: 0x1357_2468,
            user_name_buf: [0; 64],
            host_error_buf: [0; 192],
        }
    }
}

// --- Layout helpers ---------------------------------------------------------

impl State {
    fn scale_factor(&self) -> f32 {
        let sx = self.world_w / DEFAULT_WORLD_W;
        let sy = self.world_h / DEFAULT_WORLD_H;
        sx.min(sy)
    }

    fn paddle_w(&self) -> f32 {
        18.0 * self.scale_factor()
    }

    fn paddle_h(&self) -> f32 {
        108.0 * self.scale_factor()
    }

    fn ball_size(&self) -> f32 {
        16.0 * self.scale_factor()
    }

    fn player_speed(&self) -> f32 {
        520.0 * self.scale_factor()
    }

    fn ai_speed(&self) -> f32 {
        430.0 * self.scale_factor()
    }

    fn player_x(&self) -> f32 {
        40.0 * self.scale_factor()
    }

    fn ai_x(&self) -> f32 {
        self.world_w - self.paddle_w() - (40.0 * self.scale_factor())
    }

    fn random_unit(&mut self) -> f32 {
        self.rng_state = self
            .rng_state
            .wrapping_mul(1_664_525)
            .wrapping_add(1_013_904_223);
        let raw = (self.rng_state >> 8) & 0x00ff_ffff;
        raw as f32 / 16_777_215.0
    }

    fn reflect_y(&self, value: f32, min_y: f32, max_y: f32) -> f32 {
        let mut reflected = value;
        let mut guard = 0;

        while (reflected < min_y || reflected > max_y) && guard < 8 {
            if reflected < min_y {
                reflected = min_y + (min_y - reflected);
            } else {
                reflected = max_y - (reflected - max_y);
            }
            guard += 1;
        }

        clamp(reflected, min_y, max_y)
    }
}

// --- Host bridge helpers ----------------------------------------------------

impl State {
    fn host_set_loading(&self, step: &str, detail: &str, progress: f32) {
        unsafe {
            js_host_set_loading(
                step.as_ptr(),
                step.len(),
                detail.as_ptr(),
                detail.len(),
                progress,
            );
            js_wd_update_load_progress(progress);
        }
    }

    fn host_set_status(&self, text: &str, color: Rgba) {
        unsafe {
            js_host_set_status(
                text.as_ptr(),
                text.len(),
                color[0],
                color[1],
                color[2],
                color[3],
            );
        }
    }

    fn host_set_user(&self, name: &str) {
        unsafe {
            js_host_set_user(name.as_ptr(), name.len());
        }
    }

    fn sync_user_from_sdk(&mut self) {
        let len = unsafe { js_wd_write_user_name(self.user_name_buf.as_mut_ptr(), self.user_name_buf.len()) };

        if len > 0 {
            unsafe {
                js_host_set_user(self.user_name_buf.as_ptr(), len);
            }
        } else {
            self.host_set_user("");
        }
    }

    fn show_fatal(&mut self, message: &str, detail: &str) {
        self.show_fatal_bytes(message, detail.as_ptr(), detail.len());
    }

    fn show_fatal_bytes(&mut self, message: &str, detail_ptr: *const u8, detail_len: usize) {
        if !self.fatal_visible {
            unsafe {
                js_host_show_fatal(message.as_ptr(), message.len(), detail_ptr, detail_len);
            }
            self.fatal_visible = true;
        }

        self.startup_phase = StartupPhase::Fatal;
    }

    fn show_host_error(&mut self) {
        let len = unsafe { js_host_write_error(self.host_error_buf.as_mut_ptr(), self.host_error_buf.len()) };

        if len > 0 {
            let detail_ptr = self.host_error_buf.as_ptr();
            self.show_fatal_bytes("The Rust startup bridge hit an error.", detail_ptr, len);
        } else {
            self.show_fatal("The Rust startup bridge hit an error.", "Unknown host error.");
        }
    }

    fn check_host_error(&mut self) -> bool {
        if unsafe { js_host_has_error() } == 0 {
            return false;
        }

        self.show_host_error();
        true
    }
}

// --- Startup flow -----------------------------------------------------------

impl State {
    fn transition_startup(&mut self, next: StartupPhase) {
        self.startup_phase = next;
        self.startup_phase_elapsed = 0.0;

        match next {
            StartupPhase::PrepareGame => {
                self.host_set_status("SDK pending", STATUS_PENDING);
                self.host_set_user("");
                self.host_set_loading(
                    "Preparing Rust game state",
                    "Handing Wavedash startup control to Rust.",
                    0.42,
                );
            }
            StartupPhase::InitSdk => {
                self.host_set_status("SDK starting", STATUS_STARTING);
                self.host_set_loading(
                    "Initializing Wavedash SDK",
                    "Calling imported Wavedash bindings from Rust.",
                    0.58,
                );
                unsafe {
                    js_wd_init(1, 1);
                }
            }
            StartupPhase::WaitForSdk => {
                self.host_set_loading(
                    "Waiting for SDK readiness",
                    "Polling WavedashJS.isReady() before gameplay begins.",
                    0.82,
                );
            }
            StartupPhase::FinalizeStartup => {
                self.host_set_loading(
                    "Finalizing game startup",
                    "Preparing the first playable Pong serve state.",
                    0.96,
                );
            }
            StartupPhase::Ready => {
                self.host_set_loading(
                    "Loading complete",
                    "Releasing deferred SDK events and handing over to gameplay.",
                    1.0,
                );
                unsafe {
                    js_wd_ready_for_events();
                    js_wd_load_complete();
                    js_host_hide_overlay();
                }
            }
            StartupPhase::Fatal => {}
        }
    }

    fn update_startup(&mut self, dt: f32) {
        if matches!(self.startup_phase, StartupPhase::Ready | StartupPhase::Fatal) {
            return;
        }

        if self.check_host_error() {
            return;
        }

        self.startup_phase_elapsed += dt;

        match self.startup_phase {
            StartupPhase::PrepareGame => {
                if self.startup_phase_elapsed >= STARTUP_STEP_DELAY {
                    self.transition_startup(StartupPhase::InitSdk);
                }
            }
            StartupPhase::InitSdk => {
                if self.startup_phase_elapsed >= STARTUP_STEP_DELAY {
                    self.transition_startup(StartupPhase::WaitForSdk);
                }
            }
            StartupPhase::WaitForSdk => {
                if unsafe { js_wd_is_ready() } != 0 {
                    self.host_set_status("SDK ready", STATUS_READY);
                    self.sync_user_from_sdk();
                    self.transition_startup(StartupPhase::FinalizeStartup);
                } else if self.startup_phase_elapsed >= STARTUP_TIMEOUT {
                    self.show_fatal(
                        "Wavedash SDK did not become ready.",
                        "WavedashJS.isReady() did not report ready before the startup timeout.",
                    );
                }
            }
            StartupPhase::FinalizeStartup => {
                if self.startup_phase_elapsed >= STARTUP_STEP_DELAY {
                    self.transition_startup(StartupPhase::Ready);
                }
            }
            StartupPhase::Ready | StartupPhase::Fatal => {}
        }
    }
}

// --- Gameplay ---------------------------------------------------------------

impl State {
    fn center_paddles(&mut self) {
        let centered = (self.world_h - self.paddle_h()) * 0.5;
        self.player_y = centered;
        self.ai_y = centered;
        self.ai_target_y = self.world_h * 0.5;
    }

    fn reset_ball(&mut self) {
        let size = self.ball_size();
        self.ball_x = (self.world_w - size) * 0.5;
        self.ball_y = (self.world_h - size) * 0.5;
        self.ball_vx = 0.0;
        self.ball_vy = 0.0;
    }

    fn prepare_serve(&mut self, direction: f32) {
        self.serve_direction = direction;
        self.mode = GameMode::Serve;
        self.ai_retarget_in = 0.0;
        self.center_paddles();
        self.reset_ball();
    }

    fn restart_match(&mut self) {
        self.player_score = 0;
        self.ai_score = 0;
        self.winner = 0;

        let direction = if self.random_unit() < 0.5 { -1.0 } else { 1.0 };
        self.prepare_serve(direction);
    }

    fn start_serve(&mut self) {
        let sf = self.scale_factor();
        self.mode = GameMode::Play;
        self.ball_x = (self.world_w - self.ball_size()) * 0.5;
        self.ball_y = (self.world_h - self.ball_size()) * 0.5;
        self.ball_vx = self.serve_direction * (350.0 * sf);
        self.ball_vy = (self.random_unit() * 2.0 - 1.0) * (160.0 * sf);

        if self.ball_vy.abs() < 70.0 * sf {
            self.ball_vy = if self.ball_vy < 0.0 { -(90.0 * sf) } else { 90.0 * sf };
        }
    }

    fn award_point(&mut self, player_scored: bool) {
        if player_scored {
            self.player_score += 1;
            if self.player_score >= WIN_SCORE {
                self.winner = 1;
                self.mode = GameMode::GameOver;
                self.reset_ball();
                return;
            }
            self.prepare_serve(1.0);
        } else {
            self.ai_score += 1;
            if self.ai_score >= WIN_SCORE {
                self.winner = 2;
                self.mode = GameMode::GameOver;
                self.reset_ball();
                return;
            }
            self.prepare_serve(-1.0);
        }
    }

    fn update_player(&mut self, dt: f32, move_up: bool, move_down: bool) {
        let mut direction = 0.0;

        if move_up {
            direction -= 1.0;
        }
        if move_down {
            direction += 1.0;
        }

        self.player_y = clamp(
            self.player_y + direction * self.player_speed() * dt,
            0.0,
            self.world_h - self.paddle_h(),
        );
    }

    fn update_ai(&mut self, dt: f32) {
        let size = self.ball_size();
        let paddle_h = self.paddle_h();

        if self.mode == GameMode::Play && self.ball_vx > 0.0 {
            self.ai_retarget_in -= dt;

            if self.ai_retarget_in <= 0.0 {
                self.ai_retarget_in = 0.08 + self.random_unit() * 0.09;

                let ball_center_x = self.ball_x + size * 0.5;
                let ball_center_y = self.ball_y + size * 0.5;
                let distance_to_paddle = self.ai_x() - ball_center_x;
                let lead_time = if self.ball_vx > 0.0 && distance_to_paddle > 0.0 {
                    distance_to_paddle / self.ball_vx
                } else {
                    0.0
                };
                let projected = self.reflect_y(
                    ball_center_y + self.ball_vy * lead_time,
                    size * 0.5,
                    self.world_h - size * 0.5,
                );
                let miss_window = paddle_h * (0.18 + self.random_unit() * 0.32);

                self.ai_target_y = projected + (self.random_unit() * 2.0 - 1.0) * miss_window;
            }
        } else {
            self.ai_retarget_in = 0.0;
            self.ai_target_y = self.world_h * 0.5;
        }

        let current_center = self.ai_y + paddle_h * 0.5;
        let mut movement = self.ai_target_y - current_center;
        let max_move = self.ai_speed() * dt;

        if movement > max_move {
            movement = max_move;
        }
        if movement < -max_move {
            movement = -max_move;
        }

        self.ai_y = clamp(self.ai_y + movement, 0.0, self.world_h - paddle_h);
    }

    fn bounce_from_paddle(&mut self, left_side: bool, paddle_top: f32, paddle_left: f32) {
        let sf = self.scale_factor();
        let size = self.ball_size();
        let paddle_h = self.paddle_h();
        let impact = clamp(
            ((self.ball_y + size * 0.5) - (paddle_top + paddle_h * 0.5)) / (paddle_h * 0.5),
            -1.0,
            1.0,
        );
        let next_speed_x = (self.ball_vx.abs() * 1.05 + 22.0 * sf).min(820.0 * sf);
        let mut next_speed_y = clamp(self.ball_vy + impact * (250.0 * sf), -560.0 * sf, 560.0 * sf);

        if next_speed_y.abs() < 80.0 * sf {
            next_speed_y = if impact < 0.0 { -(100.0 * sf) } else { 100.0 * sf };
        }

        next_speed_y += (self.random_unit() * 2.0 - 1.0) * (22.0 * sf);

        if left_side {
            self.ball_x = paddle_left + self.paddle_w();
            self.ball_vx = next_speed_x;
        } else {
            self.ball_x = paddle_left - size;
            self.ball_vx = -next_speed_x;
        }

        self.ball_vy = next_speed_y;
    }

    fn update_ball(&mut self, dt: f32) {
        if self.mode != GameMode::Play {
            return;
        }

        let size = self.ball_size();
        let paddle_w = self.paddle_w();
        let paddle_h = self.paddle_h();
        let player_x = self.player_x();
        let ai_x = self.ai_x();
        let player_y = self.player_y;
        let ai_y = self.ai_y;

        self.ball_x += self.ball_vx * dt;
        self.ball_y += self.ball_vy * dt;

        if self.ball_y <= 0.0 {
            self.ball_y = 0.0;
            self.ball_vy = self.ball_vy.abs();
        } else if self.ball_y + size >= self.world_h {
            self.ball_y = self.world_h - size;
            self.ball_vy = -self.ball_vy.abs();
        }

        if self.ball_vx < 0.0
            && self.ball_x <= player_x + paddle_w
            && self.ball_x + size >= player_x
            && self.ball_y + size >= player_y
            && self.ball_y <= player_y + paddle_h
        {
            self.bounce_from_paddle(true, player_y, player_x);
        } else if self.ball_vx > 0.0
            && self.ball_x + size >= ai_x
            && self.ball_x <= ai_x + paddle_w
            && self.ball_y + size >= ai_y
            && self.ball_y <= ai_y + paddle_h
        {
            self.bounce_from_paddle(false, ai_y, ai_x);
        }

        if self.ball_x + size < 0.0 {
            self.award_point(false);
        } else if self.ball_x > self.world_w {
            self.award_point(true);
        }
    }
}

// --- Rendering --------------------------------------------------------------

impl State {
    fn clear_canvas(&self, color: Rgba) {
        unsafe {
            js_clear(color[0], color[1], color[2], color[3]);
        }
    }

    fn fill_rect(&self, x: f32, y: f32, width: f32, height: f32, color: Rgba) {
        unsafe {
            js_fill_rect(
                x,
                y,
                width,
                height,
                color[0],
                color[1],
                color[2],
                color[3],
            );
        }
    }

    fn draw_text(&self, text: &str, x: f32, y: f32, size: f32, color: Rgba) {
        unsafe {
            js_draw_text(
                text.as_ptr(),
                text.len(),
                x,
                y,
                size,
                color[0],
                color[1],
                color[2],
                color[3],
            );
        }
    }

    fn score_text(&self, score: i32) -> &'static str {
        match score {
            0 => "0",
            1 => "1",
            2 => "2",
            3 => "3",
            4 => "4",
            5 => "5",
            6 => "6",
            7 => "7",
            8 => "8",
            _ => "9",
        }
    }

    fn current_banner(&self) -> &'static str {
        match self.mode {
            GameMode::Serve => "PRESS SPACE TO SERVE",
            GameMode::Play => "FIRST TO 7",
            GameMode::GameOver => {
                if self.winner == 1 {
                    "YOU WIN - PRESS SPACE TO PLAY AGAIN"
                } else {
                    "CPU WINS - PRESS SPACE TO TRY AGAIN"
                }
            }
        }
    }

    fn current_subtitle(&self) -> &'static str {
        match self.mode {
            GameMode::Serve => "W/S or arrow keys move the paddle",
            GameMode::Play => "Hard AI, but it can be beaten with angled returns",
            GameMode::GameOver => "Mix in quick direction changes to beat the CPU",
        }
    }

    fn render(&self) {
        let sf = self.scale_factor();
        let size = self.ball_size();
        let paddle_w = self.paddle_w();
        let paddle_h = self.paddle_h();

        self.clear_canvas(BACKGROUND_COLOR);

        let mut dash_y = 28.0 * sf;
        while dash_y < self.world_h - 28.0 * sf {
            self.fill_rect(
                self.world_w * 0.5 - 3.0 * sf,
                dash_y,
                6.0 * sf,
                18.0 * sf,
                CENTER_DASH_COLOR,
            );
            dash_y += 32.0 * sf;
        }

        self.fill_rect(0.0, 0.0, self.world_w, 6.0 * sf, ARENA_EDGE_COLOR);
        self.fill_rect(0.0, self.world_h - 6.0 * sf, self.world_w, 6.0 * sf, ARENA_EDGE_COLOR);

        self.fill_rect(self.player_x(), self.player_y, paddle_w, paddle_h, PLAYER_COLOR);
        self.fill_rect(self.ai_x(), self.ai_y, paddle_w, paddle_h, CPU_COLOR);
        self.fill_rect(self.ball_x, self.ball_y, size, size, BALL_COLOR);

        self.draw_text("PLAYER", self.world_w * 0.20, 46.0 * sf, 18.0 * sf, STATUS_PENDING);
        self.draw_text("CPU", self.world_w * 0.73, 46.0 * sf, 18.0 * sf, STATUS_PENDING);
        self.draw_text(
            self.score_text(self.player_score),
            self.world_w * 0.41,
            78.0 * sf,
            54.0 * sf,
            SCORE_PLAYER_COLOR,
        );
        self.draw_text(
            self.score_text(self.ai_score),
            self.world_w * 0.55,
            78.0 * sf,
            54.0 * sf,
            SCORE_CPU_COLOR,
        );

        self.fill_rect(
            self.world_w * 0.19,
            self.world_h * 0.74,
            self.world_w * 0.62,
            76.0 * sf,
            BANNER_PANEL_COLOR,
        );
        self.draw_text(
            self.current_banner(),
            self.world_w * 0.24,
            self.world_h * 0.80,
            22.0 * sf,
            BANNER_TEXT_COLOR,
        );
        self.draw_text(
            self.current_subtitle(),
            self.world_w * 0.24,
            self.world_h * 0.86,
            14.0 * sf,
            STATUS_PENDING,
        );
    }
}

fn clamp(value: f32, low: f32, high: f32) -> f32 {
    value.max(low).min(high)
}

fn init_dimension(measured: f32, minimum: f32, fallback: f32) -> f32 {
    if measured > minimum {
        measured
    } else {
        fallback
    }
}

fn resize_dimension(measured: f32, minimum: f32, current: f32) -> f32 {
    if measured > minimum {
        measured
    } else {
        current
    }
}

// Raw wasm exports called by `web/game.js`.
#[unsafe(no_mangle)]
pub extern "C" fn wd_init(width: f32, height: f32) {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.world_w = init_dimension(width, MIN_WORLD_W, DEFAULT_WORLD_W);
        state.world_h = init_dimension(height, MIN_WORLD_H, DEFAULT_WORLD_H);
        state.fatal_visible = false;
        state.restart_match();
        state.transition_startup(StartupPhase::PrepareGame);
        state.render();
    });
}

#[unsafe(no_mangle)]
pub extern "C" fn wd_resize(width: f32, height: f32) {
    STATE.with(|state| {
        let mut state = state.borrow_mut();

        state.world_w = resize_dimension(width, MIN_WORLD_W, state.world_w);
        state.world_h = resize_dimension(height, MIN_WORLD_H, state.world_h);

        let paddle_h = state.paddle_h();
        let ball_size = state.ball_size();
        let max_paddle_y = state.world_h - paddle_h;
        let max_ball_x = state.world_w - ball_size;
        let max_ball_y = state.world_h - ball_size;

        state.player_y = clamp(state.player_y, 0.0, max_paddle_y);
        state.ai_y = clamp(state.ai_y, 0.0, max_paddle_y);
        state.ball_x = clamp(state.ball_x, 0.0, max_ball_x);
        state.ball_y = clamp(state.ball_y, 0.0, max_ball_y);
        state.render();
    });
}

#[unsafe(no_mangle)]
pub extern "C" fn wd_tick(dt_seconds: f32, move_up: u8, move_down: u8, action_pressed: u8) {
    let dt = clamp(dt_seconds, 0.0, 0.033);

    STATE.with(|state| {
        let mut state = state.borrow_mut();

        if state.check_host_error() {
            return;
        }

        if state.startup_phase == StartupPhase::Fatal {
            return;
        }

        if state.startup_phase != StartupPhase::Ready {
            state.update_startup(dt);
            state.render();
            return;
        }

        if action_pressed != 0 {
            match state.mode {
                GameMode::Serve => state.start_serve(),
                GameMode::GameOver => state.restart_match(),
                GameMode::Play => {}
            }
        }

        state.update_player(dt, move_up != 0, move_down != 0);
        state.update_ai(dt);
        state.update_ball(dt);
        state.render();
    });
}
