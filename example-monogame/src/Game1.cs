using System;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

// MonoGame owns the startup state machine and gameplay. The JS host only
// provides browser bindings, canvas drawing primitives, input, and
// WavedashJS access. The MonoGame framework types (Vector2, Color,
// Rectangle, MathHelper) are defined inline for NativeAOT WASM.

struct Vector2
{
    public float X;
    public float Y;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public Vector2(float x, float y) { X = x; Y = y; }

    public static Vector2 Zero => new(0f, 0f);

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static Vector2 operator +(Vector2 a, Vector2 b) => new(a.X + b.X, a.Y + b.Y);

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static Vector2 operator *(Vector2 v, float s) => new(v.X * s, v.Y * s);
}

readonly struct Color(byte r, byte g, byte b, byte a)
{
    public readonly byte R = r, G = g, B = b, A = a;
}

struct Rectangle
{
    public float X, Y, Width, Height;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public Rectangle(float x, float y, float w, float h) { X = x; Y = y; Width = w; Height = h; }

    public float Right => X + Width;
    public float Bottom => Y + Height;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public bool Intersects(Rectangle other) =>
        X < other.Right && Right > other.X &&
        Y < other.Bottom && Bottom > other.Y;
}

static class MathHelper
{
    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static float Clamp(float value, float min, float max) =>
        value < min ? min : value > max ? max : value;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static float Min(float a, float b) => a < b ? a : b;

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    public static float Abs(float v) => v < 0f ? -v : v;
}

enum GameMode : byte
{
    Serve,
    Play,
    GameOver,
}

enum StartupPhase : byte
{
    PrepareGame,
    InitSdk,
    WaitForSdk,
    FinalizeStartup,
    Ready,
    Fatal,
}

unsafe struct GameState
{
    public float WorldW;
    public float WorldH;

    public float PlayerY;
    public float AiY;
    public float AiTargetY;
    public float AiRetargetIn;

    public Vector2 BallPos;
    public Vector2 BallVel;

    public float ServeDirection;
    public int PlayerScore;
    public int AiScore;
    public int Winner;

    public GameMode Mode;
    public StartupPhase Phase;
    public float PhaseElapsed;
    public bool FatalVisible;
    public uint RngState;

    public fixed byte UserNameBuf[64];
    public fixed byte HostErrorBuf[192];
}

static unsafe class Game1
{
    const float DefaultWorldW = 960f;
    const float DefaultWorldH = 540f;
    const float MinWorldW = 320f;
    const float MinWorldH = 240f;
    const int WinScore = 7;
    const float StartupStepDelay = 0.08f;
    const float StartupTimeout = 6f;
    const uint InitialRngState = 0x13572468u;
    const int UserNameCapacity = 64;
    const int HostErrorCapacity = 192;

    // --- WASM imports -------------------------------------------------------

    [DllImport("env")] static extern void js_clear(byte r, byte g, byte b, byte a);
    [DllImport("env")] static extern void js_fill_rect(float x, float y, float w, float h, byte r, byte g, byte b, byte a);
    [DllImport("env")] static extern void js_draw_text(byte* ptr, int len, float x, float y, float size, byte r, byte g, byte b, byte a);

    [DllImport("env")] static extern void js_host_set_loading(byte* stepPtr, int stepLen, byte* detailPtr, int detailLen, float progress);
    [DllImport("env")] static extern void js_host_set_status(byte* ptr, int len, byte r, byte g, byte b, byte a);
    [DllImport("env")] static extern void js_host_set_user(byte* ptr, int len);
    [DllImport("env")] static extern void js_host_hide_overlay();
    [DllImport("env")] static extern void js_host_show_fatal(byte* msgPtr, int msgLen, byte* detailPtr, int detailLen);
    [DllImport("env")] static extern byte js_host_has_error();
    [DllImport("env")] static extern int js_host_write_error(byte* ptr, int maxLen);

    [DllImport("env")] static extern void js_wd_init(byte debug, byte deferEvents);
    [DllImport("env")] static extern byte js_wd_is_ready();
    [DllImport("env")] static extern void js_wd_update_load_progress(float progress);
    [DllImport("env")] static extern void js_wd_ready_for_events();
    [DllImport("env")] static extern void js_wd_load_complete();
    [DllImport("env")] static extern int js_wd_write_user_name(byte* ptr, int maxLen);

    // --- Colors -------------------------------------------------------------

    static readonly Color StatusPending  = new(148, 163, 184, 255);
    static readonly Color StatusStarting = new(250, 204, 21,  255);
    static readonly Color StatusReady    = new(34,  197, 94,  255);
    static readonly Color Background     = new(3,   7,   18,  255);
    static readonly Color ArenaEdge      = new(8,   15,  36,  255);
    static readonly Color CenterDash     = new(119, 138, 160, 110);
    static readonly Color PlayerColor    = new(92,  227, 255, 255);
    static readonly Color CpuColor       = new(255, 181, 71,  255);
    static readonly Color BallColor      = new(248, 250, 252, 255);
    static readonly Color LabelColor     = new(148, 163, 184, 255);
    static readonly Color ScorePlayer    = new(230, 244, 255, 255);
    static readonly Color ScoreCpu       = new(255, 237, 213, 255);
    static readonly Color BannerPanel    = new(8,   15,  30,  170);
    static readonly Color BannerText     = new(226, 232, 240, 255);

    // --- State ---------------------------------------------------------------

    static GameState _s;

    // --- Layout helpers -----------------------------------------------------

    static float ScaleFactor()
    {
        float sx = _s.WorldW / DefaultWorldW;
        float sy = _s.WorldH / DefaultWorldH;
        return sx < sy ? sx : sy;
    }

    static float PaddleW() => 18f * ScaleFactor();
    static float PaddleH() => 108f * ScaleFactor();
    static float BallSize() => 16f * ScaleFactor();
    static float PlayerSpeed() => 520f * ScaleFactor();
    static float AiSpeed() => 430f * ScaleFactor();
    static float PlayerX() => 40f * ScaleFactor();
    static float AiX() => _s.WorldW - PaddleW() - 40f * ScaleFactor();

    static float RandomUnit()
    {
        const uint mask = 0x00ffffffu;
        _s.RngState = _s.RngState * 1664525u + 1013904223u;
        return (float)((_s.RngState >> 8) & mask) / 16777215f;
    }

    static float ReflectY(float value, float minY, float maxY)
    {
        float reflected = value;
        for (byte guard = 0; (reflected < minY || reflected > maxY) && guard < 8; guard++)
        {
            if (reflected < minY)
                reflected = minY + (minY - reflected);
            else
                reflected = maxY - (reflected - maxY);
        }
        return MathHelper.Clamp(reflected, minY, maxY);
    }

    // --- Drawing helpers ----------------------------------------------------

    static void ClearScreen(Color c) => js_clear(c.R, c.G, c.B, c.A);

    static void DrawRect(float x, float y, float w, float h, Color c) =>
        js_fill_rect(x, y, w, h, c.R, c.G, c.B, c.A);

    static void DrawRect(Rectangle rect, Color c) =>
        js_fill_rect(rect.X, rect.Y, rect.Width, rect.Height, c.R, c.G, c.B, c.A);

    static void DrawString(ReadOnlySpan<byte> text, float x, float y, float size, Color c)
    {
        fixed (byte* ptr = text)
            js_draw_text(ptr, text.Length, x, y, size, c.R, c.G, c.B, c.A);
    }

    // --- Host bridge helpers ------------------------------------------------

    static void HostSetLoading(ReadOnlySpan<byte> step, ReadOnlySpan<byte> detail, float progress)
    {
        fixed (byte* sp = step)
        fixed (byte* dp = detail)
        {
            js_host_set_loading(sp, step.Length, dp, detail.Length, progress);
            js_wd_update_load_progress(progress);
        }
    }

    static void HostSetStatus(ReadOnlySpan<byte> text, Color c)
    {
        fixed (byte* ptr = text)
            js_host_set_status(ptr, text.Length, c.R, c.G, c.B, c.A);
    }

    static void HostSetUser(ReadOnlySpan<byte> name)
    {
        fixed (byte* ptr = name)
            js_host_set_user(ptr, name.Length);
    }

    static void SyncUserFromSdk()
    {
        int len = js_wd_write_user_name(_s.UserNameBuf, UserNameCapacity);
        if (len > 0)
            HostSetUser(new ReadOnlySpan<byte>(_s.UserNameBuf, len));
        else
            HostSetUser(""u8);
    }

    static void ShowFatal(ReadOnlySpan<byte> message, ReadOnlySpan<byte> detail)
    {
        if (!_s.FatalVisible)
        {
            fixed (byte* mp = message)
            fixed (byte* dp = detail)
                js_host_show_fatal(mp, message.Length, dp, detail.Length);
            _s.FatalVisible = true;
        }
        _s.Phase = StartupPhase.Fatal;
    }

    static void ShowHostError()
    {
        int len = js_host_write_error(_s.HostErrorBuf, HostErrorCapacity);
        ReadOnlySpan<byte> detail = len > 0
            ? new ReadOnlySpan<byte>(_s.HostErrorBuf, len)
            : "Unknown host error."u8;
        ShowFatal("The MonoGame startup bridge hit an error."u8, detail);
    }

    static bool CheckHostError()
    {
        if (js_host_has_error() == 0) return false;
        ShowHostError();
        return true;
    }

    // --- Startup state machine ----------------------------------------------

    static void TransitionStartup(StartupPhase next)
    {
        _s.Phase = next;
        _s.PhaseElapsed = 0f;

        switch (next)
        {
            case StartupPhase.PrepareGame:
                HostSetStatus("SDK pending"u8, StatusPending);
                HostSetUser(""u8);
                HostSetLoading(
                    "Preparing MonoGame state"u8,
                    "Handing Wavedash startup control to the MonoGame game loop."u8,
                    0.42f
                );
                break;
            case StartupPhase.InitSdk:
                HostSetStatus("SDK starting"u8, StatusStarting);
                HostSetLoading(
                    "Initializing Wavedash SDK"u8,
                    "Calling imported Wavedash bindings from C#."u8,
                    0.58f
                );
                js_wd_init(1, 1);
                break;
            case StartupPhase.WaitForSdk:
                HostSetLoading(
                    "Waiting for SDK readiness"u8,
                    "Polling WavedashJS.isReady() before gameplay begins."u8,
                    0.82f
                );
                break;
            case StartupPhase.FinalizeStartup:
                HostSetLoading(
                    "Finalizing game startup"u8,
                    "Preparing the first playable Pong serve state."u8,
                    0.96f
                );
                break;
            case StartupPhase.Ready:
                HostSetLoading(
                    "Loading complete"u8,
                    "Releasing deferred SDK events and handing over to gameplay."u8,
                    1f
                );
                js_wd_ready_for_events();
                js_wd_load_complete();
                js_host_hide_overlay();
                break;
            case StartupPhase.Fatal:
                break;
        }
    }

    static void UpdateStartup(float dt)
    {
        if (_s.Phase is StartupPhase.Ready or StartupPhase.Fatal) return;
        if (CheckHostError()) return;

        _s.PhaseElapsed += dt;

        switch (_s.Phase)
        {
            case StartupPhase.PrepareGame:
                if (_s.PhaseElapsed >= StartupStepDelay)
                    TransitionStartup(StartupPhase.InitSdk);
                break;
            case StartupPhase.InitSdk:
                if (_s.PhaseElapsed >= StartupStepDelay)
                    TransitionStartup(StartupPhase.WaitForSdk);
                break;
            case StartupPhase.WaitForSdk:
                if (js_wd_is_ready() != 0)
                {
                    HostSetStatus("SDK ready"u8, StatusReady);
                    SyncUserFromSdk();
                    TransitionStartup(StartupPhase.FinalizeStartup);
                }
                else if (_s.PhaseElapsed >= StartupTimeout)
                {
                    ShowFatal(
                        "Wavedash SDK did not become ready."u8,
                        "WavedashJS.isReady() did not report ready before the startup timeout."u8
                    );
                }
                break;
            case StartupPhase.FinalizeStartup:
                if (_s.PhaseElapsed >= StartupStepDelay)
                    TransitionStartup(StartupPhase.Ready);
                break;
        }
    }

    // --- Initialize ---------------------------------------------------------

    static void Initialize(float width, float height)
    {
        _s = default;
        _s.WorldW = width > MinWorldW ? width : DefaultWorldW;
        _s.WorldH = height > MinWorldH ? height : DefaultWorldH;
        _s.ServeDirection = 1f;
        _s.Mode = GameMode.Serve;
        _s.Phase = StartupPhase.PrepareGame;
        _s.RngState = InitialRngState;
    }

    // --- Gameplay -----------------------------------------------------------

    static Rectangle PlayerRect() => new(PlayerX(), _s.PlayerY, PaddleW(), PaddleH());
    static Rectangle AiRect() => new(AiX(), _s.AiY, PaddleW(), PaddleH());
    static Rectangle BallRect() => new(_s.BallPos.X, _s.BallPos.Y, BallSize(), BallSize());

    static void ClampEntitiesToWorld()
    {
        _s.PlayerY = MathHelper.Clamp(_s.PlayerY, 0f, _s.WorldH - PaddleH());
        _s.AiY = MathHelper.Clamp(_s.AiY, 0f, _s.WorldH - PaddleH());
        _s.BallPos = new Vector2(
            MathHelper.Clamp(_s.BallPos.X, 0f, _s.WorldW - BallSize()),
            MathHelper.Clamp(_s.BallPos.Y, 0f, _s.WorldH - BallSize())
        );
    }

    static void CenterPaddles()
    {
        float centered = (_s.WorldH - PaddleH()) * 0.5f;
        _s.PlayerY = centered;
        _s.AiY = centered;
        _s.AiTargetY = _s.WorldH * 0.5f;
    }

    static void ResetBall()
    {
        float size = BallSize();
        _s.BallPos = new Vector2((_s.WorldW - size) * 0.5f, (_s.WorldH - size) * 0.5f);
        _s.BallVel = Vector2.Zero;
    }

    static void PrepareServe(float direction)
    {
        _s.ServeDirection = direction;
        _s.Mode = GameMode.Serve;
        _s.AiRetargetIn = 0f;
        CenterPaddles();
        ResetBall();
    }

    static void RestartMatch()
    {
        _s.PlayerScore = 0;
        _s.AiScore = 0;
        _s.Winner = 0;
        PrepareServe(RandomUnit() < 0.5f ? -1f : 1f);
    }

    static void StartServe()
    {
        float sf = ScaleFactor();
        _s.Mode = GameMode.Play;
        float size = BallSize();
        _s.BallPos = new Vector2((_s.WorldW - size) * 0.5f, (_s.WorldH - size) * 0.5f);

        float vy = (RandomUnit() * 2f - 1f) * 160f * sf;
        if (MathHelper.Abs(vy) < 70f * sf)
            vy = vy < 0f ? -90f * sf : 90f * sf;

        _s.BallVel = new Vector2(_s.ServeDirection * 350f * sf, vy);
    }

    static void AwardPoint(bool playerScored)
    {
        if (playerScored)
        {
            _s.PlayerScore++;
            if (_s.PlayerScore >= WinScore)
            {
                _s.Winner = 1;
                _s.Mode = GameMode.GameOver;
                ResetBall();
                return;
            }
            PrepareServe(1f);
        }
        else
        {
            _s.AiScore++;
            if (_s.AiScore >= WinScore)
            {
                _s.Winner = 2;
                _s.Mode = GameMode.GameOver;
                ResetBall();
                return;
            }
            PrepareServe(-1f);
        }
    }

    static void UpdatePlayer(float dt, bool moveUp, bool moveDown)
    {
        float direction = 0f;
        if (moveUp) direction -= 1f;
        if (moveDown) direction += 1f;
        _s.PlayerY = MathHelper.Clamp(
            _s.PlayerY + direction * PlayerSpeed() * dt,
            0f, _s.WorldH - PaddleH()
        );
    }

    static void UpdateAi(float dt)
    {
        float size = BallSize();
        float ph = PaddleH();

        if (_s.Mode == GameMode.Play && _s.BallVel.X > 0f)
        {
            _s.AiRetargetIn -= dt;
            if (_s.AiRetargetIn <= 0f)
            {
                float ballCx = _s.BallPos.X + size * 0.5f;
                float ballCy = _s.BallPos.Y + size * 0.5f;
                float distToPaddle = AiX() - ballCx;
                float leadTime = (_s.BallVel.X > 0f && distToPaddle > 0f)
                    ? distToPaddle / _s.BallVel.X : 0f;
                float projected = ReflectY(
                    ballCy + _s.BallVel.Y * leadTime,
                    size * 0.5f,
                    _s.WorldH - size * 0.5f
                );
                float missWindow = ph * (0.18f + RandomUnit() * 0.32f);

                _s.AiRetargetIn = 0.08f + RandomUnit() * 0.09f;
                _s.AiTargetY = projected + (RandomUnit() * 2f - 1f) * missWindow;
            }
        }
        else
        {
            _s.AiRetargetIn = 0f;
            _s.AiTargetY = _s.WorldH * 0.5f;
        }

        float currentCenter = _s.AiY + ph * 0.5f;
        float maxMove = AiSpeed() * dt;
        float move = _s.AiTargetY - currentCenter;
        if (move > maxMove) move = maxMove;
        if (move < -maxMove) move = -maxMove;
        _s.AiY = MathHelper.Clamp(_s.AiY + move, 0f, _s.WorldH - ph);
    }

    static void BounceFromPaddle(bool leftSide, float paddleTop, float paddleLeft)
    {
        float sf = ScaleFactor();
        float size = BallSize();
        float ph = PaddleH();
        float impact = MathHelper.Clamp(
            ((_s.BallPos.Y + size * 0.5f) - (paddleTop + ph * 0.5f)) / (ph * 0.5f),
            -1f, 1f
        );
        float nextSpeedX = MathHelper.Min(MathHelper.Abs(_s.BallVel.X) * 1.05f + 22f * sf, 820f * sf);
        float nextSpeedY = MathHelper.Clamp(
            _s.BallVel.Y + impact * 250f * sf,
            -560f * sf, 560f * sf
        );

        if (MathHelper.Abs(nextSpeedY) < 80f * sf)
            nextSpeedY = impact < 0f ? -100f * sf : 100f * sf;

        nextSpeedY += (RandomUnit() * 2f - 1f) * 22f * sf;

        if (leftSide)
        {
            _s.BallPos.X = paddleLeft + PaddleW();
            _s.BallVel = new Vector2(nextSpeedX, nextSpeedY);
        }
        else
        {
            _s.BallPos.X = paddleLeft - size;
            _s.BallVel = new Vector2(-nextSpeedX, nextSpeedY);
        }
    }

    static void UpdateBall(float dt)
    {
        if (_s.Mode != GameMode.Play) return;

        float size = BallSize();
        float px = PlayerX();
        float ax = AiX();

        _s.BallPos = _s.BallPos + _s.BallVel * dt;

        if (_s.BallPos.Y <= 0f)
        {
            _s.BallPos.Y = 0f;
            _s.BallVel.Y = MathHelper.Abs(_s.BallVel.Y);
        }
        else if (_s.BallPos.Y + size >= _s.WorldH)
        {
            _s.BallPos.Y = _s.WorldH - size;
            _s.BallVel.Y = -MathHelper.Abs(_s.BallVel.Y);
        }

        Rectangle ball = BallRect();
        Rectangle player = PlayerRect();
        Rectangle ai = AiRect();

        if (_s.BallVel.X < 0f && ball.Intersects(player))
        {
            BounceFromPaddle(true, _s.PlayerY, px);
        }
        else if (_s.BallVel.X > 0f && ball.Intersects(ai))
        {
            BounceFromPaddle(false, _s.AiY, ax);
        }

        if (_s.BallPos.X + size < 0f)
            AwardPoint(false);
        else if (_s.BallPos.X > _s.WorldW)
            AwardPoint(true);
    }

    // --- Update -------------------------------------------------------------

    static void Update(float dt, bool moveUp, bool moveDown, bool actionPressed)
    {
        if (actionPressed)
        {
            if (_s.Mode == GameMode.Serve)
                StartServe();
            else if (_s.Mode == GameMode.GameOver)
                RestartMatch();
        }

        UpdatePlayer(dt, moveUp, moveDown);
        UpdateAi(dt);
        UpdateBall(dt);
    }

    // --- Text helpers -------------------------------------------------------

    static ReadOnlySpan<byte> ScoreText(int score) => score switch
    {
        0 => "0"u8, 1 => "1"u8, 2 => "2"u8, 3 => "3"u8, 4 => "4"u8,
        5 => "5"u8, 6 => "6"u8, 7 => "7"u8, 8 => "8"u8, _ => "9"u8,
    };

    static ReadOnlySpan<byte> CurrentBanner() => _s.Mode switch
    {
        GameMode.Serve => "PRESS SPACE TO SERVE"u8,
        GameMode.GameOver when _s.Winner == 1 => "YOU WIN - PRESS SPACE TO PLAY AGAIN"u8,
        GameMode.GameOver => "CPU WINS - PRESS SPACE TO TRY AGAIN"u8,
        _ => "FIRST TO 7"u8,
    };

    static ReadOnlySpan<byte> CurrentSubtitle() => _s.Mode switch
    {
        GameMode.Serve => "W/S or arrow keys move the paddle"u8,
        GameMode.Play => "Hard AI, but it can be beaten with angled returns"u8,
        _ => "Mix in quick direction changes to beat the CPU"u8,
    };

    // --- Rendering ----------------------------------------------------------

    static void Draw()
    {
        float sf = ScaleFactor();

        ClearScreen(Background);

        for (float dashY = 28f * sf; dashY < _s.WorldH - 28f * sf; dashY += 32f * sf)
            DrawRect(_s.WorldW * 0.5f - 3f * sf, dashY, 6f * sf, 18f * sf, CenterDash);

        DrawRect(0f, 0f, _s.WorldW, 6f * sf, ArenaEdge);
        DrawRect(0f, _s.WorldH - 6f * sf, _s.WorldW, 6f * sf, ArenaEdge);

        DrawRect(PlayerRect(), PlayerColor);
        DrawRect(AiRect(), CpuColor);
        DrawRect(BallRect(), BallColor);

        DrawString("PLAYER"u8, _s.WorldW * 0.20f, 46f * sf, 18f * sf, LabelColor);
        DrawString("CPU"u8, _s.WorldW * 0.73f, 46f * sf, 18f * sf, LabelColor);
        DrawString(ScoreText(_s.PlayerScore), _s.WorldW * 0.41f, 78f * sf, 54f * sf, ScorePlayer);
        DrawString(ScoreText(_s.AiScore), _s.WorldW * 0.55f, 78f * sf, 54f * sf, ScoreCpu);

        DrawRect(_s.WorldW * 0.19f, _s.WorldH * 0.74f, _s.WorldW * 0.62f, 76f * sf, BannerPanel);

        DrawString(CurrentBanner(), _s.WorldW * 0.24f, _s.WorldH * 0.80f, 22f * sf, BannerText);
        DrawString(CurrentSubtitle(), _s.WorldW * 0.24f, _s.WorldH * 0.86f, 14f * sf, LabelColor);
    }

    // --- WASM exports -------------------------------------------------------

    [UnmanagedCallersOnly(EntryPoint = "wd_init")]
    public static void WdInit(float width, float height)
    {
        Initialize(width, height);
        RestartMatch();
        TransitionStartup(StartupPhase.PrepareGame);
        Draw();
    }

    [UnmanagedCallersOnly(EntryPoint = "wd_resize")]
    public static void WdResize(float width, float height)
    {
        _s.WorldW = width > MinWorldW ? width : _s.WorldW;
        _s.WorldH = height > MinWorldH ? height : _s.WorldH;
        ClampEntitiesToWorld();
        Draw();
    }

    [UnmanagedCallersOnly(EntryPoint = "wd_tick")]
    public static void WdTick(float dtSeconds, byte moveUp, byte moveDown, byte actionPressed)
    {
        float dt = MathHelper.Clamp(dtSeconds, 0f, 0.033f);

        if (CheckHostError()) return;
        if (_s.Phase == StartupPhase.Fatal) return;

        if (_s.Phase != StartupPhase.Ready)
        {
            UpdateStartup(dt);
            Draw();
            return;
        }

        Update(dt, moveUp != 0, moveDown != 0, actionPressed != 0);
        Draw();
    }
}
