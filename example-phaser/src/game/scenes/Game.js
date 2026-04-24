import { Scene } from 'phaser';

const PADDLE_W = 14, PADDLE_H = 120, BALL_R = 10;
const PLAYER_SPEED = 540, AI_SPEED = 340;
const START_SPEED_X = 420, START_SPEED_Y = 180;
const MAX_SPEED_X = 780, MAX_SPEED_Y = 520;
const WIN_SCORE = 7;
const PADDLE_INSET = 40;
const PLAYER_CLR = 0x5ce1ff, AI_CLR = 0xffb347, BALL_CLR = 0xf8fafc, LINE_CLR = 0x64748b;

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x111111);

        const W = this.scale.width, H = this.scale.height;

        this.state = {
            playerY: H / 2, aiY: H / 2, aiTargetY: H / 2, aiRetimer: 0,
            ballX: W / 2, ballY: H / 2, ballVx: 0, ballVy: 0,
            pScore: 0, aScore: 0, serving: true, serveDir: 1,
        };

        this.dashes = this.add.graphics();
        this.playerPaddle = this.add.rectangle(PADDLE_INSET, H / 2, PADDLE_W, PADDLE_H, PLAYER_CLR);
        this.aiPaddle     = this.add.rectangle(W - PADDLE_INSET, H / 2, PADDLE_W, PADDLE_H, AI_CLR);
        this.ball         = this.add.rectangle(W / 2, H / 2, BALL_R * 2, BALL_R * 2, BALL_CLR);

        this.playerScoreText = this.add.text(0, 0, '0', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#5ce1ff'
        }).setOrigin(0.5);
        this.aiScoreText = this.add.text(0, 0, '0', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#ffb347'
        }).setOrigin(0.5);

        this.layout(W, H);
        this.scale.on('resize', (size) => this.layout(size.width, size.height));

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S');
    }

    layout (W, H)
    {
        this.dashes.clear();
        this.dashes.fillStyle(LINE_CLR, 0.5);
        for (let y = 30; y < H; y += 32) {
            this.dashes.fillRect(W / 2 - 1, y, 2, 18);
        }
        this.playerScoreText.setPosition(W * 0.35, 60);
        this.aiScoreText.setPosition(W * 0.65, 60);
    }

    update (time, delta)
    {
        const s = this.state;
        const W = this.scale.width, H = this.scale.height;
        const dt = Math.min(delta / 1000, 0.05);

        if (s.serving) {
            s.serving = false;
            s.ballX = W / 2; s.ballY = H / 2;
            s.ballVx = s.serveDir * START_SPEED_X;
            s.ballVy = (Math.random() - 0.5) * START_SPEED_Y * 2;
            if (Math.abs(s.ballVy) < 80) s.ballVy = s.ballVy < 0 ? -100 : 100;
        }

        const up   = this.cursors.up.isDown   || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;
        const dir = (up ? -1 : 0) + (down ? 1 : 0);
        s.playerY = clamp(s.playerY + dir * PLAYER_SPEED * dt, PADDLE_H / 2, H - PADDLE_H / 2);

        if (s.ballVx > 0) {
            s.aiRetimer -= dt;
            if (s.aiRetimer <= 0) {
                s.aiRetimer = 0.18 + Math.random() * 0.17;
                const ttx = (W - PADDLE_INSET - s.ballX) / s.ballVx;
                const proj = s.ballY + s.ballVy * Math.max(ttx, 0);
                s.aiTargetY = clamp(proj + (Math.random() - 0.5) * PADDLE_H * 0.8, PADDLE_H / 2, H - PADDLE_H / 2);
            }
        } else {
            s.aiTargetY = H / 2;
        }
        const aiMove = clamp(s.aiTargetY - s.aiY, -AI_SPEED * dt, AI_SPEED * dt);
        s.aiY = clamp(s.aiY + aiMove, PADDLE_H / 2, H - PADDLE_H / 2);

        s.ballX += s.ballVx * dt;
        s.ballY += s.ballVy * dt;

        if (s.ballY - BALL_R < 0) { s.ballY = BALL_R;     s.ballVy = Math.abs(s.ballVy); }
        if (s.ballY + BALL_R > H) { s.ballY = H - BALL_R; s.ballVy = -Math.abs(s.ballVy); }

        if (s.ballVx < 0 &&
            s.ballX - BALL_R <= PADDLE_INSET + PADDLE_W / 2 && s.ballX - BALL_R >= PADDLE_INSET - PADDLE_W / 2 &&
            s.ballY >= s.playerY - PADDLE_H / 2 && s.ballY <= s.playerY + PADDLE_H / 2) {
            this.bounce(true, W);
        }
        if (s.ballVx > 0 &&
            s.ballX + BALL_R >= W - PADDLE_INSET - PADDLE_W / 2 && s.ballX + BALL_R <= W - PADDLE_INSET + PADDLE_W / 2 &&
            s.ballY >= s.aiY - PADDLE_H / 2 && s.ballY <= s.aiY + PADDLE_H / 2) {
            this.bounce(false, W);
        }

        if (s.ballX < -BALL_R)     { s.aScore++; this.afterScore(W, H); }
        if (s.ballX > W + BALL_R)  { s.pScore++; this.afterScore(W, H); }

        this.playerPaddle.setPosition(PADDLE_INSET, s.playerY);
        this.aiPaddle.setPosition(W - PADDLE_INSET, s.aiY);
        this.ball.setPosition(s.ballX, s.ballY);
    }

    bounce (leftSide, W)
    {
        const s = this.state;
        const paddleY = leftSide ? s.playerY : s.aiY;
        const impact = clamp((s.ballY - paddleY) / (PADDLE_H / 2), -1, 1);
        let sx = Math.min(Math.abs(s.ballVx) * 1.05 + 25, MAX_SPEED_X);
        let sy = clamp(s.ballVy + impact * 230, -MAX_SPEED_Y, MAX_SPEED_Y);
        if (Math.abs(sy) < 80) sy = impact < 0 ? -100 : 100;
        s.ballVx = leftSide ? sx : -sx;
        s.ballVy = sy;
        s.ballX  = leftSide ? PADDLE_INSET + PADDLE_W / 2 + BALL_R : W - PADDLE_INSET - PADDLE_W / 2 - BALL_R;
    }

    afterScore (W, H)
    {
        const s = this.state;
        this.playerScoreText.setText(String(s.pScore));
        this.aiScoreText.setText(String(s.aScore));

        if (s.pScore >= WIN_SCORE || s.aScore >= WIN_SCORE) {
            s.pScore = 0; s.aScore = 0;
            this.playerScoreText.setText('0');
            this.aiScoreText.setText('0');
        }

        s.serveDir = (s.ballX < 0) ? -1 : 1;
        s.playerY = H / 2; s.aiY = H / 2; s.aiTargetY = H / 2; s.aiRetimer = 0;
        s.ballX = W / 2; s.ballY = H / 2; s.ballVx = 0; s.ballVy = 0;
        s.serving = true;
    }
}
