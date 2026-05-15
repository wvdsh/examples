-- Minimal Pong in Lua, running in-browser via wasmoon.
-- Two players: W/S for left paddle, Up/Down for right paddle.
-- `window`, `document`, `Math`, and `WavedashJS` are bound as globals by index.html.

-- Arena (logical units, matching example-bevy)
local LEFT_WALL, RIGHT_WALL = -450.0, 450.0
local TOP_WALL, BOTTOM_WALL = 300.0, -300.0
local WALL_THICKNESS = 10.0
local FIELD_W = RIGHT_WALL - LEFT_WALL
local FIELD_H = TOP_WALL - BOTTOM_WALL

-- Paddle
local PADDLE_W, PADDLE_H = 20.0, 120.0
local PADDLE_SPEED = 500.0
local AI_SPEED = 350.0
local PADDLE_X = 400.0
local PADDLE_PADDING = 10.0

-- Ball
local BALL_SIZE = 20.0
local BALL_SPEED = 400.0

-- Canvas & context
local canvas = document:getElementById("gameCanvas")
local ctx = canvas:getContext("2d")

local function resize()
    local dpr = window.devicePixelRatio or 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx:setTransform(dpr, 0, 0, dpr, 0, 0)
end
resize()
window:addEventListener("resize", resize)

-- Game units -> screen pixels
local function ppu()
    local sx = window.innerWidth / (FIELD_W + 80)
    local sy = window.innerHeight / (FIELD_H + 80)
    return (sx < sy) and sx or sy
end
local function toX(gx) return window.innerWidth / 2 + gx * ppu() end
local function toY(gy) return window.innerHeight / 2 - gy * ppu() end

-- State
local left_y, right_y = 0.0, 0.0
local ball_x, ball_y = 0.0, 0.0
local ball_vx, ball_vy = 0.0, 0.0
local left_score, right_score = 0, 0

local leftScoreEl = document:getElementById("leftScore")
local rightScoreEl = document:getElementById("rightScore")

local function reset_ball(dir)
    ball_x, ball_y = 0.0, 0.0
    local mag = Math:sqrt(dir * dir + 0.25 * 0.25)
    ball_vx = dir / mag * BALL_SPEED
    ball_vy = 0.25 / mag * BALL_SPEED
end

reset_ball(1.0)

-- Input (left paddle only; right is AI-controlled)
local input = { left_up = false, left_down = false }
local KEY_MAP = {
    KeyW = "left_up", KeyS = "left_down",
}

local function key_handler(pressed)
    return function(e)
        local field = KEY_MAP[e.code]
        if not field then return end
        e:preventDefault()
        input[field] = pressed
    end
end

window:addEventListener("keydown", key_handler(true))
window:addEventListener("keyup", key_handler(false))
window:addEventListener("blur", function()
    input.left_up, input.left_down = false, false
end)

-- Helpers
local function clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

local PAD_MAX_Y = TOP_WALL - PADDLE_H / 2
local PAD_MIN_Y = BOTTOM_WALL + PADDLE_H / 2

local function move_paddle(y, up, down, dt)
    local dir = (up and 1 or 0) - (down and 1 or 0)
    return clamp(y + dir * PADDLE_SPEED * dt, PAD_MIN_Y, PAD_MAX_Y)
end

-- AABB collision; returns which side of `rect` was hit, or nil.
local function collide(bx, by, half, rx, ry, rhw, rhh)
    if bx + half < rx - rhw or bx - half > rx + rhw then return nil end
    if by + half < ry - rhh or by - half > ry + rhh then return nil end
    local ox = bx - clamp(bx, rx - rhw, rx + rhw)
    local oy = by - clamp(by, ry - rhh, ry + rhh)
    if Math:abs(ox) > Math:abs(oy) then
        return (ox < 0) and "left" or "right"
    end
    return (oy > 0) and "top" or "bottom"
end

local WALL_HW = (FIELD_W + WALL_THICKNESS) / 2
local WALL_HH = WALL_THICKNESS / 2

local function update(dt)
    left_y = move_paddle(left_y, input.left_up, input.left_down, dt)

    -- Right paddle: simple tracking AI. Move toward ball y, capped at AI_SPEED.
    local dy = ball_y - right_y
    local step = AI_SPEED * dt
    if dy > step then right_y = right_y + step
    elseif dy < -step then right_y = right_y - step
    else right_y = right_y + dy
    end
    right_y = clamp(right_y, PAD_MIN_Y, PAD_MAX_Y)

    ball_x = ball_x + ball_vx * dt
    ball_y = ball_y + ball_vy * dt

    if ball_x < LEFT_WALL - BALL_SIZE then
        right_score = right_score + 1
        rightScoreEl.textContent = tostring(right_score)
        reset_ball(-1.0)
        return
    end
    if ball_x > RIGHT_WALL + BALL_SIZE then
        left_score = left_score + 1
        leftScoreEl.textContent = tostring(left_score)
        reset_ball(1.0)
        return
    end

    local half = BALL_SIZE / 2
    local colliders = {
        { -PADDLE_X, left_y,  PADDLE_W / 2, PADDLE_H / 2 },
        {  PADDLE_X, right_y, PADDLE_W / 2, PADDLE_H / 2 },
        { 0, TOP_WALL,    WALL_HW, WALL_HH },
        { 0, BOTTOM_WALL, WALL_HW, WALL_HH },
    }
    for i = 1, #colliders do
        local c = colliders[i]
        local side = collide(ball_x, ball_y, half, c[1], c[2], c[3], c[4])
        if side == "left" and ball_vx > 0 then ball_vx = -ball_vx
        elseif side == "right" and ball_vx < 0 then ball_vx = -ball_vx
        elseif side == "top" and ball_vy < 0 then ball_vy = -ball_vy
        elseif side == "bottom" and ball_vy > 0 then ball_vy = -ball_vy
        end
    end
end

local function draw()
    local s = ppu()
    ctx.fillStyle = "#0a0a0a"
    ctx:fillRect(0, 0, window.innerWidth, window.innerHeight)

    ctx.fillStyle = "rgba(255,255,255,0.15)"
    ctx:fillRect(toX(-1), toY(TOP_WALL), 2 * s, FIELD_H * s)

    ctx.fillStyle = "#ffffff"
    -- Paddles
    ctx:fillRect(toX(-PADDLE_X - PADDLE_W / 2), toY(left_y + PADDLE_H / 2),
                 PADDLE_W * s, PADDLE_H * s)
    ctx:fillRect(toX(PADDLE_X - PADDLE_W / 2), toY(right_y + PADDLE_H / 2),
                 PADDLE_W * s, PADDLE_H * s)
    -- Ball
    ctx:fillRect(toX(ball_x - BALL_SIZE / 2), toY(ball_y + BALL_SIZE / 2),
                 BALL_SIZE * s, BALL_SIZE * s)
end

local last = window.performance:now()
local function loop(now)
    local dt = (now - last) / 1000
    if dt > 0.05 then dt = 0.05 end
    last = now
    update(dt)
    draw()
    window:requestAnimationFrame(loop)
end

-- Wavedash SDK init (the promise was already resolved in JS before this script ran).
WavedashJS:updateLoadProgressZeroToOne(1.0)
WavedashJS:init({ debug = true })
window:requestAnimationFrame(loop)
