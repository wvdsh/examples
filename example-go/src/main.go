package main

import (
	"math"
	"math/rand"
	"strconv"
	"syscall/js"
)

const (
	winScore        = 7
	fieldWidth      = 16.0
	fieldHeight     = 9.0
	paddleWidth     = 0.32
	paddleHeight    = 1.95
	ballSize        = 0.32
	playerSpeed     = 9.2
	aiSpeed         = 5.5
	startBallSpeedX = 6.7
	startBallSpeedY = 2.8
	maxBallSpeedX   = 12.5
	maxBallSpeedY   = 8.5

	playerX = -(fieldWidth * 0.5) + 0.9
	aiX     = (fieldWidth * 0.5) - 0.9

	boardColor  = "#e8e4df"
	railColor   = "#c8c3bc"
	dashColor   = "rgba(176, 170, 162, 0.65)"
	playerColor = "#3b82f6"
	aiColor     = "#ef4444"
	ballColor   = "#1e293b"
	bgColor     = "#f5f1ec"
)

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

func clamp(value, lo, hi float64) float64 {
	return math.Max(lo, math.Min(hi, value))
}

func randomRange(lo, hi float64) float64 {
	return lo + rand.Float64()*(hi-lo)
}

func reflectY(value, minY, maxY float64) float64 {
	v := value
	for i := 0; (v < minY || v > maxY) && i < 8; i++ {
		if v < minY {
			v = minY + (minY - v)
		} else {
			v = maxY - (v - maxY)
		}
	}
	return clamp(v, minY, maxY)
}

func dpr() float64 {
	v := js.Global().Get("devicePixelRatio")
	if v.IsUndefined() || v.IsNull() {
		return 1
	}
	f := v.Float()
	if f <= 0 {
		return 1
	}
	return f
}

func log(msg string) {
	js.Global().Get("console").Call("info", "[example-go] "+msg)
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

var document js.Value

func init() {
	document = js.Global().Get("document")
}

func style(el js.Value, props map[string]string) js.Value {
	s := el.Get("style")
	for k, v := range props {
		s.Set(k, v)
	}
	return el
}

func ensureTarget() js.Value {
	target := document.Call("getElementById", "wavedash-target")
	if target.IsNull() {
		target = document.Call("createElement", "div")
		target.Set("id", "wavedash-target")
		document.Get("body").Call("appendChild", target)
	}

	style(document.Get("documentElement"), map[string]string{
		"width": "100%", "height": "100%", "margin": "0", "background": bgColor,
	})
	style(document.Get("body"), map[string]string{
		"width": "100%", "height": "100%", "margin": "0", "overflow": "hidden",
		"background": bgColor, "color": "#1e293b",
		"fontFamily": `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
	})
	style(target, map[string]string{
		"position": "relative", "width": "100%", "height": "100%", "overflow": "hidden",
	})
	return target
}

type shell struct {
	canvas      js.Value
	playerScore js.Value
	aiScore     js.Value
}

func createShell(target js.Value) shell {
	target.Call("replaceChildren")

	canvasWrap := style(document.Call("createElement", "div"), map[string]string{
		"position": "absolute", "inset": "0", "width": "100%", "height": "100%",
	})

	canvas := style(document.Call("createElement", "canvas"), map[string]string{
		"display": "block", "width": "100%", "height": "100%",
	})
	canvasWrap.Call("appendChild", canvas)

	hud := style(document.Call("createElement", "div"), map[string]string{
		"position": "absolute", "inset": "0", "pointerEvents": "none", "zIndex": "2",
	})

	scoreBoard := style(document.Call("createElement", "div"), map[string]string{
		"position": "absolute", "top": "10px", "left": "50%",
		"transform": "translateX(-50%)", "display": "flex", "alignItems": "center",
		"gap": "14px", "padding": "6px 14px", "borderRadius": "14px",
		"border": "1px solid rgba(30, 41, 59, 0.15)",
		"background": "rgba(255, 255, 255, 0.7)", "backdropFilter": "blur(14px)",
	})

	pScore := style(document.Call("createElement", "div"), map[string]string{
		"fontSize": "24px", "fontWeight": "800", "lineHeight": "1",
		"color": "#3b82f6", "minWidth": "28px", "textAlign": "center",
	})
	pScore.Set("textContent", "0")

	divider := style(document.Call("createElement", "div"), map[string]string{
		"fontSize": "18px", "fontWeight": "700", "color": "#94a3b8",
	})
	divider.Set("textContent", ":")

	aScore := style(document.Call("createElement", "div"), map[string]string{
		"fontSize": "24px", "fontWeight": "800", "lineHeight": "1",
		"color": "#ef4444", "minWidth": "28px", "textAlign": "center",
	})
	aScore.Set("textContent", "0")

	scoreBoard.Call("append", pScore, divider, aScore)
	hud.Call("append", scoreBoard)
	target.Call("append", canvasWrap, hud)

	return shell{canvas: canvas, playerScore: pScore, aiScore: aScore}
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

type inputState struct {
	up   bool
	down bool
}

func wireInput(input *inputState) {
	upCodes := map[string]bool{"KeyW": true, "ArrowUp": true}
	downCodes := map[string]bool{"KeyS": true, "ArrowDown": true}

	js.Global().Call("addEventListener", "keydown",
		js.FuncOf(func(_ js.Value, args []js.Value) any {
			event := args[0]
			code := event.Get("code").String()
			if upCodes[code] {
				input.up = true
				event.Call("preventDefault")
			}
			if downCodes[code] {
				input.down = true
				event.Call("preventDefault")
			}
			return nil
		}))

	js.Global().Call("addEventListener", "keyup",
		js.FuncOf(func(_ js.Value, args []js.Value) any {
			event := args[0]
			code := event.Get("code").String()
			if upCodes[code] {
				input.up = false
				event.Call("preventDefault")
			}
			if downCodes[code] {
				input.down = false
				event.Call("preventDefault")
			}
			return nil
		}))

	js.Global().Call("addEventListener", "blur",
		js.FuncOf(func(_ js.Value, _ []js.Value) any {
			input.up = false
			input.down = false
			return nil
		}))
}

// ---------------------------------------------------------------------------
// Pong game
// ---------------------------------------------------------------------------

type pongGame struct {
	canvas        js.Value
	ctx           js.Value
	playerScoreEl js.Value
	aiScoreEl     js.Value

	running      bool
	input        *inputState
	pixelsPerUnit float64
	centerX      float64
	centerY      float64
	lastTime     float64

	mode           string
	serveDirection float64
	playerScore    int
	aiScore        int
	playerY        float64
	aiY            float64
	aiTargetY      float64
	aiRetargetIn   float64
	ballX          float64
	ballY          float64
	ballVx         float64
	ballVy         float64
}

func newPongGame(canvas, playerScoreEl, aiScoreEl js.Value) *pongGame {
	ctx := canvas.Call("getContext", "2d")
	if ctx.IsNull() || ctx.IsUndefined() {
		panic("Canvas 2D context not available.")
	}
	return &pongGame{
		canvas:        canvas,
		ctx:           ctx,
		playerScoreEl: playerScoreEl,
		aiScoreEl:     aiScoreEl,
		mode:          "serve",
		serveDirection: 1,
	}
}

func (g *pongGame) setup() {
	g.recalcScale()
	g.restartMatch()
	g.draw()

	js.Global().Call("addEventListener", "resize",
		js.FuncOf(func(_ js.Value, _ []js.Value) any {
			g.recalcScale()
			g.draw()
			return nil
		}))
}

func (g *pongGame) start(input *inputState) {
	g.input = input
	g.running = true
	g.lastTime = js.Global().Get("performance").Call("now").Float()

	var loopFn js.Func
	loopFn = js.FuncOf(func(_ js.Value, args []js.Value) any {
		if !g.running || g.input == nil {
			return nil
		}

		now := args[0].Float()
		dt := math.Min(0.05, (now-g.lastTime)/1000)
		g.lastTime = now

		g.step(dt)
		g.draw()
		g.syncHud()

		js.Global().Call("requestAnimationFrame", loopFn)
		return nil
	})
	js.Global().Call("requestAnimationFrame", loopFn)
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

func (g *pongGame) recalcScale() {
	parent := g.canvas.Get("parentElement")
	if parent.IsNull() || parent.IsUndefined() {
		return
	}

	w := parent.Get("clientWidth").Float()
	h := parent.Get("clientHeight").Float()
	d := dpr()

	g.canvas.Set("width", int(w*d))
	g.canvas.Set("height", int(h*d))
	g.canvas.Get("style").Set("width", strconv.Itoa(int(w))+"px")
	g.canvas.Get("style").Set("height", strconv.Itoa(int(h))+"px")
	g.ctx.Call("setTransform", d, 0, 0, d, 0, 0)

	g.pixelsPerUnit = math.Min(w/(fieldWidth+1.4), h/(fieldHeight+1.4))
	g.centerX = w * 0.5
	g.centerY = h * 0.5
}

func (g *pongGame) toScreenX(gameX float64) float64 {
	return g.centerX + gameX*g.pixelsPerUnit
}

func (g *pongGame) toScreenY(gameY float64) float64 {
	return g.centerY - gameY*g.pixelsPerUnit
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

func (g *pongGame) draw() {
	s := g.pixelsPerUnit
	ctx := g.ctx
	d := dpr()
	w := float64(g.canvas.Get("width").Int()) / d
	h := float64(g.canvas.Get("height").Int()) / d

	ctx.Set("fillStyle", bgColor)
	ctx.Call("fillRect", 0, 0, w, h)

	ctx.Set("fillStyle", boardColor)
	ctx.Call("fillRect",
		g.toScreenX(-(fieldWidth+1.2)*0.5),
		g.toScreenY((fieldHeight+0.8)*0.5),
		(fieldWidth+1.2)*s,
		(fieldHeight+0.8)*s)

	ctx.Set("fillStyle", railColor)
	ctx.Call("fillRect",
		g.toScreenX(-(fieldWidth+1.4)*0.5),
		g.toScreenY(fieldHeight*0.5+0.24+0.08),
		(fieldWidth+1.4)*s,
		0.16*s)
	ctx.Call("fillRect",
		g.toScreenX(-(fieldWidth+1.4)*0.5),
		g.toScreenY(-(fieldHeight*0.5)-0.24+0.08),
		(fieldWidth+1.4)*s,
		0.16*s)

	ctx.Set("fillStyle", dashColor)
	for y := -(fieldHeight * 0.5) + 0.7; y <= fieldHeight*0.5-0.7; y += 0.9 {
		ctx.Call("fillRect", g.toScreenX(-0.04), g.toScreenY(y+0.21), 0.08*s, 0.42*s)
	}

	ctx.Set("fillStyle", playerColor)
	ctx.Call("fillRect",
		g.toScreenX(playerX-paddleWidth*0.5),
		g.toScreenY(g.playerY+paddleHeight*0.5),
		paddleWidth*s,
		paddleHeight*s)

	ctx.Set("fillStyle", aiColor)
	ctx.Call("fillRect",
		g.toScreenX(aiX-paddleWidth*0.5),
		g.toScreenY(g.aiY+paddleHeight*0.5),
		paddleWidth*s,
		paddleHeight*s)

	ctx.Set("fillStyle", ballColor)
	ctx.Call("fillRect",
		g.toScreenX(g.ballX-ballSize*0.5),
		g.toScreenY(g.ballY+ballSize*0.5),
		ballSize*s,
		ballSize*s)
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

func (g *pongGame) step(dt float64) {
	if g.mode == "serve" {
		g.startServe()
	} else if g.mode == "game_over" {
		g.restartMatch()
	}

	g.updatePlayer(dt)
	g.updateAi(dt)
	g.updateBall(dt)
}

func (g *pongGame) restartMatch() {
	g.playerScore = 0
	g.aiScore = 0
	dir := -1.0
	if rand.Float64() < 0.5 {
		dir = 1
	}
	g.prepareServe(dir)
}

func (g *pongGame) prepareServe(direction float64) {
	g.mode = "serve"
	g.serveDirection = direction
	g.aiRetargetIn = 0
	g.aiTargetY = 0
	g.playerY = 0
	g.aiY = 0
	g.resetBall()
}

func (g *pongGame) startServe() {
	g.mode = "play"
	g.ballX = 0
	g.ballY = 0
	g.ballVx = g.serveDirection * startBallSpeedX
	g.ballVy = randomRange(-startBallSpeedY, startBallSpeedY)
	if math.Abs(g.ballVy) < 1.2 {
		if g.ballVy < 0 {
			g.ballVy = -1.5
		} else {
			g.ballVy = 1.5
		}
	}
}

func (g *pongGame) awardPoint(playerScored bool) {
	if playerScored {
		g.playerScore++
		if g.playerScore >= winScore {
			g.mode = "game_over"
			g.resetBall()
			return
		}
		g.prepareServe(1)
		return
	}

	g.aiScore++
	if g.aiScore >= winScore {
		g.mode = "game_over"
		g.resetBall()
		return
	}
	g.prepareServe(-1)
}

func (g *pongGame) resetBall() {
	g.ballX = 0
	g.ballY = 0
	g.ballVx = 0
	g.ballVy = 0
}

func (g *pongGame) updatePlayer(dt float64) {
	minY := -(fieldHeight * 0.5) + paddleHeight*0.5
	maxY := (fieldHeight * 0.5) - paddleHeight*0.5
	direction := 0.0
	if g.input.up {
		direction += 1
	}
	if g.input.down {
		direction -= 1
	}
	g.playerY = clamp(g.playerY+direction*playerSpeed*dt, minY, maxY)
}

func (g *pongGame) updateAi(dt float64) {
	minY := -(fieldHeight * 0.5) + paddleHeight*0.5
	maxY := (fieldHeight * 0.5) - paddleHeight*0.5

	if g.mode == "play" && g.ballVx > 0 {
		g.aiRetargetIn -= dt
		if g.aiRetargetIn <= 0 {
			g.aiRetargetIn = randomRange(0.18, 0.35)

			distanceToPaddle := aiX - g.ballX
			leadTime := 0.0
			if g.ballVx > 0 && distanceToPaddle > 0 {
				leadTime = distanceToPaddle / g.ballVx
			}
			projectedY := reflectY(
				g.ballY+g.ballVy*leadTime,
				-(fieldHeight*0.5)+ballSize*0.5,
				(fieldHeight*0.5)-ballSize*0.5)
			missWindow := paddleHeight * randomRange(0.35, 0.75)
			g.aiTargetY = projectedY + randomRange(-missWindow, missWindow)
		}
	} else {
		g.aiRetargetIn = 0
		g.aiTargetY = 0
	}

	maxMove := aiSpeed * dt
	move := clamp(g.aiTargetY-g.aiY, -maxMove, maxMove)
	g.aiY = clamp(g.aiY+move, minY, maxY)
}

func (g *pongGame) updateBall(dt float64) {
	if g.mode != "play" {
		return
	}

	halfBall := ballSize * 0.5
	halfPaddleWidth := paddleWidth * 0.5
	halfPaddleHeight := paddleHeight * 0.5
	fieldTop := fieldHeight * 0.5
	fieldBottom := -fieldTop
	fieldRight := fieldWidth * 0.5
	fieldLeft := -fieldRight

	g.ballX += g.ballVx * dt
	g.ballY += g.ballVy * dt

	if g.ballY+halfBall >= fieldTop {
		g.ballY = fieldTop - halfBall
		g.ballVy = -math.Abs(g.ballVy)
	} else if g.ballY-halfBall <= fieldBottom {
		g.ballY = fieldBottom + halfBall
		g.ballVy = math.Abs(g.ballVy)
	}

	ballMinX := g.ballX - halfBall
	ballMaxX := g.ballX + halfBall
	ballMinY := g.ballY - halfBall
	ballMaxY := g.ballY + halfBall

	playerMinX := playerX - halfPaddleWidth
	playerMaxX := playerX + halfPaddleWidth
	playerMinY := g.playerY - halfPaddleHeight
	playerMaxY := g.playerY + halfPaddleHeight

	if g.ballVx < 0 &&
		ballMinX <= playerMaxX && ballMaxX >= playerMinX &&
		ballMinY <= playerMaxY && ballMaxY >= playerMinY {
		g.bounceFromPaddle(true, g.playerY)
	}

	aiMinX := aiX - halfPaddleWidth
	aiMaxX := aiX + halfPaddleWidth
	aiMinY := g.aiY - halfPaddleHeight
	aiMaxY := g.aiY + halfPaddleHeight

	if g.ballVx > 0 &&
		ballMaxX >= aiMinX && ballMinX <= aiMaxX &&
		ballMinY <= aiMaxY && ballMaxY >= aiMinY {
		g.bounceFromPaddle(false, g.aiY)
	}

	if g.ballX+halfBall < fieldLeft {
		g.awardPoint(false)
	} else if g.ballX-halfBall > fieldRight {
		g.awardPoint(true)
	}
}

func (g *pongGame) bounceFromPaddle(leftSide bool, paddleY float64) {
	impact := clamp((g.ballY-paddleY)/(paddleHeight*0.5), -1, 1)
	nextSpeedX := math.Min(math.Abs(g.ballVx)*1.05+0.45, maxBallSpeedX)
	nextSpeedY := clamp(g.ballVy+impact*3.6, -maxBallSpeedY, maxBallSpeedY)

	if math.Abs(nextSpeedY) < 1.25 {
		if impact < 0 {
			nextSpeedY = -1.5
		} else {
			nextSpeedY = 1.5
		}
	}
	nextSpeedY += randomRange(-0.25, 0.25)

	if leftSide {
		g.ballX = playerX + paddleWidth*0.5 + ballSize*0.5
		g.ballVx = nextSpeedX
	} else {
		g.ballX = aiX - paddleWidth*0.5 - ballSize*0.5
		g.ballVx = -nextSpeedX
	}
	g.ballVy = nextSpeedY
}

func (g *pongGame) syncHud() {
	g.playerScoreEl.Set("textContent", g.playerScore)
	g.aiScoreEl.Set("textContent", g.aiScore)
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

func main() {
	sdk := js.Global().Get("WavedashJS")
	if !sdk.Truthy() {
		panic("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.")
	}

	target := ensureTarget()
	sh := createShell(target)
	input := &inputState{}
	wireInput(input)

	log("Creating Canvas 2D pong game")
	game := newPongGame(sh.canvas, sh.playerScore, sh.aiScore)
	game.setup()

	log("Initializing Wavedash SDK")
	sdk.Call("updateLoadProgressZeroToOne", 1)
	sdk.Call("init")

	log("Starting game")
	game.start(input)

	select {}
}
