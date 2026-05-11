import JavaScriptKit
import JavaScriptEventLoop

// --- Arena ---
nonisolated(unsafe) var ARENA_W: Double = 900
nonisolated(unsafe) var ARENA_H: Double = 600

// --- Paddle ---
let PADDLE_W: Double = 20
let PADDLE_H: Double = 120
let PADDLE_SPEED: Double = 500
let AI_SPEED: Double = 350
let PADDLE_X: Double = 50  // distance from left/right edge to paddle center

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

    // --- Resize ---
    let resizeClosure = JSClosure { _ -> JSValue in
        resize(canvas: canvas, ctx: ctx)
        return .undefined
    }
    _ = window.addEventListener!("resize", resizeClosure)
    resize(canvas: canvas, ctx: ctx)

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
        step(dt: dt)
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

// --- Resize ---
@MainActor
func resize(canvas: JSObject, ctx: JSObject) {
    let jsGlobal = JSObject.global
    let dpr = jsGlobal.devicePixelRatio.number ?? 1.0
    let w = jsGlobal.innerWidth.number ?? ARENA_W
    let h = jsGlobal.innerHeight.number ?? ARENA_H

    canvas.width = .number(w * dpr)
    canvas.height = .number(h * dpr)
    _ = ctx.setTransform!(dpr, 0, 0, dpr, 0, 0)

    let oldW = ARENA_W
    let oldH = ARENA_H
    ARENA_W = w
    ARENA_H = h

    let halfPad = PADDLE_H / 2
    state.leftY = max(halfPad, min(ARENA_H - halfPad, state.leftY * (h / oldH)))
    state.rightY = max(halfPad, min(ARENA_H - halfPad, state.rightY * (h / oldH)))
    let halfBall = BALL_SIZE / 2
    state.ballX = max(halfBall, min(ARENA_W - halfBall, state.ballX * (w / oldW)))
    state.ballY = max(halfBall, min(ARENA_H - halfBall, state.ballY * (h / oldH)))
}

// --- Drawing ---
@MainActor
func draw(ctx: JSObject) {
    ctx.fillStyle = .string(BG_COLOR)
    _ = ctx.fillRect!(0, 0, ARENA_W, ARENA_H)

    ctx.fillStyle = .string(CENTER_COLOR)
    _ = ctx.fillRect!(ARENA_W / 2 - 1, 0, 2, ARENA_H)

    ctx.fillStyle = .string(FG_COLOR)
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
        20
    )
    _ = ctx.fillText!(
        JSValue.string(String(state.rightScore)),
        ARENA_W / 2 + 100,
        20
    )
}

// --- Update ---
@MainActor
func movePaddles(dt: Double) {
    var leftDir: Double = 0
    if keys.contains("KeyW") { leftDir -= 1 }
    if keys.contains("KeyS") { leftDir += 1 }

    let minY = PADDLE_H / 2
    let maxY = ARENA_H - PADDLE_H / 2

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
func step(dt: Double) {
    let half = BALL_SIZE / 2
    let prevX = state.ballX
    let prevY = state.ballY
    var newX = prevX + state.ballVX * dt
    var newY = prevY + state.ballVY * dt

    // Swept paddle collision along X
    if state.ballVX < 0 {
        let face = PADDLE_X + PADDLE_W / 2
        let leftPrev = prevX - half
        let leftNew = newX - half
        if leftPrev >= face && leftNew <= face {
            let t = (leftPrev - face) / (leftPrev - leftNew)
            let yAtHit = prevY + (newY - prevY) * t
            let halfPad = PADDLE_H / 2
            if yAtHit >= state.leftY - halfPad - half
                && yAtHit <= state.leftY + halfPad + half {
                bouncePaddle(paddleY: state.leftY, hitY: yAtHit, dirX: 1)
                let restDt = dt * (1 - t)
                newX = face + half + state.ballVX * restDt
                newY = yAtHit + state.ballVY * restDt
            }
        }
    } else if state.ballVX > 0 {
        let face = ARENA_W - PADDLE_X - PADDLE_W / 2
        let rightPrev = prevX + half
        let rightNew = newX + half
        if rightPrev <= face && rightNew >= face {
            let t = (face - rightPrev) / (rightNew - rightPrev)
            let yAtHit = prevY + (newY - prevY) * t
            let halfPad = PADDLE_H / 2
            if yAtHit >= state.rightY - halfPad - half
                && yAtHit <= state.rightY + halfPad + half {
                bouncePaddle(paddleY: state.rightY, hitY: yAtHit, dirX: -1)
                let restDt = dt * (1 - t)
                newX = face - half + state.ballVX * restDt
                newY = yAtHit + state.ballVY * restDt
            }
        }
    }

    // Top/bottom arena bounce
    if newY - half < 0 && state.ballVY < 0 {
        newY = half + (half - newY)
        state.ballVY = -state.ballVY
    } else if newY + half > ARENA_H && state.ballVY > 0 {
        let overshoot = (newY + half) - ARENA_H
        newY = ARENA_H - half - overshoot
        state.ballVY = -state.ballVY
    }

    state.ballX = newX
    state.ballY = newY

    if state.ballX < -BALL_SIZE {
        state.rightScore += 1
        state.resetBall(towardLeft: true)
    } else if state.ballX > ARENA_W + BALL_SIZE {
        state.leftScore += 1
        state.resetBall(towardLeft: false)
    }
}

@MainActor
func bouncePaddle(paddleY: Double, hitY: Double, dirX: Double) {
    // sin(60°) ≈ 0.866 — max return angle from horizontal
    let maxSin = 0.866
    var offsetNorm = (hitY - paddleY) / (PADDLE_H / 2)
    if offsetNorm > 1 { offsetNorm = 1 }
    if offsetNorm < -1 { offsetNorm = -1 }
    let vy = offsetNorm * maxSin * BALL_SPEED
    let vxMag = (BALL_SPEED * BALL_SPEED - vy * vy).squareRoot()
    state.ballVX = dirX * vxMag
    state.ballVY = vy
}

JavaScriptEventLoop.installGlobalExecutor()
setup()
