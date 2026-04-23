#include <raylib.h>
#include <emscripten.h>
#include <math.h>

// --- Wavedash SDK bridge ---

EM_JS(void, wavedash_init, (), { WavedashJS.init(); });
EM_JS(void, wavedash_progress, (double p), { WavedashJS.updateLoadProgressZeroToOne(p); });

// --- Constants ---

#define SCREEN_W    900
#define SCREEN_H    600
#define PADDLE_W     15.0f
#define PADDLE_H    100.0f
#define BALL_SIZE    15.0f
#define PADDLE_EDGE  50.0f
#define PADDLE_SPD  500.0f
#define AI_SPD      350.0f
#define BALL_SPD    400.0f

// --- Game state ---

static float left_y, right_y;
static float ball_x, ball_y;
static float ball_vx, ball_vy;
static int   left_score, right_score;

static Color bg     = { 10,  10,  10, 255 };
static Color dim_w  = {255, 255, 255,  40 };

static float clampf(float v, float lo, float hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

static void reset_ball(float dir) {
    ball_x  = SCREEN_W / 2.0f - BALL_SIZE / 2.0f;
    ball_y  = SCREEN_H / 2.0f - BALL_SIZE / 2.0f;
    ball_vx = BALL_SPD * dir;
    ball_vy = BALL_SPD * 0.25f;
}

// --- Main loop ---

static void tick(void) {
    float dt = GetFrameTime();

    // Left paddle: WASD or arrow keys
    if (IsKeyDown(KEY_W) || IsKeyDown(KEY_UP))   left_y -= PADDLE_SPD * dt;
    if (IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN))  left_y += PADDLE_SPD * dt;
    left_y = clampf(left_y, 0, SCREEN_H - PADDLE_H);

    // Right paddle: AI tracking
    float target = ball_y - PADDLE_H / 2.0f;
    float diff   = target - right_y;
    float step   = AI_SPD * dt;
    if (fabsf(diff) < step) right_y  = target;
    else if (diff > 0)      right_y += step;
    else                    right_y -= step;
    right_y = clampf(right_y, 0, SCREEN_H - PADDLE_H);

    // Ball movement
    ball_x += ball_vx * dt;
    ball_y += ball_vy * dt;

    // Wall bounce
    if (ball_y < 0)                    { ball_y = 0;                    ball_vy = -ball_vy; }
    if (ball_y > SCREEN_H - BALL_SIZE) { ball_y = SCREEN_H - BALL_SIZE; ball_vy = -ball_vy; }

    // Paddle collisions
    Rectangle ball = { ball_x, ball_y, BALL_SIZE, BALL_SIZE };
    Rectangle lpad = { PADDLE_EDGE, left_y,                       PADDLE_W, PADDLE_H };
    Rectangle rpad = { SCREEN_W - PADDLE_EDGE - PADDLE_W, right_y, PADDLE_W, PADDLE_H };

    if (ball_vx < 0 && CheckCollisionRecs(ball, lpad)) {
        ball_x  = PADDLE_EDGE + PADDLE_W;
        ball_vx = -ball_vx;
    }
    if (ball_vx > 0 && CheckCollisionRecs(ball, rpad)) {
        ball_x  = SCREEN_W - PADDLE_EDGE - PADDLE_W - BALL_SIZE;
        ball_vx = -ball_vx;
    }

    // Scoring
    if (ball_x + BALL_SIZE < 0)    { right_score++; reset_ball( 1.0f); }
    if (ball_x > SCREEN_W)         { left_score++;  reset_ball(-1.0f); }

    // --- Draw ---
    BeginDrawing();
    ClearBackground(bg);

    // Center line
    DrawRectangle(SCREEN_W / 2 - 1, 0, 2, SCREEN_H, dim_w);

    // Paddles
    DrawRectangleRec((Rectangle){ PADDLE_EDGE,                      left_y,  PADDLE_W, PADDLE_H }, WHITE);
    DrawRectangleRec((Rectangle){ SCREEN_W - PADDLE_EDGE - PADDLE_W, right_y, PADDLE_W, PADDLE_H }, WHITE);

    // Ball
    DrawRectangleRec((Rectangle){ ball_x, ball_y, BALL_SIZE, BALL_SIZE }, WHITE);

    // Score
    DrawText(TextFormat("%d", left_score),  SCREEN_W / 2 - 60, 20, 40, (Color){255, 255, 255, 80});
    DrawText(TextFormat("%d", right_score), SCREEN_W / 2 + 20, 20, 40, (Color){255, 255, 255, 80});

    EndDrawing();
}

int main(void) {
    wavedash_progress(1.0);
    wavedash_init();

    InitWindow(SCREEN_W, SCREEN_H, "Pong");
    SetTargetFPS(60);

    left_y  = SCREEN_H / 2.0f - PADDLE_H / 2.0f;
    right_y = SCREEN_H / 2.0f - PADDLE_H / 2.0f;
    reset_ball(1.0f);

    emscripten_set_main_loop(tick, 0, 1);

    CloseWindow();
    return 0;
}
