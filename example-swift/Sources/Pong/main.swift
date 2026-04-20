import JavaScriptKit
import JavaScriptEventLoop

// --- Arena ---
let ARENA_W: Double = 900
let ARENA_H: Double = 600
let WALL_THICKNESS: Double = 10

// --- Paddle ---
let PADDLE_W: Double = 20
let PADDLE_H: Double = 120
let PADDLE_SPEED: Double = 500
let AI_SPEED: Double = 350
let PADDLE_X: Double = 50  // distance from left/right edge to paddle center
let PADDLE_PADDING: Double = 10

// --- Ball ---
let BALL_SIZE: Double = 20
let BALL_SPEED: Double = 400

// --- Colors ---
let BG_COLOR = "#0a0a0a"
let FG_COLOR = "#ffffff"
let CENTER_COLOR = "rgba(255,255,255,0.15)"
let SCORE_COLOR = "rgba(255,255,255,0.2)"

// --- State ---
final class GameState {
    var leftY: Double = ARENA_H / 2
    var rightY: Double = ARENA_H / 2
    var ballX: Double = ARENA_W / 2
    var ballY: Double = ARENA_H / 2
    var ballVX: Double
    var ballVY: Double
    var leftScore: Int = 0
    var rightScore: Int = 0
    var lastTime: Double = 0

    init() {
        let len = (1.0 * 1.0 + 0.25 * 0.25).squareRoot()
        ballVX = (1.0 / len) * BALL_SPEED
        ballVY = (0.25 / len) * BALL_SPEED
    }

    func resetBall(towardLeft: Bool) {
        ballX = ARENA_W / 2
        ballY = ARENA_H / 2
        let dx: Double = towardLeft ? -1.0 : 1.0
        let len = (dx * dx + 0.25 * 0.25).squareRoot()
        ballVX = (dx / len) * BALL_SPEED
        ballVY = (0.25 / len) * BALL_SPEED
    }
}

let state = GameState()
var keys: Set<String> = []

@MainActor
func setup() {
    let jsGlobal = JSObject.global
    let document = jsGlobal.document.object!
    let window = jsGlobal

    let canvas = document.getElementById!("game-canvas").object!
    let ctx = canvas.getContext!("2d").object!

    // --- Keyboard input ---
    let keyDownHandler = JSClosure { args -> JSValue in
        guard let event = args.first?.object else { return .undefined }
        if let code = event.code.string {
            keys.insert(code)
        }
        return .undefined
    }
    let keyUpHandler = JSClosure { args -> JSValue in
        guard let event = args.first?.object else { return .undefined }
        if let code = event.code.string {
            keys.remove(code)
        }
        return .undefined
    }
    _ = window.addEventListener!("keydown", keyDownHandler)
    _ = window.addEventListener!("keyup", keyUpHandler)

    // --- Main loop ---
    var frameClosure: JSClosure!
    frameClosure = JSClosure { args -> JSValue in
        let now = args.first?.number ?? 0
        var dt: Double = 0
        if state.lastTime > 0 {
            dt = (now - state.lastTime) / 1000.0
            if dt > 0.1 { dt = 0.1 }
        }
        state.lastTime = now

        movePaddles(dt: dt)
        applyVelocity(dt: dt)
        checkCollisions()
        draw(ctx: ctx)

        _ = window.requestAnimationFrame!(frameClosure)
        return .undefined
    }

    // --- Wavedash SDK ---
    // index.html resolves the WavedashJS promise before init(), so we see the raw SDK here.
    if let sdk = window.WavedashJS.object {
        _ = sdk.updateLoadProgressZeroToOne!(1.0)
        let optsCtor = JSObject.global.Object.function!
        let opts = optsCtor.new()
        opts.debug = .boolean(true)
        _ = sdk.`init`!(opts)
    }
    _ = window.requestAnimationFrame!(frameClosure)
}

// --- Drawing ---
@MainActor
func draw(ctx: JSObject) {
    ctx.fillStyle = .string(BG_COLOR)
    _ = ctx.fillRect!(0, 0, ARENA_W, ARENA_H)

    ctx.fillStyle = .string(CENTER_COLOR)
    _ = ctx.fillRect!(ARENA_W / 2 - 1, 0, 2, ARENA_H)

    ctx.fillStyle = .string(FG_COLOR)
    _ = ctx.fillRect!(0, 0, ARENA_W, WALL_THICKNESS)
    _ = ctx.fillRect!(0, ARENA_H - WALL_THICKNESS, ARENA_W, WALL_THICKNESS)

    _ = ctx.fillRect!(
        PADDLE_X - PADDLE_W / 2,
        state.leftY - PADDLE_H / 2,
        PADDLE_W, PADDLE_H
    )
    _ = ctx.fillRect!(
        ARENA_W - PADDLE_X - PADDLE_W / 2,
        state.rightY - PADDLE_H / 2,
        PADDLE_W, PADDLE_H
    )
    _ = ctx.fillRect!(
        state.ballX - BALL_SIZE / 2,
        state.ballY - BALL_SIZE / 2,
        BALL_SIZE, BALL_SIZE
    )

    ctx.fillStyle = .string(SCORE_COLOR)
    ctx.font = .string("bold 80px sans-serif")
    ctx.textAlign = .string("center")
    ctx.textBaseline = .string("top")
    _ = ctx.fillText!(
        JSValue.string(String(state.leftScore)),
        ARENA_W / 2 - 100,
        WALL_THICKNESS + 20
    )
    _ = ctx.fillText!(
        JSValue.string(String(state.rightScore)),
        ARENA_W / 2 + 100,
        WALL_THICKNESS + 20
    )
}

// --- Update ---
@MainActor
func movePaddles(dt: Double) {
    var leftDir: Double = 0
    if keys.contains("KeyW") { leftDir -= 1 }
    if keys.contains("KeyS") { leftDir += 1 }

    let minY = WALL_THICKNESS + PADDLE_H / 2 + PADDLE_PADDING
    let maxY = ARENA_H - WALL_THICKNESS - PADDLE_H / 2 - PADDLE_PADDING

    state.leftY = max(minY, min(maxY, state.leftY + leftDir * PADDLE_SPEED * dt))

    // Right paddle: simple tracking AI. Move toward ball y, capped at AI_SPEED.
    let dy = state.ballY - state.rightY
    let step = AI_SPEED * dt
    if dy > step {
        state.rightY += step
    } else if dy < -step {
        state.rightY -= step
    } else {
        state.rightY += dy
    }
    state.rightY = max(minY, min(maxY, state.rightY))
}

@MainActor
func applyVelocity(dt: Double) {
    state.ballX += state.ballVX * dt
    state.ballY += state.ballVY * dt
}

@MainActor
func checkCollisions() {
    if state.ballX < -BALL_SIZE {
        state.rightScore += 1
        state.resetBall(towardLeft: true)
        return
    }
    if state.ballX > ARENA_W + BALL_SIZE {
        state.leftScore += 1
        state.resetBall(towardLeft: false)
        return
    }

    let ballTop = state.ballY - BALL_SIZE / 2
    let ballBottom = state.ballY + BALL_SIZE / 2
    if ballTop < WALL_THICKNESS && state.ballVY < 0 {
        state.ballVY = -state.ballVY
    }
    if ballBottom > ARENA_H - WALL_THICKNESS && state.ballVY > 0 {
        state.ballVY = -state.ballVY
    }

    checkPaddle(px: PADDLE_X, py: state.leftY, pw: PADDLE_W, ph: PADDLE_H)
    checkPaddle(px: ARENA_W - PADDLE_X, py: state.rightY, pw: PADDLE_W, ph: PADDLE_H)
}

@MainActor
func checkPaddle(px: Double, py: Double, pw: Double, ph: Double) {
    let halfW = pw / 2
    let halfH = ph / 2
    let halfBall = BALL_SIZE / 2

    let closestX = max(px - halfW, min(state.ballX, px + halfW))
    let closestY = max(py - halfH, min(state.ballY, py + halfH))
    let dx = state.ballX - closestX
    let dy = state.ballY - closestY
    let distSq = dx * dx + dy * dy
    if distSq > halfBall * halfBall { return }

    let offX = state.ballX - px
    let offY = state.ballY - py
    if abs(offX) > abs(offY) {
        if offX < 0 {
            if state.ballVX > 0 { state.ballVX = -state.ballVX }
        } else {
            if state.ballVX < 0 { state.ballVX = -state.ballVX }
        }
    } else {
        if offY > 0 {
            if state.ballVY < 0 { state.ballVY = -state.ballVY }
        } else {
            if state.ballVY > 0 { state.ballVY = -state.ballVY }
        }
    }
}

JavaScriptEventLoop.installGlobalExecutor()
setup()
