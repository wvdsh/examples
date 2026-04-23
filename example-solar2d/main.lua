-- Solar2D Pong

-- Wavedash SDK: loaded via Solar2D's JavaScript Module Loader. The file
-- wavedash.js at the project root defines a global object which becomes
-- callable from Lua as the `wavedash` module on the HTML5 target.
if system.getInfo("platform") == "html5" then
    local wavedash = require "wavedash"
    wavedash.updateLoadProgressZeroToOne(1)
    wavedash.init()
end

local W, H = display.contentWidth, display.contentHeight

-- Colors
local BG  = {0.04, 0.04, 0.04}
local FG  = {1,    1,    1   }
local DIM = {1,    1,    1,   0.15}

-- Gameplay constants — scale with content dimensions so changing
-- config.lua's content size keeps the pong proportioned.
local PADDLE_W     = H / 40        -- 15 at H=600, 27 at H=1080
local PADDLE_H     = H / 6         -- 100 at H=600, 180 at H=1080
local BALL_SIZE    = H / 40
local PADDLE_EDGE  = W / 18        -- 50 at W=900, 107 at W=1920
local PADDLE_SPD   = H * 5 / 6     -- 500 at H=600, 900 at H=1080
local AI_SPD       = H * 7 / 12    -- 350 at H=600, 630 at H=1080
local BALL_SPD     = H * 2 / 3     -- 400 at H=600, 720 at H=1080

-- Set background
display.setDefault("background", BG[1], BG[2], BG[3])

-- Helpers

local function clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

local function rect(x, y, w, h, r, g, b, a)
    local r_ = display.newRect(x + w/2, y + h/2, w, h)
    r_:setFillColor(r, g, b, a or 1)
    return r_
end

-- Scene

local centerLine = rect(W/2 - 1, 0, 2, H, DIM[1], DIM[2], DIM[3], DIM[4])
local leftPad    = rect(PADDLE_EDGE, H/2 - PADDLE_H/2, PADDLE_W, PADDLE_H, FG[1], FG[2], FG[3])
local rightPad   = rect(W - PADDLE_EDGE - PADDLE_W, H/2 - PADDLE_H/2, PADDLE_W, PADDLE_H, FG[1], FG[2], FG[3])
local ball       = rect(W/2 - BALL_SIZE/2, H/2 - BALL_SIZE/2, BALL_SIZE, BALL_SIZE, FG[1], FG[2], FG[3])

local scoreL = display.newText("0", W/2 - 52, 30, native.systemFontBold, 40)
local scoreR = display.newText("0", W/2 + 52, 30, native.systemFontBold, 40)
scoreL:setFillColor(1, 1, 1, 0.3)
scoreR:setFillColor(1, 1, 1, 0.3)

-- State

local leftY   = H/2 - PADDLE_H/2
local rightY  = H/2 - PADDLE_H/2
local bx, by  = W/2 - BALL_SIZE/2, H/2 - BALL_SIZE/2
local bvx, bvy = BALL_SPD, BALL_SPD * 0.25
local ls, rs  = 0, 0

local upPressed, downPressed = false, false

-- Input

local function onKey(event)
    local isDown = event.phase == "down"
    if event.keyName == "up" or event.keyName == "w" then
        upPressed = isDown
    elseif event.keyName == "down" or event.keyName == "s" then
        downPressed = isDown
    end
end
Runtime:addEventListener("key", onKey)

-- Game loop

local prev = system.getTimer()

local function onFrame()
    local now = system.getTimer()
    local dt  = (now - prev) / 1000
    prev = now

    -- Left paddle
    if upPressed   then leftY = leftY - PADDLE_SPD * dt end
    if downPressed then leftY = leftY + PADDLE_SPD * dt end
    leftY = clamp(leftY, 0, H - PADDLE_H)
    leftPad.y = leftY + PADDLE_H / 2

    -- Right paddle (AI)
    local target = by - PADDLE_H / 2
    local diff   = target - rightY
    local step   = AI_SPD * dt
    if math.abs(diff) < step then
        rightY = target
    elseif diff > 0 then
        rightY = rightY + step
    else
        rightY = rightY - step
    end
    rightY = clamp(rightY, 0, H - PADDLE_H)
    rightPad.y = rightY + PADDLE_H / 2

    -- Ball
    bx = bx + bvx * dt
    by = by + bvy * dt

    -- Wall bounce
    if by < 0            then by = 0;            bvy = -bvy end
    if by > H - BALL_SIZE then by = H - BALL_SIZE; bvy = -bvy end

    -- Left paddle collision
    if bvx < 0 and
       bx < PADDLE_EDGE + PADDLE_W and bx + BALL_SIZE > PADDLE_EDGE and
       by + BALL_SIZE > leftY and by < leftY + PADDLE_H then
        bx  = PADDLE_EDGE + PADDLE_W
        bvx = -bvx
    end

    -- Right paddle collision
    local rx = W - PADDLE_EDGE - PADDLE_W
    if bvx > 0 and
       bx + BALL_SIZE > rx and bx < rx + PADDLE_W and
       by + BALL_SIZE > rightY and by < rightY + PADDLE_H then
        bx  = rx - BALL_SIZE
        bvx = -bvx
    end

    -- Scoring
    if bx + BALL_SIZE < 0 then
        rs = rs + 1; scoreR.text = tostring(rs)
        bx, by = W/2 - BALL_SIZE/2, H/2 - BALL_SIZE/2
        bvx, bvy = BALL_SPD, BALL_SPD * 0.25
    end
    if bx > W then
        ls = ls + 1; scoreL.text = tostring(ls)
        bx, by = W/2 - BALL_SIZE/2, H/2 - BALL_SIZE/2
        bvx, bvy = -BALL_SPD, BALL_SPD * 0.25
    end

    ball.x = bx + BALL_SIZE / 2
    ball.y = by + BALL_SIZE / 2
end

Runtime:addEventListener("enterFrame", onFrame)
