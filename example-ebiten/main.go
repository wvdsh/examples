package main

import (
	"fmt"
	"image/color"
	"math"
	"syscall/js"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

// --- Wavedash SDK bridge ---

func wavedashInit() {
	sdk := js.Global().Get("WavedashJS")
	sdk.Call("updateLoadProgressZeroToOne", 1)
	sdk.Call("init")
}

// --- Constants ---

const (
	screenW    = 900
	screenH    = 600
	paddleW    = 15.0
	paddleH    = 100.0
	ballSize   = 15.0
	paddleSpd  = 500.0
	aiSpd      = 350.0
	ballSpd    = 400.0
	paddleEdge = 50.0
)

var (
	white = color.RGBA{255, 255, 255, 255}
	dimW  = color.RGBA{255, 255, 255, 40}
	bg    = color.RGBA{10, 10, 10, 255}
)

// --- Game ---

type Game struct {
	leftY, rightY      float64
	ballX, ballY       float64
	ballVx, ballVy     float64
	leftScore, rightScore int
}

func newGame() *Game {
	g := &Game{}
	g.leftY = screenH/2 - paddleH/2
	g.rightY = screenH/2 - paddleH/2
	g.resetBall(1)
	return g
}

func (g *Game) resetBall(dir float64) {
	g.ballX = screenW/2 - ballSize/2
	g.ballY = screenH/2 - ballSize/2
	g.ballVx = ballSpd * dir
	g.ballVy = ballSpd * 0.25
}

func clamp(v, lo, hi float64) float64 {
	return math.Max(lo, math.Min(hi, v))
}

func (g *Game) Update() error {
	dt := 1.0 / float64(ebiten.TPS())

	// Left paddle: WASD or arrow keys
	if ebiten.IsKeyPressed(ebiten.KeyW) || ebiten.IsKeyPressed(ebiten.KeyArrowUp) {
		g.leftY -= paddleSpd * dt
	}
	if ebiten.IsKeyPressed(ebiten.KeyS) || ebiten.IsKeyPressed(ebiten.KeyArrowDown) {
		g.leftY += paddleSpd * dt
	}
	g.leftY = clamp(g.leftY, 0, screenH-paddleH)

	// Right paddle: AI tracking
	target := g.ballY - paddleH/2
	diff := target - g.rightY
	step := aiSpd * dt
	if math.Abs(diff) < step {
		g.rightY = target
	} else if diff > 0 {
		g.rightY += step
	} else {
		g.rightY -= step
	}
	g.rightY = clamp(g.rightY, 0, screenH-paddleH)

	// Ball movement
	g.ballX += g.ballVx * dt
	g.ballY += g.ballVy * dt

	// Wall bounce
	if g.ballY < 0 {
		g.ballY = 0
		g.ballVy = -g.ballVy
	}
	if g.ballY > screenH-ballSize {
		g.ballY = screenH - ballSize
		g.ballVy = -g.ballVy
	}

	// Left paddle collision
	lx := paddleEdge
	if g.ballVx < 0 &&
		g.ballX < lx+paddleW && g.ballX+ballSize > lx &&
		g.ballY+ballSize > g.leftY && g.ballY < g.leftY+paddleH {
		g.ballX = lx + paddleW
		g.ballVx = -g.ballVx
	}

	// Right paddle collision
	rx := screenW - paddleEdge - paddleW
	if g.ballVx > 0 &&
		g.ballX+ballSize > rx && g.ballX < rx+paddleW &&
		g.ballY+ballSize > g.rightY && g.ballY < g.rightY+paddleH {
		g.ballX = rx - ballSize
		g.ballVx = -g.ballVx
	}

	// Scoring
	if g.ballX+ballSize < 0 {
		g.rightScore++
		g.resetBall(1)
	}
	if g.ballX > screenW {
		g.leftScore++
		g.resetBall(-1)
	}

	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {
	screen.Fill(bg)

	// Center line
	vector.DrawFilledRect(screen, screenW/2-1, 0, 2, screenH, dimW, false)

	// Paddles
	vector.DrawFilledRect(screen, paddleEdge, float32(g.leftY), paddleW, paddleH, white, false)
	vector.DrawFilledRect(screen, screenW-paddleEdge-paddleW, float32(g.rightY), paddleW, paddleH, white, false)

	// Ball
	vector.DrawFilledRect(screen, float32(g.ballX), float32(g.ballY), ballSize, ballSize, white, false)

	// Score
	ebitenutil.DebugPrintAt(screen, fmt.Sprintf("%d", g.leftScore), screenW/2-52, 20)
	ebitenutil.DebugPrintAt(screen, fmt.Sprintf("%d", g.rightScore), screenW/2+36, 20)
}

func (g *Game) Layout(_, _ int) (int, int) {
	return screenW, screenH
}

func main() {
	wavedashInit()

	ebiten.SetWindowSize(screenW, screenH)
	ebiten.SetWindowTitle("Pong")

	if err := ebiten.RunGame(newGame()); err != nil {
		panic(err)
	}
}
