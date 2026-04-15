#include <emscripten.h>
#include <emscripten/html5.h>
#include <stdbool.h>
#include <math.h>

// --- Canvas / draw helpers via EM_JS ----------------------------------------

EM_JS(void, setup_canvas, (), {
    var c = document.getElementById("renderCanvas");
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    window.__ctx = c.getContext("2d");
    window.addEventListener("resize", function() {
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    });
});

EM_JS(int, canvas_width, (), { return document.getElementById("renderCanvas").width; });
EM_JS(int, canvas_height, (), { return document.getElementById("renderCanvas").height; });

EM_JS(void, clear_canvas, (int r, int g, int b), {
    var ctx = window.__ctx;
    var c = ctx.canvas;
    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    ctx.fillRect(0, 0, c.width, c.height);
});

EM_JS(void, draw_rect, (double x, double y, double w, double h, int r, int g, int b), {
    var ctx = window.__ctx;
    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    ctx.fillRect(x, y, w, h);
});

EM_JS(void, draw_text, (const char* str, double x, double y, double size, int r, int g, int b), {
    var ctx = window.__ctx;
    ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    ctx.font = "bold " + Math.round(size) + "px monospace";
    ctx.textAlign = "center";
    ctx.fillText(UTF8ToString(str), x, y);
});

EM_JS(void, set_score, (int player, int ai), {
    document.getElementById("playerScore").textContent = player;
    document.getElementById("aiScore").textContent = ai;
});

// --- Wavedash bindings via EM_JS --------------------------------------------

EM_JS(void, wavedash_init, (), { WavedashJS.init({ debug: true }); });
EM_JS(void, wavedash_progress, (double p), { WavedashJS.updateLoadProgressZeroToOne(p); });

// --- Input via EM_JS --------------------------------------------------------

EM_JS(void, setup_input, (), {
    window.__keys = {};
    window.addEventListener("keydown", function(e) {
        window.__keys[e.code] = true;
        if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "Space") e.preventDefault();
    });
    window.addEventListener("keyup", function(e) {
        window.__keys[e.code] = false;
    });
});

EM_JS(bool, key_down, (const char* code), {
    return !!window.__keys[UTF8ToString(code)];
});

// --- Game state -------------------------------------------------------------

#define W 960
#define H 540
#define PADDLE_W 14
#define PADDLE_H 90
#define BALL_SIZE 12
#define PADDLE_SPEED 400.0f
#define AI_SPEED 340.0f
#define BALL_SPEED 360.0f
#define WIN_SCORE 7

static float player_y, ai_y;
static float ball_x, ball_y, ball_vx, ball_vy;
static int player_score, ai_score;
static bool serving;
static bool game_over;
static float serve_dir;
static double last_time;

static float scale_x(void) { return (float)canvas_width() / W; }
static float scale_y(void) { return (float)canvas_height() / H; }

static void serve(void);

static void reset_ball(void) {
    ball_x = W / 2.0f - BALL_SIZE / 2.0f;
    ball_y = H / 2.0f - BALL_SIZE / 2.0f;
    ball_vx = 0; ball_vy = 0;
    serving = true;
    serve();
}

static void new_game(void) {
    player_y = H / 2.0f - PADDLE_H / 2.0f;
    ai_y = H / 2.0f - PADDLE_H / 2.0f;
    player_score = 0; ai_score = 0;
    serve_dir = 1.0f;
    game_over = false;
    reset_ball();
    set_score(0, 0);
}

static void serve(void) {
    serving = false;
    ball_vx = BALL_SPEED * serve_dir;
    ball_vy = (serve_dir > 0 ? 1.0f : -1.0f) * BALL_SPEED * 0.4f;
}

// --- Per-frame tick ---------------------------------------------------------

static void tick(void) {
    double now = emscripten_get_now() / 1000.0;
    float dt = (float)(now - last_time);
    if (dt > 0.05f) dt = 0.05f;
    last_time = now;

    float sx = scale_x(), sy = scale_y();
    int cw = canvas_width(), ch = canvas_height();

    // Input
    bool up = key_down("ArrowUp") || key_down("KeyW");
    bool down = key_down("ArrowDown") || key_down("KeyS");
    bool space = key_down("Space");

    (void)space;

    // Move player
    if (up) player_y -= PADDLE_SPEED * dt;
    if (down) player_y += PADDLE_SPEED * dt;
    if (player_y < 0) player_y = 0;
    if (player_y > H - PADDLE_H) player_y = H - PADDLE_H;

    // AI
    float ai_center = ai_y + PADDLE_H / 2.0f;
    float target = ball_y + BALL_SIZE / 2.0f;
    if (ball_vx < 0) target = H / 2.0f;
    float diff = target - ai_center;
    float move = AI_SPEED * dt;
    if (diff > move) diff = move;
    if (diff < -move) diff = -move;
    ai_y += diff;
    if (ai_y < 0) ai_y = 0;
    if (ai_y > H - PADDLE_H) ai_y = H - PADDLE_H;

    // Ball
    if (!serving) {
        ball_x += ball_vx * dt;
        ball_y += ball_vy * dt;

        // Top/bottom bounce
        if (ball_y <= 0) { ball_y = 0; ball_vy = fabsf(ball_vy); }
        if (ball_y + BALL_SIZE >= H) { ball_y = H - BALL_SIZE; ball_vy = -fabsf(ball_vy); }

        // Player paddle collision (left side)
        float px = 30.0f;
        if (ball_vx < 0 && ball_x <= px + PADDLE_W && ball_x + BALL_SIZE >= px &&
            ball_y + BALL_SIZE >= player_y && ball_y <= player_y + PADDLE_H) {
            ball_x = px + PADDLE_W;
            float hit = ((ball_y + BALL_SIZE / 2.0f) - (player_y + PADDLE_H / 2.0f)) / (PADDLE_H / 2.0f);
            ball_vx = fabsf(ball_vx) * 1.05f;
            ball_vy = hit * BALL_SPEED * 0.8f;
            if (ball_vx > 700) ball_vx = 700;
        }

        // AI paddle collision (right side)
        float ax = W - 30.0f - PADDLE_W;
        if (ball_vx > 0 && ball_x + BALL_SIZE >= ax && ball_x <= ax + PADDLE_W &&
            ball_y + BALL_SIZE >= ai_y && ball_y <= ai_y + PADDLE_H) {
            ball_x = ax - BALL_SIZE;
            float hit = ((ball_y + BALL_SIZE / 2.0f) - (ai_y + PADDLE_H / 2.0f)) / (PADDLE_H / 2.0f);
            ball_vx = -fabsf(ball_vx) * 1.05f;
            ball_vy = hit * BALL_SPEED * 0.8f;
            if (ball_vx < -700) ball_vx = -700;
        }

        // Score
        if (ball_x + BALL_SIZE < 0) {
            ai_score++;
            set_score(player_score, ai_score);
            serve_dir = -1.0f; reset_ball();
        }
        if (ball_x > W) {
            player_score++;
            set_score(player_score, ai_score);
            serve_dir = 1.0f; reset_ball();
        }
    }

    // --- Draw ---
    clear_canvas(17, 17, 17);

    // Center dashed line
    for (float dy = 10; dy < H; dy += 30) {
        draw_rect(((float)W / 2 - 2) * sx, dy * sy, 4 * sx, 16 * sy, 60, 60, 60);
    }

    // Paddles
    float px_draw = 30.0f;
    float ax_draw = W - 30.0f - PADDLE_W;
    draw_rect(px_draw * sx, player_y * sy, PADDLE_W * sx, PADDLE_H * sy, 92, 227, 255);
    draw_rect(ax_draw * sx, ai_y * sy, PADDLE_W * sx, PADDLE_H * sy, 255, 181, 71);

    // Ball
    draw_rect(ball_x * sx, ball_y * sy, BALL_SIZE * sx, BALL_SIZE * sy, 248, 250, 252);

}

// --- Main -------------------------------------------------------------------

int main(void) {
    setup_canvas();
    setup_input();

    wavedash_init();
    wavedash_progress(1.0);

    new_game();
    last_time = emscripten_get_now() / 1000.0;

    emscripten_set_main_loop(tick, 0, 1);
    return 0;
}
