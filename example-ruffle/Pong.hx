import flash.display.Sprite;
import flash.events.Event;
import flash.events.KeyboardEvent;
import flash.ui.Keyboard;
import flash.text.TextField;
import flash.text.TextFormat;
import flash.text.TextFormatAlign;

class Pong extends Sprite {
    static inline var W = 900.0;
    static inline var H = 600.0;
    static inline var PW = 15.0;
    static inline var PH = 100.0;
    static inline var BS = 15.0;
    static inline var EDGE = 50.0;
    static inline var PSPD = 500.0;
    static inline var ASPD = 350.0;
    static inline var BSPD = 400.0;

    var leftY  = H/2 - PH/2;
    var rightY = H/2 - PH/2;
    var bx     = W/2 - BS/2;
    var by     = H/2 - BS/2;
    var bvx    = BSPD;
    var bvy    = BSPD * 0.25;
    var ls = 0;
    var rs = 0;
    var upDown   = false;
    var downDown = false;
    var prev     = 0.0;

    var canvas:Sprite;
    var scoreTf:TextField;

    public function new() {
        super();

        canvas = new Sprite();
        addChild(canvas);

        var fmt = new TextFormat("_sans", 48, 0x33FFFFFF, true);
        fmt.align = TextFormatAlign.CENTER;
        scoreTf = new TextField();
        scoreTf.defaultTextFormat = fmt;
        scoreTf.width  = W;
        scoreTf.height = 80;
        scoreTf.x = 0; scoreTf.y = 10;
        scoreTf.selectable = false;
        scoreTf.text = "0     0";
        addChild(scoreTf);

        prev = flash.Lib.getTimer();
        addEventListener(Event.ADDED_TO_STAGE, onAddedToStage);
    }

    function onAddedToStage(_:Event) {
        removeEventListener(Event.ADDED_TO_STAGE, onAddedToStage);
        stage.addEventListener(KeyboardEvent.KEY_DOWN, onKD);
        stage.addEventListener(KeyboardEvent.KEY_UP,   onKU);
        addEventListener(Event.ENTER_FRAME, onFrame);
    }

    function onKD(e:KeyboardEvent) {
        if (e.keyCode == Keyboard.W || e.keyCode == Keyboard.UP)   upDown   = true;
        if (e.keyCode == Keyboard.S || e.keyCode == Keyboard.DOWN) downDown = true;
    }
    function onKU(e:KeyboardEvent) {
        if (e.keyCode == Keyboard.W || e.keyCode == Keyboard.UP)   upDown   = false;
        if (e.keyCode == Keyboard.S || e.keyCode == Keyboard.DOWN) downDown = false;
    }

    function clamp(v:Float, lo:Float, hi:Float) return Math.max(lo, Math.min(hi, v));

    function resetBall(dir:Float) {
        bx = W/2 - BS/2; by = H/2 - BS/2;
        bvx = BSPD * dir; bvy = BSPD * 0.25;
    }

    function onFrame(_:Event) {
        var now = flash.Lib.getTimer();
        var dt  = (now - prev) / 1000.0;
        prev = now;

        if (upDown)   leftY -= PSPD * dt;
        if (downDown) leftY += PSPD * dt;
        leftY = clamp(leftY, 0, H - PH);

        var target = by - PH/2;
        var diff   = target - rightY;
        var step   = ASPD * dt;
        rightY += (Math.abs(diff) < step) ? diff : (diff > 0 ? step : -step);
        rightY = clamp(rightY, 0, H - PH);

        bx += bvx * dt; by += bvy * dt;
        if (by < 0)        { by = 0;        bvy = -bvy; }
        if (by > H - BS)   { by = H - BS;   bvy = -bvy; }

        // Left paddle
        if (bvx < 0 && bx < EDGE+PW && bx+BS > EDGE && by+BS > leftY && by < leftY+PH) {
            bx = EDGE+PW; bvx = -bvx;
        }
        // Right paddle
        var rx = W - EDGE - PW;
        if (bvx > 0 && bx+BS > rx && bx < rx+PW && by+BS > rightY && by < rightY+PH) {
            bx = rx - BS; bvx = -bvx;
        }

        if (bx+BS < 0) { rs++; resetBall(1);  updateScore(); }
        if (bx > W)    { ls++; resetBall(-1); updateScore(); }

        draw();
    }

    function updateScore() {
        scoreTf.text = ls + "     " + rs;
    }

    function draw() {
        var g = canvas.graphics;
        g.clear();

        // Background
        g.beginFill(0x0A0A0A); g.drawRect(0, 0, W, H); g.endFill();

        // Center line
        g.beginFill(0xFFFFFF, 0.15);
        var i = 0; while (i < H) { g.drawRect(W/2-1, i, 2, 10); i += 20; }
        g.endFill();

        // Paddles + ball
        g.beginFill(0xFFFFFF);
        g.drawRect(EDGE,         leftY,  PW, PH);
        g.drawRect(W-EDGE-PW,   rightY, PW, PH);
        g.drawRect(bx, by, BS, BS);
        g.endFill();
    }

    static public function main() { flash.Lib.current.addChild(new Pong()); }
}
