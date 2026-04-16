using System;
using System.Runtime.InteropServices.JavaScript;
using System.Runtime.CompilerServices;

// ---------------------------------------------------------------------------
// JS interop — [JSImport] calls into browser globals, [JSExport] is called
// from game.js via getAssemblyExports("Pong.dll").
// ---------------------------------------------------------------------------

public static partial class Interop
{
    // Wavedash SDK (minimal: init + progress)
    [JSImport("globalThis.wavedashInit")]
    public static partial void WavedashInit();

    [JSImport("globalThis.wavedashProgress")]
    public static partial void WavedashProgress(double p);

    // Canvas drawing
    [JSImport("globalThis.jsClear")]
    public static partial void JsClear(int r, int g, int b);

    [JSImport("globalThis.jsFillRect")]
    public static partial void JsFillRect(double x, double y, double w, double h, int r, int g, int b);

    // Score DOM update
    [JSImport("globalThis.jsUpdateScore")]
    public static partial void JsUpdateScore(int player, int ai);

    // Called from game.js after runtime boots
    [JSExport]
    public static void WdInit(int width, int height)
    {
        Game.Init(width, height);
    }

    [JSExport]
    public static void WdResize(int width, int height)
    {
        Game.Resize(width, height);
    }

    [JSExport]
    public static void WdTick(double dt, int up, int down)
    {
        Game.Tick((float)dt, up != 0, down != 0);
    }
}

// ---------------------------------------------------------------------------
// Program — required entry point (empty; JS drives via WdInit/WdTick)
// ---------------------------------------------------------------------------

public static class Program
{
    public static void Main() { }
}

// ---------------------------------------------------------------------------
// Game — pure Pong gameplay + rendering via JS interop
// ---------------------------------------------------------------------------

static class Game
{
    // --- Constants ---

    const float DefaultW = 960f;
    const float DefaultH = 540f;
    const float MinW = 320f;
    const float MinH = 240f;
    const float ServeDelay = 0.5f;
    const uint InitialRng = 0x13572468u;

    // --- State ---

    static float _worldW, _worldH;
    static float _playerY, _aiY, _aiTargetY, _aiRetargetIn;
    static float _ballX, _ballY, _ballVx, _ballVy;
    static float _serveDir, _serveTimer;
    static int _playerScore, _aiScore;
    static bool _serving;
    static uint _rng;

    // --- Layout helpers ---

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    static float Abs(float v) => v < 0f ? -v : v;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    static float Clamp(float v, float lo, float hi) => v < lo ? lo : v > hi ? hi : v;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    static float Min(float a, float b) => a < b ? a : b;

    static float Scale()
    {
        float sx = _worldW / DefaultW;
        float sy = _worldH / DefaultH;
        return sx < sy ? sx : sy;
    }

    static float PaddleW() => 18f * Scale();
    static float PaddleH() => 108f * Scale();
    static float BallSize() => 16f * Scale();
    static float PlayerSpeed() => 520f * Scale();
    static float AiSpeed() => 430f * Scale();
    static float PlayerX() => 40f * Scale();
    static float AiX() => _worldW - PaddleW() - 40f * Scale();

    static float Rng01()
    {
        _rng = _rng * 1664525u + 1013904223u;
        return (float)((_rng >> 8) & 0x00FFFFFFu) / 16777215f;
    }

    static float ReflectY(float v, float lo, float hi)
    {
        for (byte g = 0; (v < lo || v > hi) && g < 8; g++)
        {
            if (v < lo) v = lo + (lo - v);
            else v = hi - (v - hi);
        }
        return Clamp(v, lo, hi);
    }

    // --- Init / Resize ---

    public static void Init(int w, int h)
    {
        _worldW = w > MinW ? w : DefaultW;
        _worldH = h > MinH ? h : DefaultH;
        _rng = InitialRng;

        Interop.WavedashProgress(1.0);
        Interop.WavedashInit();

        RestartMatch();
        Render();
    }

    public static void Resize(int w, int h)
    {
        _worldW = w > MinW ? w : _worldW;
        _worldH = h > MinH ? h : _worldH;
        ClampEntities();
        Render();
    }

    // --- Match control ---

    static void RestartMatch()
    {
        _playerScore = 0;
        _aiScore = 0;
        PrepareServe(Rng01() < 0.5f ? -1f : 1f);
    }

    static void PrepareServe(float dir)
    {
        _serveDir = dir;
        _serving = true;
        _serveTimer = ServeDelay;
        _aiRetargetIn = 0f;
        CenterPaddles();
        ResetBall();
    }

    static void CenterPaddles()
    {
        float cy = (_worldH - PaddleH()) * 0.5f;
        _playerY = cy;
        _aiY = cy;
        _aiTargetY = _worldH * 0.5f;
    }

    static void ResetBall()
    {
        float s = BallSize();
        _ballX = (_worldW - s) * 0.5f;
        _ballY = (_worldH - s) * 0.5f;
        _ballVx = 0f;
        _ballVy = 0f;
    }

    static void StartServe()
    {
        float sf = Scale();
        _serving = false;
        _ballX = (_worldW - BallSize()) * 0.5f;
        _ballY = (_worldH - BallSize()) * 0.5f;
        _ballVx = _serveDir * 350f * sf;
        _ballVy = (Rng01() * 2f - 1f) * 160f * sf;
        if (Abs(_ballVy) < 70f * sf)
            _ballVy = _ballVy < 0f ? -90f * sf : 90f * sf;
    }

    static void AwardPoint(bool playerScored)
    {
        if (playerScored)
        {
            _playerScore++;
            PrepareServe(1f);
        }
        else
        {
            _aiScore++;
            PrepareServe(-1f);
        }
        Interop.JsUpdateScore(_playerScore, _aiScore);
    }

    static void ClampEntities()
    {
        _playerY = Clamp(_playerY, 0f, _worldH - PaddleH());
        _aiY = Clamp(_aiY, 0f, _worldH - PaddleH());
        _ballX = Clamp(_ballX, 0f, _worldW - BallSize());
        _ballY = Clamp(_ballY, 0f, _worldH - BallSize());
    }

    // --- Tick ---

    public static void Tick(float dtRaw, bool up, bool down)
    {
        float dt = Clamp(dtRaw, 0f, 0.033f);

        if (_serving)
        {
            _serveTimer -= dt;
            if (_serveTimer <= 0f) StartServe();
        }

        UpdatePlayer(dt, up, down);
        UpdateAi(dt);
        UpdateBall(dt);
        Render();
    }

    // --- Player ---

    static void UpdatePlayer(float dt, bool up, bool down)
    {
        float dir = 0f;
        if (up) dir -= 1f;
        if (down) dir += 1f;
        _playerY = Clamp(_playerY + dir * PlayerSpeed() * dt, 0f, _worldH - PaddleH());
    }

    // --- AI ---

    static void UpdateAi(float dt)
    {
        float s = BallSize();
        float ph = PaddleH();

        if (!_serving && _ballVx > 0f)
        {
            _aiRetargetIn -= dt;
            if (_aiRetargetIn <= 0f)
            {
                float bcx = _ballX + s * 0.5f;
                float bcy = _ballY + s * 0.5f;
                float dist = AiX() - bcx;
                float lead = (_ballVx > 0f && dist > 0f) ? dist / _ballVx : 0f;
                float proj = ReflectY(bcy + _ballVy * lead, s * 0.5f, _worldH - s * 0.5f);
                float miss = ph * (0.18f + Rng01() * 0.32f);
                _aiRetargetIn = 0.08f + Rng01() * 0.09f;
                _aiTargetY = proj + (Rng01() * 2f - 1f) * miss;
            }
        }
        else
        {
            _aiRetargetIn = 0f;
            _aiTargetY = _worldH * 0.5f;
        }

        float cc = _aiY + ph * 0.5f;
        float maxM = AiSpeed() * dt;
        float mv = _aiTargetY - cc;
        if (mv > maxM) mv = maxM;
        if (mv < -maxM) mv = -maxM;
        _aiY = Clamp(_aiY + mv, 0f, _worldH - ph);
    }

    // --- Ball ---

    static void BounceFromPaddle(bool left, float paddleTop, float paddleLeft)
    {
        float sf = Scale();
        float s = BallSize();
        float ph = PaddleH();
        float impact = Clamp(
            ((_ballY + s * 0.5f) - (paddleTop + ph * 0.5f)) / (ph * 0.5f),
            -1f, 1f
        );
        float nsx = Min(Abs(_ballVx) * 1.05f + 22f * sf, 820f * sf);
        float nsy = Clamp(_ballVy + impact * 250f * sf, -560f * sf, 560f * sf);
        if (Abs(nsy) < 80f * sf)
            nsy = impact < 0f ? -100f * sf : 100f * sf;
        nsy += (Rng01() * 2f - 1f) * 22f * sf;

        if (left)
        {
            _ballX = paddleLeft + PaddleW();
            _ballVx = nsx;
        }
        else
        {
            _ballX = paddleLeft - s;
            _ballVx = -nsx;
        }
        _ballVy = nsy;
    }

    static void UpdateBall(float dt)
    {
        if (_serving) return;

        float s = BallSize();
        float pw = PaddleW();
        float ph = PaddleH();
        float px = PlayerX();
        float ax = AiX();

        _ballX += _ballVx * dt;
        _ballY += _ballVy * dt;

        // Top/bottom bounce
        if (_ballY <= 0f) { _ballY = 0f; _ballVy = Abs(_ballVy); }
        else if (_ballY + s >= _worldH) { _ballY = _worldH - s; _ballVy = -Abs(_ballVy); }

        // Player paddle
        if (_ballVx < 0f && _ballX <= px + pw && _ballX + s >= px
            && _ballY + s >= _playerY && _ballY <= _playerY + ph)
            BounceFromPaddle(true, _playerY, px);
        // AI paddle
        else if (_ballVx > 0f && _ballX + s >= ax && _ballX <= ax + pw
                 && _ballY + s >= _aiY && _ballY <= _aiY + ph)
            BounceFromPaddle(false, _aiY, ax);

        // Score
        if (_ballX + s < 0f) AwardPoint(false);
        else if (_ballX > _worldW) AwardPoint(true);
    }

    // --- Render ---

    static void Render()
    {
        float sf = Scale();
        float s = BallSize();
        float pw = PaddleW();
        float ph = PaddleH();

        // Background #111 → (17,17,17)
        Interop.JsClear(17, 17, 17);

        // Center dashes
        for (float dy = 28f * sf; dy < _worldH - 28f * sf; dy += 32f * sf)
            Interop.JsFillRect(_worldW * 0.5 - 3.0 * sf, dy, 6.0 * sf, 18.0 * sf, 119, 138, 160);

        // Top/bottom edges
        Interop.JsFillRect(0, 0, _worldW, 6.0 * sf, 30, 30, 30);
        Interop.JsFillRect(0, _worldH - 6.0 * sf, _worldW, 6.0 * sf, 30, 30, 30);

        // Player paddle (cyan: 92,227,255)
        Interop.JsFillRect(PlayerX(), _playerY, pw, ph, 92, 227, 255);

        // AI paddle (orange: 255,181,71)
        Interop.JsFillRect(AiX(), _aiY, pw, ph, 255, 181, 71);

        // Ball (white: 248,250,252)
        Interop.JsFillRect(_ballX, _ballY, s, s, 248, 250, 252);
    }
}
