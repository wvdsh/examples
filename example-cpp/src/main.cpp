#include <stdint.h>
#include <stddef.h>

// C++ owns the startup state machine and gameplay. The JS host only provides
// browser bindings, canvas drawing primitives, input, and WavedashJS access.

#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
#define WASM_EXPORT(name) __attribute__((export_name(#name)))

// --- Types ------------------------------------------------------------------

struct StringView {
    const char* ptr;
    size_t len;
};

template<size_t N>
constexpr StringView sv(const char (&s)[N]) {
    return {s, N - 1};
}

constexpr StringView sv(const char* p, size_t l) {
    return {p, l};
}

struct Color {
    uint8_t r, g, b, a;
};

enum class GameMode : uint8_t {
    Serve,
    Play,
    GameOver,
};

enum class StartupPhase : uint8_t {
    PrepareGame,
    InitSdk,
    WaitForSdk,
    FinalizeStartup,
    Ready,
    Fatal,
};

constexpr float DEFAULT_WORLD_W = 960.0f;
constexpr float DEFAULT_WORLD_H = 540.0f;
constexpr float MIN_WORLD_W = 320.0f;
constexpr float MIN_WORLD_H = 240.0f;
constexpr int32_t WIN_SCORE = 7;
constexpr float STARTUP_STEP_DELAY = 0.08f;
constexpr float STARTUP_TIMEOUT = 6.0f;
constexpr uint32_t INITIAL_RNG_STATE = 0x13572468u;
constexpr size_t USER_NAME_CAPACITY = 64;
constexpr size_t HOST_ERROR_CAPACITY = 192;

struct State {
    float world_w = DEFAULT_WORLD_W;
    float world_h = DEFAULT_WORLD_H;
    float player_y = 0.0f;
    float ai_y = 0.0f;
    float ai_target_y = 0.0f;
    float ai_retarget_in = 0.0f;
    float ball_x = 0.0f;
    float ball_y = 0.0f;
    float ball_vx = 0.0f;
    float ball_vy = 0.0f;
    float serve_direction = 1.0f;
    int32_t player_score = 0;
    int32_t ai_score = 0;
    int32_t winner = 0;
    GameMode mode = GameMode::Serve;
    StartupPhase startup_phase = StartupPhase::PrepareGame;
    float startup_phase_elapsed = 0.0f;
    bool fatal_visible = false;
    uint32_t rng_state = INITIAL_RNG_STATE;
    char user_name_buf[USER_NAME_CAPACITY] = {};
    char host_error_buf[HOST_ERROR_CAPACITY] = {};
};

// --- Wasm imports -----------------------------------------------------------

extern "C" {
    void js_clear(uint8_t r, uint8_t g, uint8_t b, uint8_t a) WASM_IMPORT(js_clear);
    void js_fill_rect(float x, float y, float width, float height,
                      uint8_t r, uint8_t g, uint8_t b, uint8_t a) WASM_IMPORT(js_fill_rect);
    void js_draw_text(const char* ptr, size_t len, float x, float y, float size,
                      uint8_t r, uint8_t g, uint8_t b, uint8_t a) WASM_IMPORT(js_draw_text);

    void js_host_set_loading(const char* step_ptr, size_t step_len,
                             const char* detail_ptr, size_t detail_len,
                             float progress) WASM_IMPORT(js_host_set_loading);
    void js_host_set_status(const char* ptr, size_t len,
                            uint8_t r, uint8_t g, uint8_t b, uint8_t a) WASM_IMPORT(js_host_set_status);
    void js_host_set_user(const char* ptr, size_t len) WASM_IMPORT(js_host_set_user);
    void js_host_hide_overlay() WASM_IMPORT(js_host_hide_overlay);
    void js_host_show_fatal(const char* message_ptr, size_t message_len,
                            const char* detail_ptr, size_t detail_len) WASM_IMPORT(js_host_show_fatal);
    uint8_t js_host_has_error() WASM_IMPORT(js_host_has_error);
    size_t js_host_write_error(char* ptr, size_t max_len) WASM_IMPORT(js_host_write_error);

    void js_wd_init(uint8_t debug, uint8_t defer_events) WASM_IMPORT(js_wd_init);
    uint8_t js_wd_is_ready() WASM_IMPORT(js_wd_is_ready);
    void js_wd_update_load_progress(float progress) WASM_IMPORT(js_wd_update_load_progress);
    void js_wd_ready_for_events() WASM_IMPORT(js_wd_ready_for_events);
    void js_wd_load_complete() WASM_IMPORT(js_wd_load_complete);
    size_t js_wd_write_user_name(char* ptr, size_t max_len) WASM_IMPORT(js_wd_write_user_name);
}

// --- Constants --------------------------------------------------------------

constexpr Color STATUS_PENDING     {148, 163, 184, 255};
constexpr Color STATUS_STARTING    {250, 204,  21, 255};
constexpr Color STATUS_READY       { 34, 197,  94, 255};
constexpr Color BACKGROUND_COLOR   {  3,   7,  18, 255};
constexpr Color ARENA_EDGE_COLOR   {  8,  15,  36, 255};
constexpr Color CENTER_DASH_COLOR  {119, 138, 160, 110};
constexpr Color PLAYER_COLOR       { 92, 227, 255, 255};
constexpr Color CPU_COLOR          {255, 181,  71, 255};
constexpr Color BALL_COLOR         {248, 250, 252, 255};
constexpr Color LABEL_COLOR        {148, 163, 184, 255};
constexpr Color SCORE_PLAYER_COLOR {230, 244, 255, 255};
constexpr Color SCORE_CPU_COLOR    {255, 237, 213, 255};
constexpr Color BANNER_PANEL_COLOR {  8,  15,  30, 170};
constexpr Color BANNER_TEXT_COLOR  {226, 232, 240, 255};

// --- Utility functions ------------------------------------------------------

template<typename T>
constexpr T abs_val(T v) { return v < T{0} ? -v : v; }

template<typename T>
constexpr T clamp(T v, T lo, T hi) { return v < lo ? lo : (v > hi ? hi : v); }

template<typename T>
constexpr T min_val(T a, T b) { return a < b ? a : b; }

// --- Global state -----------------------------------------------------------

static State g_state;

// --- Layout helpers ---------------------------------------------------------

static float scale_factor(const State& s) {
    auto sx = s.world_w / DEFAULT_WORLD_W;
    auto sy = s.world_h / DEFAULT_WORLD_H;
    return sx < sy ? sx : sy;
}

static float paddle_w(const State& s) { return 18.0f * scale_factor(s); }
static float paddle_h(const State& s) { return 108.0f * scale_factor(s); }
static float ball_size(const State& s) { return 16.0f * scale_factor(s); }
static float player_speed(const State& s) { return 520.0f * scale_factor(s); }
static float ai_speed(const State& s) { return 430.0f * scale_factor(s); }
static float player_x(const State& s) { return 40.0f * scale_factor(s); }

static float ai_x(const State& s) {
    return s.world_w - paddle_w(s) - (40.0f * scale_factor(s));
}

static float random_unit(State& s) {
    constexpr uint32_t raw_mask = 0x00ffffffu;
    s.rng_state = s.rng_state * 1664525u + 1013904223u;
    return static_cast<float>((s.rng_state >> 8u) & raw_mask) / 16777215.0f;
}

static float reflect_y(float value, float min_y, float max_y) {
    auto reflected = value;
    uint8_t guard = 0;

    while ((reflected < min_y || reflected > max_y) && guard < 8) {
        if (reflected < min_y) {
            reflected = min_y + (min_y - reflected);
        } else {
            reflected = max_y - (reflected - max_y);
        }
        ++guard;
    }

    return clamp(reflected, min_y, max_y);
}

// --- Host bridge helpers ----------------------------------------------------

static void clear_screen(Color c) {
    js_clear(c.r, c.g, c.b, c.a);
}

static void fill_rect(float x, float y, float width, float height, Color c) {
    js_fill_rect(x, y, width, height, c.r, c.g, c.b, c.a);
}

static void draw_text(StringView text, float x, float y, float size, Color c) {
    js_draw_text(text.ptr, text.len, x, y, size, c.r, c.g, c.b, c.a);
}

static void host_set_loading(StringView step, StringView detail, float progress) {
    js_host_set_loading(step.ptr, step.len, detail.ptr, detail.len, progress);
    js_wd_update_load_progress(progress);
}

static void host_set_status(StringView text, Color c) {
    js_host_set_status(text.ptr, text.len, c.r, c.g, c.b, c.a);
}

static void host_set_user(StringView name) {
    js_host_set_user(name.ptr, name.len);
}

static void sync_user_from_sdk(State& s) {
    auto len = js_wd_write_user_name(s.user_name_buf, USER_NAME_CAPACITY);

    if (len > 0) {
        host_set_user(sv(s.user_name_buf, len));
    } else {
        host_set_user(sv(""));
    }
}

static void show_fatal(State& s, StringView message, StringView detail) {
    if (!s.fatal_visible) {
        js_host_show_fatal(message.ptr, message.len, detail.ptr, detail.len);
        s.fatal_visible = true;
    }

    s.startup_phase = StartupPhase::Fatal;
}

static void show_host_error(State& s) {
    auto len = js_host_write_error(s.host_error_buf, HOST_ERROR_CAPACITY);
    auto detail = len > 0 ? sv(s.host_error_buf, len) : sv("Unknown host error.");
    show_fatal(s, sv("The C++ startup bridge hit an error."), detail);
}

static bool check_host_error(State& s) {
    if (js_host_has_error() == 0) {
        return false;
    }

    show_host_error(s);
    return true;
}

// --- Startup state machine --------------------------------------------------

static void transition_startup(State& s, StartupPhase next) {
    s.startup_phase = next;
    s.startup_phase_elapsed = 0.0f;

    switch (next) {
        case StartupPhase::PrepareGame:
            host_set_status(sv("SDK pending"), STATUS_PENDING);
            host_set_user(sv(""));
            host_set_loading(
                sv("Preparing C++ game state"),
                sv("Handing Wavedash startup control to C++."),
                0.42f
            );
            break;
        case StartupPhase::InitSdk:
            host_set_status(sv("SDK starting"), STATUS_STARTING);
            host_set_loading(
                sv("Initializing Wavedash SDK"),
                sv("Calling imported Wavedash bindings from C++."),
                0.58f
            );
            js_wd_init(1, 1);
            break;
        case StartupPhase::WaitForSdk:
            host_set_loading(
                sv("Waiting for SDK readiness"),
                sv("Polling WavedashJS.isReady() before gameplay begins."),
                0.82f
            );
            break;
        case StartupPhase::FinalizeStartup:
            host_set_loading(
                sv("Finalizing game startup"),
                sv("Preparing the first playable Pong serve state."),
                0.96f
            );
            break;
        case StartupPhase::Ready:
            host_set_loading(
                sv("Loading complete"),
                sv("Releasing deferred SDK events and handing over to gameplay."),
                1.0f
            );
            js_wd_ready_for_events();
            js_wd_load_complete();
            js_host_hide_overlay();
            break;
        case StartupPhase::Fatal:
            break;
    }
}

static void update_startup(State& s, float dt) {
    if (s.startup_phase == StartupPhase::Ready || s.startup_phase == StartupPhase::Fatal) {
        return;
    }

    if (check_host_error(s)) {
        return;
    }

    s.startup_phase_elapsed += dt;

    switch (s.startup_phase) {
        case StartupPhase::PrepareGame:
            if (s.startup_phase_elapsed >= STARTUP_STEP_DELAY) {
                transition_startup(s, StartupPhase::InitSdk);
            }
            break;
        case StartupPhase::InitSdk:
            if (s.startup_phase_elapsed >= STARTUP_STEP_DELAY) {
                transition_startup(s, StartupPhase::WaitForSdk);
            }
            break;
        case StartupPhase::WaitForSdk:
            if (js_wd_is_ready() != 0) {
                host_set_status(sv("SDK ready"), STATUS_READY);
                sync_user_from_sdk(s);
                transition_startup(s, StartupPhase::FinalizeStartup);
            } else if (s.startup_phase_elapsed >= STARTUP_TIMEOUT) {
                show_fatal(
                    s,
                    sv("Wavedash SDK did not become ready."),
                    sv("WavedashJS.isReady() did not report ready before the startup timeout.")
                );
            }
            break;
        case StartupPhase::FinalizeStartup:
            if (s.startup_phase_elapsed >= STARTUP_STEP_DELAY) {
                transition_startup(s, StartupPhase::Ready);
            }
            break;
        case StartupPhase::Ready:
        case StartupPhase::Fatal:
            break;
    }
}

// --- Gameplay ---------------------------------------------------------------

static void reset_state(State& s, float width, float height) {
    s = State{};
    s.world_w = width > MIN_WORLD_W ? width : DEFAULT_WORLD_W;
    s.world_h = height > MIN_WORLD_H ? height : DEFAULT_WORLD_H;
}

static void clamp_entities_to_world(State& s) {
    s.player_y = clamp(s.player_y, 0.0f, s.world_h - paddle_h(s));
    s.ai_y     = clamp(s.ai_y,     0.0f, s.world_h - paddle_h(s));
    s.ball_x   = clamp(s.ball_x,   0.0f, s.world_w - ball_size(s));
    s.ball_y   = clamp(s.ball_y,   0.0f, s.world_h - ball_size(s));
}

static void center_paddles(State& s) {
    auto centered = (s.world_h - paddle_h(s)) * 0.5f;
    s.player_y = centered;
    s.ai_y = centered;
    s.ai_target_y = s.world_h * 0.5f;
}

static void reset_ball(State& s) {
    auto size = ball_size(s);
    s.ball_x = (s.world_w - size) * 0.5f;
    s.ball_y = (s.world_h - size) * 0.5f;
    s.ball_vx = 0.0f;
    s.ball_vy = 0.0f;
}

static void prepare_serve(State& s, float direction) {
    s.serve_direction = direction;
    s.mode = GameMode::Serve;
    s.ai_retarget_in = 0.0f;
    center_paddles(s);
    reset_ball(s);
}

static void restart_match(State& s) {
    s.player_score = 0;
    s.ai_score = 0;
    s.winner = 0;
    prepare_serve(s, random_unit(s) < 0.5f ? -1.0f : 1.0f);
}

static void start_serve(State& s) {
    auto sf = scale_factor(s);
    s.mode = GameMode::Play;
    s.ball_x = (s.world_w - ball_size(s)) * 0.5f;
    s.ball_y = (s.world_h - ball_size(s)) * 0.5f;
    s.ball_vx = s.serve_direction * (350.0f * sf);
    s.ball_vy = (random_unit(s) * 2.0f - 1.0f) * (160.0f * sf);

    if (abs_val(s.ball_vy) < 70.0f * sf) {
        s.ball_vy = s.ball_vy < 0.0f ? -(90.0f * sf) : (90.0f * sf);
    }
}

static void award_point(State& s, bool player_scored) {
    if (player_scored) {
        s.player_score += 1;
        if (s.player_score >= WIN_SCORE) {
            s.winner = 1;
            s.mode = GameMode::GameOver;
            reset_ball(s);
            return;
        }
        prepare_serve(s, 1.0f);
    } else {
        s.ai_score += 1;
        if (s.ai_score >= WIN_SCORE) {
            s.winner = 2;
            s.mode = GameMode::GameOver;
            reset_ball(s);
            return;
        }
        prepare_serve(s, -1.0f);
    }
}

static void update_player(State& s, float dt, bool move_up, bool move_down) {
    float direction = 0.0f;

    if (move_up)   direction -= 1.0f;
    if (move_down) direction += 1.0f;

    s.player_y = clamp(
        s.player_y + direction * player_speed(s) * dt,
        0.0f,
        s.world_h - paddle_h(s)
    );
}

static void update_ai(State& s, float dt) {
    auto size = ball_size(s);
    auto ph = paddle_h(s);

    if (s.mode == GameMode::Play && s.ball_vx > 0.0f) {
        s.ai_retarget_in -= dt;
        if (s.ai_retarget_in <= 0.0f) {
            auto ball_center_x = s.ball_x + size * 0.5f;
            auto ball_center_y = s.ball_y + size * 0.5f;
            auto distance_to_paddle = ai_x(s) - ball_center_x;
            auto lead_time = (s.ball_vx > 0.0f && distance_to_paddle > 0.0f)
                ? (distance_to_paddle / s.ball_vx)
                : 0.0f;

            auto projected = reflect_y(
                ball_center_y + s.ball_vy * lead_time,
                size * 0.5f,
                s.world_h - size * 0.5f
            );
            auto miss_window = ph * (0.18f + random_unit(s) * 0.32f);

            s.ai_retarget_in = 0.08f + random_unit(s) * 0.09f;
            s.ai_target_y = projected + (random_unit(s) * 2.0f - 1.0f) * miss_window;
        }
    } else {
        s.ai_retarget_in = 0.0f;
        s.ai_target_y = s.world_h * 0.5f;
    }

    {
        auto current_center = s.ai_y + ph * 0.5f;
        auto max_move = ai_speed(s) * dt;
        auto move = s.ai_target_y - current_center;

        if (move >  max_move) move =  max_move;
        if (move < -max_move) move = -max_move;

        s.ai_y = clamp(s.ai_y + move, 0.0f, s.world_h - ph);
    }
}

static void bounce_from_paddle(State& s, bool left_side, float paddle_top, float paddle_left) {
    auto sf = scale_factor(s);
    auto size = ball_size(s);
    auto ph = paddle_h(s);

    auto impact = clamp(
        ((s.ball_y + size * 0.5f) - (paddle_top + ph * 0.5f)) / (ph * 0.5f),
        -1.0f,
        1.0f
    );

    auto next_speed_x = min_val(abs_val(s.ball_vx) * 1.05f + 22.0f * sf, 820.0f * sf);
    auto next_speed_y = clamp(s.ball_vy + impact * (250.0f * sf), -560.0f * sf, 560.0f * sf);

    if (abs_val(next_speed_y) < 80.0f * sf) {
        next_speed_y = impact < 0.0f ? -(100.0f * sf) : (100.0f * sf);
    }

    next_speed_y += (random_unit(s) * 2.0f - 1.0f) * (22.0f * sf);

    if (left_side) {
        s.ball_x = paddle_left + paddle_w(s);
        s.ball_vx = next_speed_x;
    } else {
        s.ball_x = paddle_left - size;
        s.ball_vx = -next_speed_x;
    }

    s.ball_vy = next_speed_y;
}

static void update_ball(State& s, float dt) {
    if (s.mode != GameMode::Play) {
        return;
    }

    auto size = ball_size(s);
    auto pw = paddle_w(s);
    auto ph = paddle_h(s);
    auto px = player_x(s);
    auto ax = ai_x(s);

    s.ball_x += s.ball_vx * dt;
    s.ball_y += s.ball_vy * dt;

    if (s.ball_y <= 0.0f) {
        s.ball_y = 0.0f;
        s.ball_vy = abs_val(s.ball_vy);
    } else if (s.ball_y + size >= s.world_h) {
        s.ball_y = s.world_h - size;
        s.ball_vy = -abs_val(s.ball_vy);
    }

    if (s.ball_vx < 0.0f && s.ball_x <= px + pw && s.ball_x + size >= px &&
        s.ball_y + size >= s.player_y && s.ball_y <= s.player_y + ph) {
        bounce_from_paddle(s, true, s.player_y, px);
    } else if (s.ball_vx > 0.0f && s.ball_x + size >= ax && s.ball_x <= ax + pw &&
               s.ball_y + size >= s.ai_y && s.ball_y <= s.ai_y + ph) {
        bounce_from_paddle(s, false, s.ai_y, ax);
    }

    if (s.ball_x + size < 0.0f) {
        award_point(s, false);
    } else if (s.ball_x > s.world_w) {
        award_point(s, true);
    }
}

// --- HUD text ---------------------------------------------------------------

static StringView score_text(int32_t score) {
    constexpr StringView digits[] = {
        sv("0"), sv("1"), sv("2"), sv("3"), sv("4"),
        sv("5"), sv("6"), sv("7"), sv("8"), sv("9"),
    };
    auto idx = score < 0 ? 0 : (score > 9 ? 9 : score);
    return digits[idx];
}

static StringView current_banner(const State& s) {
    switch (s.mode) {
        case GameMode::Serve:
            return sv("PRESS SPACE TO SERVE");
        case GameMode::Play:
            return sv("FIRST TO 7");
        case GameMode::GameOver:
            return s.winner == 1
                ? sv("YOU WIN - PRESS SPACE TO PLAY AGAIN")
                : sv("CPU WINS - PRESS SPACE TO TRY AGAIN");
    }

    return sv("FIRST TO 7");
}

static StringView current_subtitle(const State& s) {
    switch (s.mode) {
        case GameMode::Serve:
            return sv("W/S or arrow keys move the paddle");
        case GameMode::Play:
            return sv("Hard AI, but it can be beaten with angled returns");
        case GameMode::GameOver:
            return sv("Mix in quick direction changes to beat the CPU");
    }

    return sv("W/S or arrow keys move the paddle");
}

// --- Rendering --------------------------------------------------------------

static void render(const State& s) {
    auto sf = scale_factor(s);
    auto size = ball_size(s);
    auto pw = paddle_w(s);
    auto ph = paddle_h(s);

    clear_screen(BACKGROUND_COLOR);

    auto dash_y = 28.0f * sf;
    while (dash_y < s.world_h - 28.0f * sf) {
        fill_rect(s.world_w * 0.5f - 3.0f * sf, dash_y, 6.0f * sf, 18.0f * sf, CENTER_DASH_COLOR);
        dash_y += 32.0f * sf;
    }

    fill_rect(0.0f, 0.0f, s.world_w, 6.0f * sf, ARENA_EDGE_COLOR);
    fill_rect(0.0f, s.world_h - 6.0f * sf, s.world_w, 6.0f * sf, ARENA_EDGE_COLOR);

    fill_rect(player_x(s), s.player_y, pw, ph, PLAYER_COLOR);
    fill_rect(ai_x(s), s.ai_y, pw, ph, CPU_COLOR);
    fill_rect(s.ball_x, s.ball_y, size, size, BALL_COLOR);

    draw_text(sv("PLAYER"), s.world_w * 0.20f, 46.0f * sf, 18.0f * sf, LABEL_COLOR);
    draw_text(sv("CPU"),    s.world_w * 0.73f, 46.0f * sf, 18.0f * sf, LABEL_COLOR);
    draw_text(score_text(s.player_score), s.world_w * 0.41f, 78.0f * sf, 54.0f * sf, SCORE_PLAYER_COLOR);
    draw_text(score_text(s.ai_score),     s.world_w * 0.55f, 78.0f * sf, 54.0f * sf, SCORE_CPU_COLOR);

    fill_rect(s.world_w * 0.19f, s.world_h * 0.74f, s.world_w * 0.62f, 76.0f * sf, BANNER_PANEL_COLOR);
    draw_text(current_banner(s),   s.world_w * 0.24f, s.world_h * 0.80f, 22.0f * sf, BANNER_TEXT_COLOR);
    draw_text(current_subtitle(s), s.world_w * 0.24f, s.world_h * 0.86f, 14.0f * sf, LABEL_COLOR);
}

// --- Wasm exports -----------------------------------------------------------

extern "C" {

WASM_EXPORT(wd_init)
void wd_init(float width, float height) {
    auto& s = g_state;

    reset_state(s, width, height);
    restart_match(s);
    transition_startup(s, StartupPhase::PrepareGame);
    render(s);
}

WASM_EXPORT(wd_resize)
void wd_resize(float width, float height) {
    auto& s = g_state;

    s.world_w = width  > MIN_WORLD_W ? width  : s.world_w;
    s.world_h = height > MIN_WORLD_H ? height : s.world_h;
    clamp_entities_to_world(s);

    render(s);
}

WASM_EXPORT(wd_tick)
void wd_tick(float dt_seconds, uint8_t move_up, uint8_t move_down, uint8_t action_pressed) {
    auto& s = g_state;
    auto dt = clamp(dt_seconds, 0.0f, 0.033f);

    if (check_host_error(s)) {
        return;
    }

    if (s.startup_phase == StartupPhase::Fatal) {
        return;
    }

    if (s.startup_phase != StartupPhase::Ready) {
        update_startup(s, dt);
        render(s);
        return;
    }

    if (action_pressed != 0) {
        if (s.mode == GameMode::Serve) {
            start_serve(s);
        } else if (s.mode == GameMode::GameOver) {
            restart_match(s);
        }
    }

    update_player(s, dt, move_up != 0, move_down != 0);
    update_ai(s, dt);
    update_ball(s, dt);
    render(s);
}

} // extern "C"
