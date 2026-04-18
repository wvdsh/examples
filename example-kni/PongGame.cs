using System;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace Pong
{
    public class PongGame : Game
    {
        const int FieldW = 960;
        const int FieldH = 540;
        const int PaddleW = 18;
        const int PaddleH = 108;
        const int BallSize = 16;
        const int PlayerX = 40;
        const int WinScore = 7;
        const float PlayerSpeed = 520f;
        const float AiSpeed = 430f;
        const float StartBallSpeedX = 360f;
        const float StartBallSpeedY = 180f;
        const float MaxBallSpeedX = 820f;
        const float MaxBallSpeedY = 560f;

        readonly GraphicsDeviceManager _graphics;

        SpriteBatch _spriteBatch;
        Texture2D _pixel;

        Vector2 _playerPos;
        Vector2 _aiPos;
        Vector2 _ballPos;
        Vector2 _ballVel;
        float _aiTargetY;
        float _aiRetargetIn;

        int _playerScore;
        int _aiScore;
        int _serveDirection = 1;
        bool _serving = true;
        bool _matchOver;
        Random _rng = new Random();

        public PongGame()
        {
            _graphics = new GraphicsDeviceManager(this)
            {
                PreferredBackBufferWidth = FieldW,
                PreferredBackBufferHeight = FieldH,
            };
            Content.RootDirectory = "Content";
            IsMouseVisible = true;
        }

        protected override void Initialize()
        {
            ResetMatch();
            StartServe();
            base.Initialize();
        }

        protected override void LoadContent()
        {
            _spriteBatch = new SpriteBatch(GraphicsDevice);
            _pixel = new Texture2D(GraphicsDevice, 1, 1);
            _pixel.SetData(new[] { Color.White });
        }

        void ResetMatch()
        {
            _playerScore = 0;
            _aiScore = 0;
            _matchOver = false;
            _serveDirection = _rng.NextDouble() < 0.5 ? -1 : 1;
            PrepareServe();
        }

        void PrepareServe()
        {
            _playerPos = new Vector2(PlayerX, (FieldH - PaddleH) / 2f);
            _aiPos = new Vector2(FieldW - PaddleW - PlayerX, (FieldH - PaddleH) / 2f);
            _ballPos = new Vector2((FieldW - BallSize) / 2f, (FieldH - BallSize) / 2f);
            _ballVel = Vector2.Zero;
            _aiTargetY = FieldH / 2f;
            _aiRetargetIn = 0f;
            _serving = true;
        }

        void StartServe()
        {
            _serving = false;
            float vy = (float)(_rng.NextDouble() * 2 - 1) * StartBallSpeedY;
            if (Math.Abs(vy) < 70f) vy = vy < 0 ? -90f : 90f;
            _ballVel = new Vector2(_serveDirection * StartBallSpeedX, vy);
        }

        protected override void Update(GameTime gameTime)
        {
            float dt = MathHelper.Min(0.033f, (float)gameTime.ElapsedGameTime.TotalSeconds);
            var kb = Keyboard.GetState();

            if (kb.IsKeyDown(Keys.Escape))
            {
                try { Exit(); } catch (PlatformNotSupportedException) { }
            }

            if (_matchOver && (kb.IsKeyDown(Keys.Space) || kb.IsKeyDown(Keys.Enter)))
            {
                ResetMatch();
                StartServe();
            }
            else if (_serving)
            {
                StartServe();
            }

            UpdatePlayer(dt, kb);
            UpdateAi(dt);
            UpdateBall(dt);

            base.Update(gameTime);
        }

        void UpdatePlayer(float dt, KeyboardState kb)
        {
            float dir = 0f;
            if (kb.IsKeyDown(Keys.W) || kb.IsKeyDown(Keys.Up)) dir -= 1f;
            if (kb.IsKeyDown(Keys.S) || kb.IsKeyDown(Keys.Down)) dir += 1f;
            _playerPos.Y = MathHelper.Clamp(_playerPos.Y + dir * PlayerSpeed * dt, 0, FieldH - PaddleH);
        }

        void UpdateAi(float dt)
        {
            if (!_serving && !_matchOver && _ballVel.X > 0)
            {
                _aiRetargetIn -= dt;
                if (_aiRetargetIn <= 0f)
                {
                    float ballCy = _ballPos.Y + BallSize / 2f;
                    float dx = _aiPos.X - (_ballPos.X + BallSize / 2f);
                    float lead = _ballVel.X > 0f && dx > 0f ? dx / _ballVel.X : 0f;
                    float projected = ballCy + _ballVel.Y * lead;
                    float miss = PaddleH * (float)(0.18 + _rng.NextDouble() * 0.32);
                    _aiRetargetIn = 0.08f + (float)_rng.NextDouble() * 0.09f;
                    _aiTargetY = projected + ((float)_rng.NextDouble() * 2f - 1f) * miss;
                }
            }
            else
            {
                _aiRetargetIn = 0f;
                _aiTargetY = FieldH / 2f;
            }

            float aiCenter = _aiPos.Y + PaddleH / 2f;
            float move = MathHelper.Clamp(_aiTargetY - aiCenter, -AiSpeed * dt, AiSpeed * dt);
            _aiPos.Y = MathHelper.Clamp(_aiPos.Y + move, 0, FieldH - PaddleH);
        }

        void UpdateBall(float dt)
        {
            if (_serving || _matchOver) return;

            _ballPos += _ballVel * dt;

            if (_ballPos.Y <= 0f)
            {
                _ballPos.Y = 0f;
                _ballVel.Y = Math.Abs(_ballVel.Y);
            }
            else if (_ballPos.Y + BallSize >= FieldH)
            {
                _ballPos.Y = FieldH - BallSize;
                _ballVel.Y = -Math.Abs(_ballVel.Y);
            }

            var ballRect = new Rectangle((int)_ballPos.X, (int)_ballPos.Y, BallSize, BallSize);
            var playerRect = new Rectangle((int)_playerPos.X, (int)_playerPos.Y, PaddleW, PaddleH);
            var aiRect = new Rectangle((int)_aiPos.X, (int)_aiPos.Y, PaddleW, PaddleH);

            if (_ballVel.X < 0 && ballRect.Intersects(playerRect))
            {
                BounceFromPaddle(true);
            }
            else if (_ballVel.X > 0 && ballRect.Intersects(aiRect))
            {
                BounceFromPaddle(false);
            }

            if (_ballPos.X + BallSize < 0) AwardPoint(false);
            else if (_ballPos.X > FieldW) AwardPoint(true);
        }

        void BounceFromPaddle(bool leftSide)
        {
            float paddleY = leftSide ? _playerPos.Y : _aiPos.Y;
            float paddleX = leftSide ? _playerPos.X : _aiPos.X;
            float impact = MathHelper.Clamp(((_ballPos.Y + BallSize / 2f) - (paddleY + PaddleH / 2f)) / (PaddleH / 2f), -1f, 1f);

            float nextVx = MathHelper.Min(Math.Abs(_ballVel.X) * 1.05f + 22f, MaxBallSpeedX);
            float nextVy = MathHelper.Clamp(_ballVel.Y + impact * 250f, -MaxBallSpeedY, MaxBallSpeedY);
            if (Math.Abs(nextVy) < 80f) nextVy = impact < 0 ? -100f : 100f;
            nextVy += ((float)_rng.NextDouble() * 2f - 1f) * 22f;

            if (leftSide)
            {
                _ballPos.X = paddleX + PaddleW;
                _ballVel = new Vector2(nextVx, nextVy);
            }
            else
            {
                _ballPos.X = paddleX - BallSize;
                _ballVel = new Vector2(-nextVx, nextVy);
            }
        }

        void AwardPoint(bool playerScored)
        {
            if (playerScored)
            {
                _playerScore++;
                if (_playerScore >= WinScore) { _matchOver = true; _ballVel = Vector2.Zero; return; }
                _serveDirection = 1;
            }
            else
            {
                _aiScore++;
                if (_aiScore >= WinScore) { _matchOver = true; _ballVel = Vector2.Zero; return; }
                _serveDirection = -1;
            }
            PrepareServe();
        }

        protected override void Draw(GameTime gameTime)
        {
            GraphicsDevice.Clear(new Color(3, 7, 18));

            _spriteBatch.Begin();

            for (int y = 28; y < FieldH - 28; y += 32)
            {
                DrawRect(FieldW / 2 - 3, y, 6, 18, new Color(119, 138, 160, 110));
            }

            DrawRect(0, 0, FieldW, 6, new Color(8, 15, 36));
            DrawRect(0, FieldH - 6, FieldW, 6, new Color(8, 15, 36));

            DrawRect((int)_playerPos.X, (int)_playerPos.Y, PaddleW, PaddleH, new Color(92, 227, 255));
            DrawRect((int)_aiPos.X, (int)_aiPos.Y, PaddleW, PaddleH, new Color(255, 181, 71));
            DrawRect((int)_ballPos.X, (int)_ballPos.Y, BallSize, BallSize, Color.White);

            DrawDigit(_playerScore, FieldW / 2 - 100, 32, new Color(230, 244, 255));
            DrawDigit(_aiScore, FieldW / 2 + 64, 32, new Color(255, 237, 213));

            _spriteBatch.End();

            base.Draw(gameTime);
        }

        void DrawRect(int x, int y, int w, int h, Color c)
        {
            _spriteBatch.Draw(_pixel, new Rectangle(x, y, w, h), c);
        }

        // Block digit renderer (7-segment). Avoids needing a font in the Content Pipeline.
        static readonly bool[][] Segments =
        {
            new[]{true,true,true,false,true,true,true},
            new[]{false,false,true,false,false,true,false},
            new[]{true,false,true,true,true,false,true},
            new[]{true,false,true,true,false,true,true},
            new[]{false,true,true,true,false,true,false},
            new[]{true,true,false,true,false,true,true},
            new[]{true,true,false,true,true,true,true},
            new[]{true,false,true,false,false,true,false},
            new[]{true,true,true,true,true,true,true},
            new[]{true,true,true,true,false,true,true},
        };

        void DrawDigit(int digit, int x, int y, Color color)
        {
            digit = MathHelper.Clamp(digit, 0, 9);
            var s = Segments[digit];
            const int w = 36, h = 56, t = 6;
            if (s[0]) DrawRect(x, y, w, t, color);
            if (s[1]) DrawRect(x, y, t, h / 2, color);
            if (s[2]) DrawRect(x + w - t, y, t, h / 2, color);
            if (s[3]) DrawRect(x, y + h / 2 - t / 2, w, t, color);
            if (s[4]) DrawRect(x, y + h / 2, t, h / 2, color);
            if (s[5]) DrawRect(x + w - t, y + h / 2, t, h / 2, color);
            if (s[6]) DrawRect(x, y + h - t, w, t, color);
        }
    }
}
