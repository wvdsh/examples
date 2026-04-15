#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define DEFAULT_WORLD_W 960.0f
#define DEFAULT_WORLD_H 540.0f
#define MIN_WORLD_W 320.0f
#define MIN_WORLD_H 240.0f
#define WIN_SCORE 7
#define STARTUP_STEP_DELAY 0.08f
#define STARTUP_TIMEOUT 6.0f
#define INITIAL_RNG_STATE 0x13572468u
#define USER_NAME_CAPACITY 64
#define HOST_ERROR_CAPACITY 192

#define TEXT_LIT(value) ((Text){(value), (size_t)(sizeof(value) - 1u)})
#define TEXT_BUF(ptr_value, len_value) ((Text){(ptr_value), (len_value)})
#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(#name)))
#define WASM_EXPORT(name) __attribute__((export_name(#name)))

// C owns the startup state machine and gameplay. The JS host only provides
// browser bindings, canvas drawing primitives, input, and WavedashJS access.

typedef struct {
    const char *ptr;
    size_t len;
} Text;

typedef struct {
    uint8_t r;
    uint8_t g;
    uint8_t b;
    uint8_t a;
} Color;

typedef enum {
    GAME_MODE_SERVE,
    GAME_MODE_PLAY,
    GAME_MODE_GAME_OVER,
} GameMode;

typedef enum {
    STARTUP_PREPARE_GAME,
    STARTUP_INIT_SDK,
    STARTUP_WAIT_FOR_SDK,
    STARTUP_FINALIZE_STARTUP,
    STARTUP_READY,
    STARTUP_FATAL,
} StartupPhase;

typedef struct {
    float world_w;
    float world_h;
    float player_y;
    float ai_y;
    float ai_target_y;
    float ai_retarget_in;
    float ball_x;
    float ball_y;
    float ball_vx;
    float ball_vy;
    float serve_direction;
    int32_t player_score;
    int32_t ai_score;
    int32_t winner;
    GameMode mode;
    StartupPhase startup_phase;
    float startup_phase_elapsed;
    bool fatal_visible;
    uint32_t rng_state;
    char user_name_buf[USER_NAME_CAPACITY];
    char host_error_buf[HOST_ERROR_CAPACITY];
} State;

extern void js_clear(uint8_t r, uint8_t g, uint8_t b, uint8_t a) WASM_IMPORT(js_clear);
extern void js_fill_rect(float x, float y, float width, float height, uint8_t r, uint8_t g, uint8_t b, uint8_t a)
    WASM_IMPORT(js_fill_rect);
extern void js_draw_text(
    const char *ptr,
    size_t len,
    float x,
    float y,
    float size,
    uint8_t r,
    uint8_t g,
    uint8_t b,
    uint8_t a
) WASM_IMPORT(js_draw_text);

extern void js_host_set_loading(
    const char *step_ptr,
    size_t step_len,
    const char *detail_ptr,
    size_t detail_len,
    float progress
) WASM_IMPORT(js_host_set_loading);
extern void js_host_set_status(const char *ptr, size_t len, uint8_t r, uint8_t g, uint8_t b, uint8_t a)
    WASM_IMPORT(js_host_set_status);
extern void js_host_set_user(const char *ptr, size_t len) WASM_IMPORT(js_host_set_user);
extern void js_host_hide_overlay(void) WASM_IMPORT(js_host_hide_overlay);
extern void js_host_show_fatal(
    const char *message_ptr,
    size_t message_len,
    const char *detail_ptr,
    size_t detail_len
) WASM_IMPORT(js_host_show_fatal);
extern uint8_t js_host_has_error(void) WASM_IMPORT(js_host_has_error);
extern size_t js_host_write_error(char *ptr, size_t max_len) WASM_IMPORT(js_host_write_error);

extern void js_wd_init(uint8_t debug, uint8_t defer_events) WASM_IMPORT(js_wd_init);
extern uint8_t js_wd_is_ready(void) WASM_IMPORT(js_wd_is_ready);
extern void js_wd_update_load_progress(float progress) WASM_IMPORT(js_wd_update_load_progress);
extern void js_wd_ready_for_events(void) WASM_IMPORT(js_wd_ready_for_events);
extern void js_wd_load_complete(void) WASM_IMPORT(js_wd_load_complete);
extern size_t js_wd_write_user_name(char *ptr, size_t max_len) WASM_IMPORT(js_wd_write_user_name);

static const Color STATUS_PENDING = {148u, 163u, 184u, 255u};
static const Color STATUS_STARTING = {250u, 204u, 21u, 255u};
static const Color STATUS_READY = {34u, 197u, 94u, 255u};
static const Color BACKGROUND_COLOR = {3u, 7u, 18u, 255u};
static const Color ARENA_EDGE_COLOR = {8u, 15u, 36u, 255u};
static const Color CENTER_DASH_COLOR = {119u, 138u, 160u, 110u};
static const Color PLAYER_COLOR = {92u, 227u, 255u, 255u};
static const Color CPU_COLOR = {255u, 181u, 71u, 255u};
static const Color BALL_COLOR = {248u, 250u, 252u, 255u};
static const Color LABEL_COLOR = {148u, 163u, 184u, 255u};
static const Color SCORE_PLAYER_COLOR = {230u, 244u, 255u, 255u};
static const Color SCORE_CPU_COLOR = {255u, 237u, 213u, 255u};
static const Color BANNER_PANEL_COLOR = {8u, 15u, 30u, 170u};
static const Color BANNER_TEXT_COLOR = {226u, 232u, 240u, 255u};

static State g_state = {
    .world_w = DEFAULT_WORLD_W,
    .world_h = DEFAULT_WORLD_H,
    .serve_direction = 1.0f,
    .mode = GAME_MODE_SERVE,
    .startup_phase = STARTUP_PREPARE_GAME,
    .rng_state = INITIAL_RNG_STATE,
};

static float absf(float value) {
    return value < 0.0f ? -value : value;
}

static float clampf(float value, float low, float high) {
    if (value < low) {
        return low;
    }
    if (value > high) {
        return high;
    }
    return value;
}

static float minf(float a, float b) {
    return a < b ? a : b;
}

static void clear_screen(Color color) {
    js_clear(color.r, color.g, color.b, color.a);
}

static void fill_rect(float x, float y, float width, float height, Color color) {
    js_fill_rect(x, y, width, height, color.r, color.g, color.b, color.a);
}

// --- Layout helpers ---------------------------------------------------------

static float scale_factor(const State *state) {
    const float sx = state->world_w / DEFAULT_WORLD_W;
    const float sy = state->world_h / DEFAULT_WORLD_H;
    return sx < sy ? sx : sy;
}

static float paddle_w(const State *state) {
    return 18.0f * scale_factor(state);
}

static float paddle_h(const State *state) {
    return 108.0f * scale_factor(state);
}

static float ball_size(const State *state) {
    return 16.0f * scale_factor(state);
}

static float player_speed(const State *state) {
    return 520.0f * scale_factor(state);
}

static float ai_speed(const State *state) {
    return 430.0f * scale_factor(state);
}

static float player_x(const State *state) {
    return 40.0f * scale_factor(state);
}

static float ai_x(const State *state) {
    return state->world_w - paddle_w(state) - (40.0f * scale_factor(state));
}

static float random_unit(State *state) {
    const uint32_t raw_mask = 0x00ffffffu;
    state->rng_state = state->rng_state * 1664525u + 1013904223u;
    return (float)((state->rng_state >> 8u) & raw_mask) / 16777215.0f;
}

static float reflect_y(float value, float min_y, float max_y) {
    float reflected = value;
    uint8_t guard = 0u;

    while ((reflected < min_y || reflected > max_y) && guard < 8u) {
        if (reflected < min_y) {
            reflected = min_y + (min_y - reflected);
        } else {
            reflected = max_y - (reflected - max_y);
        }
        guard += 1u;
    }

    return clampf(reflected, min_y, max_y);
}

// --- Host bridge helpers ----------------------------------------------------

static void draw_text(Text text, float x, float y, float size, Color color) {
    js_draw_text(text.ptr, text.len, x, y, size, color.r, color.g, color.b, color.a);
}

static void host_set_loading(Text step, Text detail, float progress) {
    js_host_set_loading(step.ptr, step.len, detail.ptr, detail.len, progress);
    js_wd_update_load_progress(progress);
}

static void host_set_status(Text text, Color color) {
    js_host_set_status(text.ptr, text.len, color.r, color.g, color.b, color.a);
}

static void host_set_user(Text name) {
    js_host_set_user(name.ptr, name.len);
}

static void sync_user_from_sdk(State *state) {
    const size_t len = js_wd_write_user_name(state->user_name_buf, USER_NAME_CAPACITY);

    if (len > 0u) {
        host_set_user(TEXT_BUF(state->user_name_buf, len));
    } else {
        host_set_user(TEXT_LIT(""));
    }
}

static void show_fatal(State *state, Text message, Text detail) {
    if (!state->fatal_visible) {
        js_host_show_fatal(message.ptr, message.len, detail.ptr, detail.len);
        state->fatal_visible = true;
    }

    state->startup_phase = STARTUP_FATAL;
}

static void show_host_error(State *state) {
    const size_t len = js_host_write_error(state->host_error_buf, HOST_ERROR_CAPACITY);
    const Text detail = len > 0u ? TEXT_BUF(state->host_error_buf, len) : TEXT_LIT("Unknown host error.");
    show_fatal(state, TEXT_LIT("The C startup bridge hit an error."), detail);
}

static bool check_host_error(State *state) {
    if (js_host_has_error() == 0u) {
        return false;
    }

    show_host_error(state);
    return true;
}

static void transition_startup(State *state, StartupPhase next) {
    state->startup_phase = next;
    state->startup_phase_elapsed = 0.0f;

    switch (next) {
        case STARTUP_PREPARE_GAME:
            host_set_status(TEXT_LIT("SDK pending"), STATUS_PENDING);
            host_set_user(TEXT_LIT(""));
            host_set_loading(
                TEXT_LIT("Preparing C game state"),
                TEXT_LIT("Handing Wavedash startup control to C."),
                0.42f
            );
            break;
        case STARTUP_INIT_SDK:
            host_set_status(TEXT_LIT("SDK starting"), STATUS_STARTING);
            host_set_loading(
                TEXT_LIT("Initializing Wavedash SDK"),
                TEXT_LIT("Calling imported Wavedash bindings from C."),
                0.58f
            );
            js_wd_init(1u, 1u);
            break;
        case STARTUP_WAIT_FOR_SDK:
            host_set_loading(
                TEXT_LIT("Waiting for SDK readiness"),
                TEXT_LIT("Polling WavedashJS.isReady() before gameplay begins."),
                0.82f
            );
            break;
        case STARTUP_FINALIZE_STARTUP:
            host_set_loading(
                TEXT_LIT("Finalizing game startup"),
                TEXT_LIT("Preparing the first playable Pong serve state."),
                0.96f
            );
            break;
        case STARTUP_READY:
            host_set_loading(
                TEXT_LIT("Loading complete"),
                TEXT_LIT("Releasing deferred SDK events and handing over to gameplay."),
                1.0f
            );
            js_wd_ready_for_events();
            js_wd_load_complete();
            js_host_hide_overlay();
            break;
        case STARTUP_FATAL:
            break;
    }
}

static void update_startup(State *state, float dt) {
    if (state->startup_phase == STARTUP_READY || state->startup_phase == STARTUP_FATAL) {
        return;
    }

    if (check_host_error(state)) {
        return;
    }

    state->startup_phase_elapsed += dt;

    switch (state->startup_phase) {
        case STARTUP_PREPARE_GAME:
            if (state->startup_phase_elapsed >= STARTUP_STEP_DELAY) {
                transition_startup(state, STARTUP_INIT_SDK);
            }
            break;
        case STARTUP_INIT_SDK:
            if (state->startup_phase_elapsed >= STARTUP_STEP_DELAY) {
                transition_startup(state, STARTUP_WAIT_FOR_SDK);
            }
            break;
        case STARTUP_WAIT_FOR_SDK:
            if (js_wd_is_ready() != 0u) {
                host_set_status(TEXT_LIT("SDK ready"), STATUS_READY);
                sync_user_from_sdk(state);
                transition_startup(state, STARTUP_FINALIZE_STARTUP);
            } else if (state->startup_phase_elapsed >= STARTUP_TIMEOUT) {
                show_fatal(
                    state,
                    TEXT_LIT("Wavedash SDK did not become ready."),
                    TEXT_LIT("WavedashJS.isReady() did not report ready before the startup timeout.")
                );
            }
            break;
        case STARTUP_FINALIZE_STARTUP:
            if (state->startup_phase_elapsed >= STARTUP_STEP_DELAY) {
                transition_startup(state, STARTUP_READY);
            }
            break;
        case STARTUP_READY:
        case STARTUP_FATAL:
            break;
    }
}

// --- Gameplay ---------------------------------------------------------------

static void reset_state(State *state, float width, float height) {
    *state = (State){
        .world_w = width > MIN_WORLD_W ? width : DEFAULT_WORLD_W,
        .world_h = height > MIN_WORLD_H ? height : DEFAULT_WORLD_H,
        .serve_direction = 1.0f,
        .mode = GAME_MODE_SERVE,
        .startup_phase = STARTUP_PREPARE_GAME,
        .rng_state = INITIAL_RNG_STATE,
    };
}

static void clamp_entities_to_world(State *state) {
    state->player_y = clampf(state->player_y, 0.0f, state->world_h - paddle_h(state));
    state->ai_y = clampf(state->ai_y, 0.0f, state->world_h - paddle_h(state));
    state->ball_x = clampf(state->ball_x, 0.0f, state->world_w - ball_size(state));
    state->ball_y = clampf(state->ball_y, 0.0f, state->world_h - ball_size(state));
}

static void center_paddles(State *state) {
    const float centered = (state->world_h - paddle_h(state)) * 0.5f;
    state->player_y = centered;
    state->ai_y = centered;
    state->ai_target_y = state->world_h * 0.5f;
}

static void reset_ball(State *state) {
    const float size = ball_size(state);
    state->ball_x = (state->world_w - size) * 0.5f;
    state->ball_y = (state->world_h - size) * 0.5f;
    state->ball_vx = 0.0f;
    state->ball_vy = 0.0f;
}

static void prepare_serve(State *state, float direction) {
    state->serve_direction = direction;
    state->mode = GAME_MODE_SERVE;
    state->ai_retarget_in = 0.0f;
    center_paddles(state);
    reset_ball(state);
}

static void restart_match(State *state) {
    state->player_score = 0;
    state->ai_score = 0;
    state->winner = 0;
    prepare_serve(state, random_unit(state) < 0.5f ? -1.0f : 1.0f);
}

static void start_serve(State *state) {
    const float sf = scale_factor(state);
    state->mode = GAME_MODE_PLAY;
    state->ball_x = (state->world_w - ball_size(state)) * 0.5f;
    state->ball_y = (state->world_h - ball_size(state)) * 0.5f;
    state->ball_vx = state->serve_direction * (350.0f * sf);
    state->ball_vy = (random_unit(state) * 2.0f - 1.0f) * (160.0f * sf);

    if (absf(state->ball_vy) < 70.0f * sf) {
        state->ball_vy = state->ball_vy < 0.0f ? -(90.0f * sf) : (90.0f * sf);
    }
}

static void award_point(State *state, bool player_scored) {
    if (player_scored) {
        state->player_score += 1;
        if (state->player_score >= WIN_SCORE) {
            state->winner = 1;
            state->mode = GAME_MODE_GAME_OVER;
            reset_ball(state);
            return;
        }
        prepare_serve(state, 1.0f);
    } else {
        state->ai_score += 1;
        if (state->ai_score >= WIN_SCORE) {
            state->winner = 2;
            state->mode = GAME_MODE_GAME_OVER;
            reset_ball(state);
            return;
        }
        prepare_serve(state, -1.0f);
    }
}

static void update_player(State *state, float dt, bool move_up, bool move_down) {
    float direction = 0.0f;

    if (move_up) {
        direction -= 1.0f;
    }
    if (move_down) {
        direction += 1.0f;
    }

    state->player_y = clampf(state->player_y + direction * player_speed(state) * dt, 0.0f, state->world_h - paddle_h(state));
}

static void update_ai(State *state, float dt) {
    const float size = ball_size(state);
    const float ph = paddle_h(state);

    if (state->mode == GAME_MODE_PLAY && state->ball_vx > 0.0f) {
        state->ai_retarget_in -= dt;
        if (state->ai_retarget_in <= 0.0f) {
            const float ball_center_x = state->ball_x + size * 0.5f;
            const float ball_center_y = state->ball_y + size * 0.5f;
            const float distance_to_paddle = ai_x(state) - ball_center_x;
            const float lead_time =
                (state->ball_vx > 0.0f && distance_to_paddle > 0.0f) ? (distance_to_paddle / state->ball_vx) : 0.0f;
            // Aim for the projected intercept, but inject some error so the AI
            // is strong without becoming frame-perfect.
            const float projected = reflect_y(
                ball_center_y + state->ball_vy * lead_time,
                size * 0.5f,
                state->world_h - size * 0.5f
            );
            const float miss_window = ph * (0.18f + random_unit(state) * 0.32f);

            state->ai_retarget_in = 0.08f + random_unit(state) * 0.09f;
            state->ai_target_y = projected + (random_unit(state) * 2.0f - 1.0f) * miss_window;
        }
    } else {
        state->ai_retarget_in = 0.0f;
        state->ai_target_y = state->world_h * 0.5f;
    }

    {
        const float current_center = state->ai_y + ph * 0.5f;
        const float max_move = ai_speed(state) * dt;
        float move = state->ai_target_y - current_center;

        if (move > max_move) {
            move = max_move;
        }
        if (move < -max_move) {
            move = -max_move;
        }

        state->ai_y = clampf(state->ai_y + move, 0.0f, state->world_h - ph);
    }
}

static void bounce_from_paddle(State *state, bool left_side, float paddle_top, float paddle_left) {
    const float sf = scale_factor(state);
    const float size = ball_size(state);
    const float ph = paddle_h(state);
    const float impact = clampf(
        ((state->ball_y + size * 0.5f) - (paddle_top + ph * 0.5f)) / (ph * 0.5f),
        -1.0f,
        1.0f
    );
    const float next_speed_x = minf(absf(state->ball_vx) * 1.05f + 22.0f * sf, 820.0f * sf);
    float next_speed_y = clampf(state->ball_vy + impact * (250.0f * sf), -560.0f * sf, 560.0f * sf);

    if (absf(next_speed_y) < 80.0f * sf) {
        next_speed_y = impact < 0.0f ? -(100.0f * sf) : (100.0f * sf);
    }

    next_speed_y += (random_unit(state) * 2.0f - 1.0f) * (22.0f * sf);

    if (left_side) {
        state->ball_x = paddle_left + paddle_w(state);
        state->ball_vx = next_speed_x;
    } else {
        state->ball_x = paddle_left - size;
        state->ball_vx = -next_speed_x;
    }

    state->ball_vy = next_speed_y;
}

static void update_ball(State *state, float dt) {
    if (state->mode != GAME_MODE_PLAY) {
        return;
    }

    const float size = ball_size(state);
    const float pw = paddle_w(state);
    const float ph = paddle_h(state);
    const float px = player_x(state);
    const float ax = ai_x(state);

    state->ball_x += state->ball_vx * dt;
    state->ball_y += state->ball_vy * dt;

    if (state->ball_y <= 0.0f) {
        state->ball_y = 0.0f;
        state->ball_vy = absf(state->ball_vy);
    } else if (state->ball_y + size >= state->world_h) {
        state->ball_y = state->world_h - size;
        state->ball_vy = -absf(state->ball_vy);
    }

    if (state->ball_vx < 0.0f && state->ball_x <= px + pw && state->ball_x + size >= px &&
        state->ball_y + size >= state->player_y && state->ball_y <= state->player_y + ph) {
        bounce_from_paddle(state, true, state->player_y, px);
    } else if (state->ball_vx > 0.0f && state->ball_x + size >= ax && state->ball_x <= ax + pw &&
               state->ball_y + size >= state->ai_y && state->ball_y <= state->ai_y + ph) {
        bounce_from_paddle(state, false, state->ai_y, ax);
    }

    if (state->ball_x + size < 0.0f) {
        award_point(state, false);
    } else if (state->ball_x > state->world_w) {
        award_point(state, true);
    }
}

static Text score_text(int32_t score) {
    switch (score) {
        case 0:
            return TEXT_LIT("0");
        case 1:
            return TEXT_LIT("1");
        case 2:
            return TEXT_LIT("2");
        case 3:
            return TEXT_LIT("3");
        case 4:
            return TEXT_LIT("4");
        case 5:
            return TEXT_LIT("5");
        case 6:
            return TEXT_LIT("6");
        case 7:
            return TEXT_LIT("7");
        case 8:
            return TEXT_LIT("8");
        default:
            return TEXT_LIT("9");
    }
}

static Text current_banner(const State *state) {
    switch (state->mode) {
        case GAME_MODE_SERVE:
            return TEXT_LIT("PRESS SPACE TO SERVE");
        case GAME_MODE_PLAY:
            return TEXT_LIT("FIRST TO 7");
        case GAME_MODE_GAME_OVER:
            return state->winner == 1 ? TEXT_LIT("YOU WIN - PRESS SPACE TO PLAY AGAIN")
                                      : TEXT_LIT("CPU WINS - PRESS SPACE TO TRY AGAIN");
    }

    return TEXT_LIT("FIRST TO 7");
}

static Text current_subtitle(const State *state) {
    switch (state->mode) {
        case GAME_MODE_SERVE:
            return TEXT_LIT("W/S or arrow keys move the paddle");
        case GAME_MODE_PLAY:
            return TEXT_LIT("Hard AI, but it can be beaten with angled returns");
        case GAME_MODE_GAME_OVER:
            return TEXT_LIT("Mix in quick direction changes to beat the CPU");
    }

    return TEXT_LIT("W/S or arrow keys move the paddle");
}

// --- Rendering --------------------------------------------------------------

static void render(const State *state) {
    const float sf = scale_factor(state);
    const float size = ball_size(state);
    const float pw = paddle_w(state);
    const float ph = paddle_h(state);
    float dash_y = 28.0f * sf;

    clear_screen(BACKGROUND_COLOR);

    while (dash_y < state->world_h - 28.0f * sf) {
        fill_rect(state->world_w * 0.5f - 3.0f * sf, dash_y, 6.0f * sf, 18.0f * sf, CENTER_DASH_COLOR);
        dash_y += 32.0f * sf;
    }

    fill_rect(0.0f, 0.0f, state->world_w, 6.0f * sf, ARENA_EDGE_COLOR);
    fill_rect(0.0f, state->world_h - 6.0f * sf, state->world_w, 6.0f * sf, ARENA_EDGE_COLOR);

    fill_rect(player_x(state), state->player_y, pw, ph, PLAYER_COLOR);
    fill_rect(ai_x(state), state->ai_y, pw, ph, CPU_COLOR);
    fill_rect(state->ball_x, state->ball_y, size, size, BALL_COLOR);

    draw_text(TEXT_LIT("PLAYER"), state->world_w * 0.20f, 46.0f * sf, 18.0f * sf, LABEL_COLOR);
    draw_text(TEXT_LIT("CPU"), state->world_w * 0.73f, 46.0f * sf, 18.0f * sf, LABEL_COLOR);
    draw_text(score_text(state->player_score), state->world_w * 0.41f, 78.0f * sf, 54.0f * sf, SCORE_PLAYER_COLOR);
    draw_text(score_text(state->ai_score), state->world_w * 0.55f, 78.0f * sf, 54.0f * sf, SCORE_CPU_COLOR);

    fill_rect(state->world_w * 0.19f, state->world_h * 0.74f, state->world_w * 0.62f, 76.0f * sf, BANNER_PANEL_COLOR);

    draw_text(current_banner(state), state->world_w * 0.24f, state->world_h * 0.80f, 22.0f * sf, BANNER_TEXT_COLOR);
    draw_text(current_subtitle(state), state->world_w * 0.24f, state->world_h * 0.86f, 14.0f * sf, LABEL_COLOR);
}

// --- Wasm exports -----------------------------------------------------------

WASM_EXPORT(wd_init) void wd_init(float width, float height) {
    State *state = &g_state;

    reset_state(state, width, height);
    restart_match(state);
    transition_startup(state, STARTUP_PREPARE_GAME);
    render(state);
}

WASM_EXPORT(wd_resize) void wd_resize(float width, float height) {
    State *state = &g_state;

    state->world_w = width > MIN_WORLD_W ? width : state->world_w;
    state->world_h = height > MIN_WORLD_H ? height : state->world_h;
    clamp_entities_to_world(state);

    render(state);
}

WASM_EXPORT(wd_tick) void wd_tick(float dt_seconds, uint8_t move_up, uint8_t move_down, uint8_t action_pressed) {
    State *state = &g_state;
    const float dt = clampf(dt_seconds, 0.0f, 0.033f);

    if (check_host_error(state)) {
        return;
    }

    if (state->startup_phase == STARTUP_FATAL) {
        return;
    }

    if (state->startup_phase != STARTUP_READY) {
        update_startup(state, dt);
        render(state);
        return;
    }

    if (action_pressed != 0u) {
        if (state->mode == GAME_MODE_SERVE) {
            start_serve(state);
        } else if (state->mode == GAME_MODE_GAME_OVER) {
            restart_match(state);
        }
    }

    update_player(state, dt, move_up != 0u, move_down != 0u);
    update_ai(state, dt);
    update_ball(state, dt);
    render(state);
}
