import js.Browser;
import js.html.CanvasElement;
import js.html.CanvasRenderingContext2D;
import js.html.KeyboardEvent;

class Main {
    // Arena
    static inline var LEFT_WALL:Float = -450.0;
    static inline var RIGHT_WALL:Float = 450.0;
    static inline var TOP_WALL:Float = 300.0;
    static inline var BOTTOM_WALL:Float = -300.0;
    static inline var WALL_THICKNESS:Float = 10.0;

    // Paddle
    static inline var PADDLE_W:Float = 20.0;
    static inline var PADDLE_H:Float = 120.0;
    static inline var PADDLE_SPEED:Float = 500.0;
    static inline var AI_SPEED:Float = 350.0;
    static inline var PADDLE_X:Float = 400.0;
    static inline var PADDLE_PADDING:Float = 10.0;

    // Ball
    static inline var BALL_SIZE:Float = 20.0;
    static inline var BALL_SPEED:Float = 400.0;

    // Colors
    static inline var BG_COLOR:String = "#0a0a0a";
    static inline var FG_COLOR:String = "#ffffff";
    static inline var SCORE_COLOR:String = "rgba(255,255,255,0.2)";
    static inline var CENTER_COLOR:String = "rgba(255,255,255,0.15)";

    static var canvas:CanvasElement;
    static var ctx:CanvasRenderingContext2D;

    // State
    static var leftY:Float = 0.0;
    static var rightY:Float = 0.0;
    static var ballX:Float = 0.0;
    static var ballY:Float = 0.0;
    static var ballVx:Float = 0.0;
    static var ballVy:Float = 0.0;
    static var leftScore:Int = 0;
    static var rightScore:Int = 0;

    static var keys:Map<String, Bool> = new Map();
    static var lastTime:Float = 0.0;

    static function main() {
        Browser.window.addEventListener("load", onLoad);
    }

    static function onLoad(_) {
        canvas = cast Browser.document.getElementById("gameCanvas");
        ctx = canvas.getContext("2d");

        resize();
        Browser.window.addEventListener("resize", function(_) resize());

        Browser.window.addEventListener("keydown", function(e:KeyboardEvent) {
            if (e.code == "KeyW" || e.code == "KeyS") {
                e.preventDefault();
                keys.set(e.code, true);
            }
        });
        Browser.window.addEventListener("keyup", function(e:KeyboardEvent) {
            if (e.code == "KeyW" || e.code == "KeyS") {
                e.preventDefault();
                keys.set(e.code, false);
            }
        });
        Browser.window.addEventListener("blur", function(_) keys = new Map());

        // Initial ball velocity
        var len = Math.sqrt(1.0 * 1.0 + 0.25 * 0.25);
        ballVx = (1.0 / len) * BALL_SPEED;
        ballVy = (0.25 / len) * BALL_SPEED;

        // Wavedash SDK init
        js.Syntax.code("WavedashJS.updateLoadProgressZeroToOne(1.0)");
        js.Syntax.code("WavedashJS.init({ debug: true })");

        lastTime = Browser.window.performance.now();
        Browser.window.requestAnimationFrame(loop);
    }

    static function resize() {
        var dpr = Browser.window.devicePixelRatio;
        if (dpr == 0) dpr = 1;
        canvas.width = Std.int(Browser.window.innerWidth * dpr);
        canvas.height = Std.int(Browser.window.innerHeight * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    static function loop(now:Float) {
        var dt = (now - lastTime) / 1000.0;
        if (dt > 0.05) dt = 0.05;
        lastTime = now;
        update(dt);
        draw();
        Browser.window.requestAnimationFrame(loop);
    }

    static inline function clamp(v:Float, lo:Float, hi:Float):Float {
        return v < lo ? lo : (v > hi ? hi : v);
    }

    static function movePaddles(dt:Float) {
        var leftDir = 0.0;
        if (keys.exists("KeyW") && keys.get("KeyW")) leftDir += 1.0;
        if (keys.exists("KeyS") && keys.get("KeyS")) leftDir -= 1.0;

        var maxY = TOP_WALL - PADDLE_H / 2.0;
        var minY = BOTTOM_WALL + PADDLE_H / 2.0;

        leftY = clamp(leftY + leftDir * PADDLE_SPEED * dt, minY, maxY);

        // Right paddle: simple tracking AI. Move toward ball y, capped at AI_SPEED.
        var dy = ballY - rightY;
        var step = AI_SPEED * dt;
        if (dy > step) rightY += step;
        else if (dy < -step) rightY -= step;
        else rightY += dy;
        rightY = clamp(rightY, minY, maxY);
    }

    static function applyVelocity(dt:Float) {
        ballX += ballVx * dt;
        ballY += ballVy * dt;
    }

    // Collider box: (cx, cy, half-width, half-height)
    static function collide(cx:Float, cy:Float, hw:Float, hh:Float) {
        var r = BALL_SIZE / 2.0;
        // Closest point on AABB to ball center
        var closestX = clamp(ballX, cx - hw, cx + hw);
        var closestY = clamp(ballY, cy - hh, cy + hh);
        var dx = ballX - closestX;
        var dy = ballY - closestY;
        if (dx * dx + dy * dy > r * r) return;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0 && ballVx > 0) ballVx = -ballVx;
            else if (dx > 0 && ballVx < 0) ballVx = -ballVx;
        } else {
            if (dy > 0 && ballVy < 0) ballVy = -ballVy;
            else if (dy < 0 && ballVy > 0) ballVy = -ballVy;
        }
    }

    static function checkCollisions() {
        // Scoring: past left boundary
        if (ballX < LEFT_WALL - BALL_SIZE) {
            rightScore += 1;
            ballX = 0;
            ballY = 0;
            var len = Math.sqrt(1.0 * 1.0 + 0.25 * 0.25);
            ballVx = (-1.0 / len) * BALL_SPEED;
            ballVy = (0.25 / len) * BALL_SPEED;
            return;
        }
        // Scoring: past right boundary
        if (ballX > RIGHT_WALL + BALL_SIZE) {
            leftScore += 1;
            ballX = 0;
            ballY = 0;
            var len = Math.sqrt(1.0 * 1.0 + 0.25 * 0.25);
            ballVx = (1.0 / len) * BALL_SPEED;
            ballVy = (0.25 / len) * BALL_SPEED;
            return;
        }

        // Paddles
        collide(-PADDLE_X, leftY, PADDLE_W / 2.0, PADDLE_H / 2.0);
        collide(PADDLE_X, rightY, PADDLE_W / 2.0, PADDLE_H / 2.0);
        // Top and bottom walls
        var wallHalfW = (RIGHT_WALL - LEFT_WALL + WALL_THICKNESS) / 2.0;
        collide(0, TOP_WALL, wallHalfW, WALL_THICKNESS / 2.0);
        collide(0, BOTTOM_WALL, wallHalfW, WALL_THICKNESS / 2.0);
    }

    static function update(dt:Float) {
        movePaddles(dt);
        applyVelocity(dt);
        checkCollisions();
    }

    // World coords: x in [LEFT_WALL, RIGHT_WALL], y in [BOTTOM_WALL, TOP_WALL]
    // Camera fits min_width / min_height, letterboxing like Bevy AutoMin.
    static function scale():Float {
        var w = Browser.window.innerWidth;
        var h = Browser.window.innerHeight;
        var minW = RIGHT_WALL - LEFT_WALL + WALL_THICKNESS;
        var minH = TOP_WALL - BOTTOM_WALL + WALL_THICKNESS;
        return Math.min(w / minW, h / minH);
    }

    static inline function toSx(x:Float):Float {
        return Browser.window.innerWidth / 2.0 + x * scale();
    }
    static inline function toSy(y:Float):Float {
        return Browser.window.innerHeight / 2.0 - y * scale();
    }

    static function fillRect(cx:Float, cy:Float, w:Float, h:Float) {
        var s = scale();
        ctx.fillRect(toSx(cx - w / 2.0), toSy(cy + h / 2.0), w * s, h * s);
    }

    static function draw() {
        var w = Browser.window.innerWidth;
        var h = Browser.window.innerHeight;

        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(0, 0, w, h);

        // Center line
        ctx.fillStyle = CENTER_COLOR;
        fillRect(0, 0, 2.0, TOP_WALL - BOTTOM_WALL);

        // Scores
        var s = scale();
        ctx.fillStyle = SCORE_COLOR;
        ctx.font = (80.0 * s) + "px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Std.string(leftScore), toSx(-100.0), toSy(TOP_WALL - 80.0));
        ctx.fillText(Std.string(rightScore), toSx(100.0), toSy(TOP_WALL - 80.0));

        ctx.fillStyle = FG_COLOR;
        // Paddles
        fillRect(-PADDLE_X, leftY, PADDLE_W, PADDLE_H);
        fillRect(PADDLE_X, rightY, PADDLE_W, PADDLE_H);

        // Ball
        fillRect(ballX, ballY, BALL_SIZE, BALL_SIZE);
    }
}
