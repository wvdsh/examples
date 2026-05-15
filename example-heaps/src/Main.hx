import h2d.Graphics;
import h2d.Text;

class Main extends hxd.App {
    // --- Arena ---
    static inline var W:Float = 1600.0;
    static inline var H:Float = 900.0;

    // --- Paddle ---
    static inline var PADDLE_W:Float = 20.0;
    static inline var PADDLE_H:Float = 120.0;
    static inline var PADDLE_SPEED:Float = 500.0;
    static inline var AI_SPEED:Float = 350.0;
    static inline var PADDLE_X_MARGIN:Float = 120.0;

    // --- Ball ---
    static inline var BALL:Float = 20.0;
    static inline var BALL_SPEED:Float = 400.0;

    var gfx:Graphics;
    var leftScoreText:Text;
    var rightScoreText:Text;

    var leftY:Float = 0;
    var rightY:Float = 0;
    var ballX:Float = 0;
    var ballY:Float = 0;
    var ballVx:Float = 0;
    var ballVy:Float = 0;
    var leftScore:Int = 0;
    var rightScore:Int = 0;

    override function init() {
        // Wavedash SDK
        js.Syntax.code("WavedashJS.updateLoadProgressZeroToOne(1.0)");
        js.Syntax.code("WavedashJS.init({ debug: true })");

        // Design resolution: 1600x900, letterboxed.
        engine.backgroundColor = 0xFF0A0A0A;
        s2d.scaleMode = ScaleMode.LetterBox(Std.int(W), Std.int(H));

        gfx = new Graphics(s2d);

        // Score text — large, translucent white, centered above each half.
        var font = hxd.res.DefaultFont.get();
        leftScoreText = new Text(font, s2d);
        rightScoreText = new Text(font, s2d);
        for (t in [leftScoreText, rightScoreText]) {
            t.textColor = 0x333333;
            t.scale(4.0);
            t.textAlign = Center;
        }
        leftScoreText.x = W / 2 - 100;
        leftScoreText.y = 40;
        rightScoreText.x = W / 2 + 100;
        rightScoreText.y = 40;
        updateScoreText();

        leftY = H / 2;
        rightY = H / 2;
        resetBall(1.0);
    }

    function resetBall(dir:Float) {
        ballX = W / 2;
        ballY = H / 2;
        var norm = Math.sqrt(dir * dir + 0.25 * 0.25);
        ballVx = dir / norm * BALL_SPEED;
        ballVy = 0.25 / norm * BALL_SPEED;
    }

    function updateScoreText() {
        leftScoreText.text = Std.string(leftScore);
        rightScoreText.text = Std.string(rightScore);
    }

    inline function clamp(v:Float, lo:Float, hi:Float):Float
        return v < lo ? lo : (v > hi ? hi : v);

    override function update(dt:Float) {
        var minY = PADDLE_H / 2;
        var maxY = H - PADDLE_H / 2;

        // Left paddle: W/S
        var leftDir = 0.0;
        if (hxd.Key.isDown(hxd.Key.W)) leftDir -= 1.0;
        if (hxd.Key.isDown(hxd.Key.S)) leftDir += 1.0;
        leftY = clamp(leftY + leftDir * PADDLE_SPEED * dt, minY, maxY);

        // Right paddle: tracking AI
        var dy = ballY - rightY;
        var step = AI_SPEED * dt;
        rightY = clamp(rightY + (Math.abs(dy) < step ? dy : (dy > 0 ? step : -step)), minY, maxY);

        // Ball
        ballX += ballVx * dt;
        ballY += ballVy * dt;

        // Top / bottom bounce
        if (ballY < BALL / 2 && ballVy < 0) ballVy = -ballVy;
        if (ballY > H - BALL / 2 && ballVy > 0) ballVy = -ballVy;

        // Paddles: always flip vx on hit (avoids edge-tunneling when paddle moves into ball)
        function hit(px:Float, py:Float):Bool {
            return Math.abs(ballX - px) < (PADDLE_W + BALL) / 2
                && Math.abs(ballY - py) < (PADDLE_H + BALL) / 2;
        }
        if (hit(PADDLE_X_MARGIN, leftY) && ballVx < 0) {
            ballVx = -ballVx;
            ballX = PADDLE_X_MARGIN + (PADDLE_W + BALL) / 2;
        }
        if (hit(W - PADDLE_X_MARGIN, rightY) && ballVx > 0) {
            ballVx = -ballVx;
            ballX = (W - PADDLE_X_MARGIN) - (PADDLE_W + BALL) / 2;
        }

        // Scoring
        if (ballX < -BALL) {
            rightScore++;
            updateScoreText();
            resetBall(-1.0);
        } else if (ballX > W + BALL) {
            leftScore++;
            updateScoreText();
            resetBall(1.0);
        }

        // Render — clear every frame and redraw.
        gfx.clear();
        gfx.beginFill(0xFFFFFF);
        // Paddles
        gfx.drawRect(PADDLE_X_MARGIN - PADDLE_W / 2, leftY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
        gfx.drawRect((W - PADDLE_X_MARGIN) - PADDLE_W / 2, rightY - PADDLE_H / 2, PADDLE_W, PADDLE_H);
        // Ball
        gfx.drawRect(ballX - BALL / 2, ballY - BALL / 2, BALL, BALL);
        gfx.endFill();
    }

    static function main() {
        new Main();
    }
}
