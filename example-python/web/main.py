"""Minimal Python Pong on Wavedash, running in-browser via Pyodide.

Two players: W/S for left paddle, Up/Down for right paddle.
Rendered directly to a Canvas 2D context via the ``js`` module Pyodide exposes.
"""
from js import WavedashJS, document, window
from pyodide.ffi import create_proxy, to_js

# --- Arena (logical units, matching example-bevy) ---
LEFT_WALL, RIGHT_WALL = -450.0, 450.0
TOP_WALL, BOTTOM_WALL = 300.0, -300.0
WALL_THICKNESS = 10.0
FIELD_W = RIGHT_WALL - LEFT_WALL
FIELD_H = TOP_WALL - BOTTOM_WALL

# --- Paddle ---
PADDLE_W, PADDLE_H = 20.0, 120.0
PADDLE_SPEED = 500.0
AI_SPEED = 350.0
PADDLE_X = 400.0
PADDLE_PADDING = 10.0

# --- Ball ---
BALL_SIZE = 20.0
BALL_SPEED = 400.0

canvas = document.getElementById("gameCanvas")
ctx = canvas.getContext("2d")


def resize(_event=None):
    dpr = window.devicePixelRatio or 1
    canvas.width = int(window.innerWidth * dpr)
    canvas.height = int(window.innerHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)


resize()
window.addEventListener("resize", create_proxy(resize))


def ppu():
    sx = window.innerWidth / (FIELD_W + 80)
    sy = window.innerHeight / (FIELD_H + 80)
    return sx if sx < sy else sy


def to_x(gx):
    return window.innerWidth / 2 + gx * ppu()


def to_y(gy):
    return window.innerHeight / 2 - gy * ppu()


# --- State ---
state = {
    "left_y": 0.0,
    "right_y": 0.0,
    "ball_x": 0.0,
    "ball_y": 0.0,
    "ball_vx": 0.0,
    "ball_vy": 0.0,
    "left_score": 0,
    "right_score": 0,
    "last_time": 0.0,
}


def reset_ball(direction_x):
    mag = (direction_x * direction_x + 0.25 * 0.25) ** 0.5
    state["ball_x"] = 0.0
    state["ball_y"] = 0.0
    state["ball_vx"] = direction_x / mag * BALL_SPEED
    state["ball_vy"] = 0.25 / mag * BALL_SPEED


reset_ball(1.0)

# --- Input (left paddle only; right is AI-controlled) ---
keys = {"KeyW": False, "KeyS": False}


def key_handler(pressed):
    def handler(event):
        if event.code not in keys:
            return
        event.preventDefault()
        keys[event.code] = pressed
    return handler


def blur_handler(_event=None):
    for k in keys:
        keys[k] = False


window.addEventListener("keydown", create_proxy(key_handler(True)))
window.addEventListener("keyup", create_proxy(key_handler(False)))
window.addEventListener("blur", create_proxy(blur_handler))


def clamp(v, lo, hi):
    return lo if v < lo else hi if v > hi else v


PAD_MAX_Y = TOP_WALL - PADDLE_H / 2
PAD_MIN_Y = BOTTOM_WALL + PADDLE_H / 2


def move_paddle(y, up, down, dt):
    direction = (1 if up else 0) - (1 if down else 0)
    return clamp(y + direction * PADDLE_SPEED * dt, PAD_MIN_Y, PAD_MAX_Y)


def collide(bx, by, half, rx, ry, rhw, rhh):
    """Return which side of the rect was hit ('left'|'right'|'top'|'bottom'), or None."""
    if bx + half < rx - rhw or bx - half > rx + rhw:
        return None
    if by + half < ry - rhh or by - half > ry + rhh:
        return None
    ox = bx - clamp(bx, rx - rhw, rx + rhw)
    oy = by - clamp(by, ry - rhh, ry + rhh)
    if abs(ox) > abs(oy):
        return "left" if ox < 0 else "right"
    return "top" if oy > 0 else "bottom"


WALL_HW = (FIELD_W + WALL_THICKNESS) / 2
WALL_HH = WALL_THICKNESS / 2


def update(dt):
    state["left_y"] = move_paddle(state["left_y"], keys["KeyW"], keys["KeyS"], dt)

    # Right paddle: simple tracking AI. Move toward ball y, capped at AI_SPEED.
    dy = state["ball_y"] - state["right_y"]
    step = AI_SPEED * dt
    if dy > step:
        state["right_y"] += step
    elif dy < -step:
        state["right_y"] -= step
    else:
        state["right_y"] += dy
    state["right_y"] = clamp(state["right_y"], PAD_MIN_Y, PAD_MAX_Y)

    state["ball_x"] += state["ball_vx"] * dt
    state["ball_y"] += state["ball_vy"] * dt

    if state["ball_x"] < LEFT_WALL - BALL_SIZE:
        state["right_score"] += 1
        reset_ball(-1.0)
        return
    if state["ball_x"] > RIGHT_WALL + BALL_SIZE:
        state["left_score"] += 1
        reset_ball(1.0)
        return

    half = BALL_SIZE / 2
    colliders = (
        (-PADDLE_X, state["left_y"], PADDLE_W / 2, PADDLE_H / 2),
        (PADDLE_X, state["right_y"], PADDLE_W / 2, PADDLE_H / 2),
        (0, TOP_WALL, WALL_HW, WALL_HH),
        (0, BOTTOM_WALL, WALL_HW, WALL_HH),
    )
    for rx, ry, rhw, rhh in colliders:
        side = collide(state["ball_x"], state["ball_y"], half, rx, ry, rhw, rhh)
        if side == "left" and state["ball_vx"] > 0:
            state["ball_vx"] = -state["ball_vx"]
        elif side == "right" and state["ball_vx"] < 0:
            state["ball_vx"] = -state["ball_vx"]
        elif side == "top" and state["ball_vy"] < 0:
            state["ball_vy"] = -state["ball_vy"]
        elif side == "bottom" and state["ball_vy"] > 0:
            state["ball_vy"] = -state["ball_vy"]


def draw():
    s = ppu()
    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

    ctx.fillStyle = "rgba(255,255,255,0.15)"
    ctx.fillRect(to_x(-1), to_y(TOP_WALL), 2 * s, FIELD_H * s)

    ctx.fillStyle = "rgba(255,255,255,0.2)"
    ctx.font = f"bold {int(80 * s)}px system-ui, -apple-system, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(str(state["left_score"]), to_x(-100.0), to_y(TOP_WALL - 80.0))
    ctx.fillText(str(state["right_score"]), to_x(100.0), to_y(TOP_WALL - 80.0))

    ctx.fillStyle = "#ffffff"
    # Paddles
    ctx.fillRect(
        to_x(-PADDLE_X - PADDLE_W / 2),
        to_y(state["left_y"] + PADDLE_H / 2),
        PADDLE_W * s,
        PADDLE_H * s,
    )
    ctx.fillRect(
        to_x(PADDLE_X - PADDLE_W / 2),
        to_y(state["right_y"] + PADDLE_H / 2),
        PADDLE_W * s,
        PADDLE_H * s,
    )
    # Ball
    ctx.fillRect(
        to_x(state["ball_x"] - BALL_SIZE / 2),
        to_y(state["ball_y"] + BALL_SIZE / 2),
        BALL_SIZE * s,
        BALL_SIZE * s,
    )


def loop(now):
    dt = (now - state["last_time"]) / 1000.0
    if dt > 0.05:
        dt = 0.05
    state["last_time"] = now
    update(dt)
    draw()
    window.requestAnimationFrame(loop_proxy)


loop_proxy = create_proxy(loop)

# --- Wavedash SDK ---
WavedashJS.updateLoadProgressZeroToOne(1.0)
WavedashJS.init(to_js({"debug": True}))

state["last_time"] = window.performance.now()
window.requestAnimationFrame(loop_proxy)
