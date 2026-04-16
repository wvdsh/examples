#include <emscripten.h>
#include <algorithm>
#include <cmath>
#include <cstdint>

// --- EM_JS bindings: Wavedash SDK -------------------------------------------

EM_JS(void, wavedash_init, (), {
    WavedashJS.init({ debug: true });
});

EM_JS(void, wavedash_progress, (double p), {
    WavedashJS.updateLoadProgressZeroToOne(p);
});

// --- EM_JS bindings: canvas drawing -----------------------------------------

EM_JS(void, canvas_clear, (int w, int h), {
    const ctx = window.__ctx;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
});

EM_JS(void, draw_rect, (double x, double y, double w, double h,
                         int r, int g, int b), {
    const ctx = window.__ctx;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, w, h);
});

EM_JS(void, draw_rect_alpha, (double x, double y, double w, double h,
                               int r, int g, int b, double a), {
    const ctx = window.__ctx;
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(x, y, w, h);
});

EM_JS(void, draw_text, (const char* text, double x, double y,
                         double size, int r, int g, int b), {
    const ctx = window.__ctx;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(UTF8ToString(text), x, y);
});

// --- EM_JS bindings: input --------------------------------------------------

EM_JS(int, is_key_down, (const char* code), {
    return window.__keys && window.__keys[UTF8ToString(code)] ? 1 : 0;
});

EM_JS(int, consume_action, (), {
    if (window.__actionPressed) {
        window.__actionPressed = false;
        return 1;
    }
    return 0;
});

// --- EM_JS bindings: score display ------------------------------------------

EM_JS(void, set_score, (int player, int ai), {
    const pe = document.getElementById("playerScore");
    const ae = document.getElementById("aiScore");
    if (pe) pe.textContent = player;
    if (ae) ae.textContent = ai;
});

// --- EM_JS bindings: viewport -----------------------------------------------

EM_JS(int, get_canvas_width, (), { return window.innerWidth; });
EM_JS(int, get_canvas_height, (), { return window.innerHeight; });

EM_JS(void, resize_canvas, (), {
    const c = document.getElementById("renderCanvas");
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = window.innerWidth * dpr;
    c.height = window.innerHeight * dpr;
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
    window.__ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
});

// --- Game constants ---------------------------------------------------------

constexpr double FIELD_W   = 16.0;
constexpr double FIELD_H   = 9.0;
constexpr double PADDLE_W  = 0.35;
constexpr double PADDLE_H  = 2.0;
constexpr double BALL_SIZE = 0.35;
constexpr double PLAYER_SPEED = 9.0;
constexpr double AI_SPEED  = 5.5;
constexpr double BALL_SPEED_X = 6.5;
constexpr double BALL_SPEED_Y = 2.8;
constexpr double MAX_VX    = 12.0;
constexpr double MAX_VY    = 8.0;
constexpr int    WIN_SCORE = 7;

// --- Game state (struct + C++ idioms) ---------------------------------------

enum class Mode { Serve, Play, GameOver };

struct GameState {
    double player_y = 0.0;
    double ai_y     = 0.0;
    double ball_x   = 0.0;
    double ball_y   = 0.0;
    double ball_vx  = 0.0;
    double ball_vy  = 0.0;
    int    player_score = 0;
    int    ai_score     = 0;
    int    serve_dir    = 1;
    Mode   mode = Mode::Serve;

    void reset_ball() {
        ball_x = 0.0;
        ball_y = 0.0;
        ball_vx = serve_dir * BALL_SPEED_X;
        double vy = (static_cast<double>(rand()) / RAND_MAX - 0.5) * BALL_SPEED_Y * 2.0;
        ball_vy = std::abs(vy) < 1.2 ? (vy < 0 ? -1.5 : 1.5) : vy;
        mode = Mode::Play;
    }

    void score_point(bool player_scored) {
        if (player_scored) {
            player_score++;
            serve_dir = 1;
        } else {
            ai_score++;
            serve_dir = -1;
        }
        set_score(player_score, ai_score);

        player_y = 0.0;
        ai_y = 0.0;
        reset_ball();
    }

    void restart() {
        player_score = 0;
        ai_score = 0;
        player_y = 0.0;
        ai_y = 0.0;
        ball_x = 0.0;
        ball_y = 0.0;
        ball_vx = 0.0;
        ball_vy = 0.0;
        serve_dir = 1;
        set_score(0, 0);
        reset_ball();
    }
};

static GameState g_state;
static double g_last_time = 0.0;

// --- Coordinate helpers -----------------------------------------------------

static double ppu() {
    double w = get_canvas_width();
    double h = get_canvas_height();
    return std::min(w / (FIELD_W + 1.4), h / (FIELD_H + 1.4));
}

static double to_x(double gx) { return get_canvas_width() / 2.0 + gx * ppu(); }
static double to_y(double gy) { return get_canvas_height() / 2.0 - gy * ppu(); }

// --- Drawing ----------------------------------------------------------------

static void draw_game(const GameState& s) {
    int w = get_canvas_width();
    int h = get_canvas_height();
    double scale = ppu();

    canvas_clear(w, h);

    // Center dashes
    for (double y = -FIELD_H / 2.0 + 0.5; y <= FIELD_H / 2.0 - 0.5; y += 0.9) {
        draw_rect_alpha(to_x(-0.04), to_y(y + 0.2), 0.08 * scale, 0.4 * scale,
                        255, 255, 255, 0.12);
    }

    // Player paddle (blue)
    double px = -FIELD_W / 2.0 + 0.9;
    draw_rect(to_x(px - PADDLE_W / 2.0), to_y(s.player_y + PADDLE_H / 2.0),
              PADDLE_W * scale, PADDLE_H * scale, 59, 130, 246);

    // AI paddle (red)
    double ax = FIELD_W / 2.0 - 0.9;
    draw_rect(to_x(ax - PADDLE_W / 2.0), to_y(s.ai_y + PADDLE_H / 2.0),
              PADDLE_W * scale, PADDLE_H * scale, 239, 68, 68);

    // Ball
    draw_rect(to_x(s.ball_x - BALL_SIZE / 2.0), to_y(s.ball_y + BALL_SIZE / 2.0),
              BALL_SIZE * scale, BALL_SIZE * scale, 241, 245, 249);

}

// --- Update -----------------------------------------------------------------

static void update(GameState& s, double dt) {
    if (s.mode != Mode::Play) return;

    // Player paddle movement
    double dir = 0.0;
    if (is_key_down("KeyW") || is_key_down("ArrowUp"))   dir += 1.0;
    if (is_key_down("KeyS") || is_key_down("ArrowDown")) dir -= 1.0;
    double pad_max = FIELD_H / 2.0 - PADDLE_H / 2.0;
    s.player_y = std::clamp(s.player_y + dir * PLAYER_SPEED * dt, -pad_max, pad_max);

    // AI paddle
    double ai_delta = s.ball_y - s.ai_y;
    double ai_step = AI_SPEED * dt;
    s.ai_y = std::clamp(s.ai_y + std::clamp(ai_delta, -ai_step, ai_step),
                         -pad_max, pad_max);

    if (s.mode != Mode::Play) return;

    // Ball movement
    s.ball_x += s.ball_vx * dt;
    s.ball_y += s.ball_vy * dt;

    // Wall bounce
    double half = BALL_SIZE / 2.0;
    if (s.ball_y + half > FIELD_H / 2.0) {
        s.ball_y = FIELD_H / 2.0 - half;
        s.ball_vy = -std::abs(s.ball_vy);
    }
    if (s.ball_y - half < -FIELD_H / 2.0) {
        s.ball_y = -FIELD_H / 2.0 + half;
        s.ball_vy = std::abs(s.ball_vy);
    }

    // Player paddle collision
    double px = -FIELD_W / 2.0 + 0.9;
    if (s.ball_vx < 0 &&
        s.ball_x - half <= px + PADDLE_W / 2.0 &&
        s.ball_x + half >= px - PADDLE_W / 2.0 &&
        s.ball_y + half >= s.player_y - PADDLE_H / 2.0 &&
        s.ball_y - half <= s.player_y + PADDLE_H / 2.0) {
        double impact = std::clamp((s.ball_y - s.player_y) / (PADDLE_H / 2.0), -1.0, 1.0);
        s.ball_vx = std::min(std::abs(s.ball_vx) * 1.05 + 0.4, MAX_VX);
        s.ball_vy = std::clamp(s.ball_vy + impact * 3.5, -MAX_VY, MAX_VY);
        s.ball_x = px + PADDLE_W / 2.0 + half;
    }

    // AI paddle collision
    double ax = FIELD_W / 2.0 - 0.9;
    if (s.ball_vx > 0 &&
        s.ball_x + half >= ax - PADDLE_W / 2.0 &&
        s.ball_x - half <= ax + PADDLE_W / 2.0 &&
        s.ball_y + half >= s.ai_y - PADDLE_H / 2.0 &&
        s.ball_y - half <= s.ai_y + PADDLE_H / 2.0) {
        double impact = std::clamp((s.ball_y - s.ai_y) / (PADDLE_H / 2.0), -1.0, 1.0);
        s.ball_vx = -std::min(std::abs(s.ball_vx) * 1.05 + 0.4, MAX_VX);
        s.ball_vy = std::clamp(s.ball_vy + impact * 3.5, -MAX_VY, MAX_VY);
        s.ball_x = ax - PADDLE_W / 2.0 - half;
    }

    // Scoring
    if (s.ball_x < -FIELD_W / 2.0 - 1.0) {
        s.score_point(false);
    }
    if (s.ball_x > FIELD_W / 2.0 + 1.0) {
        s.score_point(true);
    }
}

// --- Main loop tick (called by emscripten_set_main_loop) --------------------

static void tick() {
    double now = emscripten_get_now() / 1000.0;
    double dt = std::min(now - g_last_time, 0.05);
    g_last_time = now;

    update(g_state, dt);
    draw_game(g_state);
}

// --- Entry point ------------------------------------------------------------

int main() {
    resize_canvas();

    // Register input handlers (via EM_ASM since they set up event listeners)
    EM_ASM({
        window.__keys = {};
        window.__actionPressed = false;
        window.addEventListener("keydown", function(e) {
            window.__keys[e.code] = true;
            if (e.code === "Space" || e.code === "Enter") {
                window.__actionPressed = true;
                e.preventDefault();
            }
            if (e.code === "KeyW" || e.code === "ArrowUp" ||
                e.code === "KeyS" || e.code === "ArrowDown") {
                e.preventDefault();
            }
        });
        window.addEventListener("keyup", function(e) {
            window.__keys[e.code] = false;
        });
        window.addEventListener("blur", function() {
            window.__keys = {};
        });
        window.addEventListener("resize", function() {
            var c = document.getElementById("renderCanvas");
            if (!c) return;
            var dpr = window.devicePixelRatio || 1;
            c.width = window.innerWidth * dpr;
            c.height = window.innerHeight * dpr;
            c.style.width = window.innerWidth + "px";
            c.style.height = window.innerHeight + "px";
            window.__ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        });
    });

    set_score(0, 0);
    g_state.reset_ball();

    wavedash_progress(1.0);
    wavedash_init();

    g_last_time = emscripten_get_now() / 1000.0;
    emscripten_set_main_loop(tick, 0, 1);

    return 0;
}
