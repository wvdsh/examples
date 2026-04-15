local wavedash = require("wavedash")

local COURT_W = 960
local COURT_H = 540
local PLAYER_X = 40
local AI_X = COURT_W - 40
local PADDLE_W = 18
local PADDLE_H = 92
local BALL_R = 10
local PLAYER_SPEED = 480
local AI_SPEED = 300
local START_SPEED_X = 360
local START_SPEED_Y = 180
local MAX_SPEED_X = 720
local MAX_SPEED_Y = 480
local WIN_SCORE = 7

local COLORS = {
  background = { 0.02, 0.05, 0.09 },
  line = { 0.39, 0.45, 0.56, 0.55 },
  player = { 0.36, 0.88, 1.00 },
  ai = { 1.00, 0.70, 0.28 },
  ball = { 0.97, 0.98, 1.00 },
  text = { 0.90, 0.93, 0.97 },
  accent = { 0.22, 0.74, 0.98 },
}

local state = {
  player_y = COURT_H / 2,
  ai_y = COURT_H / 2,
  ai_target_y = COURT_H / 2,
  ai_retarget_in = 0,
  ball_x = COURT_W / 2,
  ball_y = COURT_H / 2,
  ball_vx = 0,
  ball_vy = 0,
  player_score = 0,
  ai_score = 0,
  serving = true,
  serve_dir = 1,
  first_frame_released = false,
  small_font = nil,
  score_font = nil,
}

local function clamp(value, min_value, max_value)
  return math.min(math.max(value, min_value), max_value)
end

local function reset_round()
  state.player_y = COURT_H / 2
  state.ai_y = COURT_H / 2
  state.ai_target_y = COURT_H / 2
  state.ai_retarget_in = 0
  state.ball_x = COURT_W / 2
  state.ball_y = COURT_H / 2
  state.ball_vx = 0
  state.ball_vy = 0
  state.serving = true
end

local function reset_match_if_over()
  if state.player_score >= WIN_SCORE or state.ai_score >= WIN_SCORE then
    state.player_score = 0
    state.ai_score = 0
  end
end

local function start_serve()
  state.serving = false
  state.ball_x = COURT_W / 2
  state.ball_y = COURT_H / 2
  state.ball_vx = state.serve_dir * START_SPEED_X
  state.ball_vy = (love.math.random() * 2 - 1) * START_SPEED_Y

  if math.abs(state.ball_vy) < 60 then
    state.ball_vy = state.ball_vy < 0 and -80 or 80
  end
end

local function after_score(ball_went_left)
  state.serve_dir = ball_went_left and -1 or 1
  reset_match_if_over()
  reset_round()
end

local function bounce(left_side)
  local paddle_y = left_side and state.player_y or state.ai_y
  local impact = clamp((state.ball_y - paddle_y) / (PADDLE_H / 2), -1, 1)
  local next_speed_x = math.min(math.abs(state.ball_vx) * 1.05 + 24, MAX_SPEED_X)
  local next_speed_y = clamp(state.ball_vy + impact * 220, -MAX_SPEED_Y, MAX_SPEED_Y)

  if math.abs(next_speed_y) < 70 then
    next_speed_y = impact < 0 and -90 or 90
  end

  state.ball_vx = left_side and next_speed_x or -next_speed_x
  state.ball_vy = next_speed_y

  if left_side then
    state.ball_x = PLAYER_X + PADDLE_W / 2 + BALL_R
  else
    state.ball_x = AI_X - PADDLE_W / 2 - BALL_R
  end
end

local function update_player(delta)
  local direction = 0

  if love.keyboard.isDown("w", "up") then
    direction = direction - 1
  end

  if love.keyboard.isDown("s", "down") then
    direction = direction + 1
  end

  state.player_y = clamp(
    state.player_y + direction * PLAYER_SPEED * delta,
    PADDLE_H / 2,
    COURT_H - PADDLE_H / 2
  )
end

local function retarget_ai()
  local travel_time = math.max((AI_X - state.ball_x) / state.ball_vx, 0)
  local projected_y = state.ball_y + state.ball_vy * travel_time
  local noise = (love.math.random() * 2 - 1) * PADDLE_H * 0.7

  state.ai_target_y = clamp(
    projected_y + noise,
    PADDLE_H / 2,
    COURT_H - PADDLE_H / 2
  )
end

local function update_ai(delta)
  if state.ball_vx > 0 then
    state.ai_retarget_in = state.ai_retarget_in - delta

    if state.ai_retarget_in <= 0 then
      state.ai_retarget_in = 0.15 + love.math.random() * 0.18
      retarget_ai()
    end
  else
    state.ai_target_y = COURT_H / 2
  end

  local step = clamp(state.ai_target_y - state.ai_y, -AI_SPEED * delta, AI_SPEED * delta)
  state.ai_y = clamp(state.ai_y + step, PADDLE_H / 2, COURT_H - PADDLE_H / 2)
end

local function advance_ball(delta)
  state.ball_x = state.ball_x + state.ball_vx * delta
  state.ball_y = state.ball_y + state.ball_vy * delta

  if state.ball_y - BALL_R < 0 then
    state.ball_y = BALL_R
    state.ball_vy = math.abs(state.ball_vy)
  elseif state.ball_y + BALL_R > COURT_H then
    state.ball_y = COURT_H - BALL_R
    state.ball_vy = -math.abs(state.ball_vy)
  end
end

local function ball_hits_paddle(paddle_x, paddle_y)
  return state.ball_x + BALL_R >= paddle_x - PADDLE_W / 2
    and state.ball_x - BALL_R <= paddle_x + PADDLE_W / 2
    and state.ball_y >= paddle_y - PADDLE_H / 2
    and state.ball_y <= paddle_y + PADDLE_H / 2
end

local function handle_paddle_collisions()
  if state.ball_vx < 0 and ball_hits_paddle(PLAYER_X, state.player_y) then
    bounce(true)
  elseif state.ball_vx > 0 and ball_hits_paddle(AI_X, state.ai_y) then
    bounce(false)
  end
end

local function handle_scoring()
  if state.ball_x < -BALL_R then
    state.ai_score = state.ai_score + 1
    after_score(true)
  elseif state.ball_x > COURT_W + BALL_R then
    state.player_score = state.player_score + 1
    after_score(false)
  end
end

local function release_first_playable_frame()
  if state.first_frame_released then
    return
  end

  -- The first rendered frame is the earliest truly playable moment on web.
  state.first_frame_released = true
  wavedash.update_load_progress(1)
  wavedash.ready_for_events()
  wavedash.load_complete()
end

local function draw_court()
  love.graphics.setColor(COLORS.line)

  for y = 24, COURT_H - 24, 26 do
    love.graphics.rectangle("fill", COURT_W / 2 - 2, y, 4, 14, 2, 2)
  end
end

local function draw_paddles_and_ball()
  love.graphics.setColor(COLORS.player)
  love.graphics.rectangle(
    "fill",
    PLAYER_X - PADDLE_W / 2,
    state.player_y - PADDLE_H / 2,
    PADDLE_W,
    PADDLE_H,
    6,
    6
  )

  love.graphics.setColor(COLORS.ai)
  love.graphics.rectangle(
    "fill",
    AI_X - PADDLE_W / 2,
    state.ai_y - PADDLE_H / 2,
    PADDLE_W,
    PADDLE_H,
    6,
    6
  )

  love.graphics.setColor(COLORS.ball)
  love.graphics.circle("fill", state.ball_x, state.ball_y, BALL_R)
end

local function draw_scores()
  love.graphics.setFont(state.score_font)
  love.graphics.setColor(COLORS.text)
  love.graphics.printf(tostring(state.player_score), 0, 28, COURT_W / 2 - 50, "center")
  love.graphics.printf(
    tostring(state.ai_score),
    COURT_W / 2 + 50,
    28,
    COURT_W / 2 - 50,
    "center"
  )
end

local function draw_hud()
  love.graphics.setFont(state.small_font)
  love.graphics.setColor(COLORS.accent)
  love.graphics.print("example-love2d", 20, 16)

  love.graphics.setColor(COLORS.text)
  love.graphics.printf("LOVE2D + Wavedash Pong", 0, 16, COURT_W - 20, "right")
  love.graphics.printf(
    "First to " .. WIN_SCORE .. " resets the match.",
    0,
    COURT_H - 48,
    COURT_W,
    "center"
  )
  love.graphics.printf("W/S or arrows to move", 0, COURT_H - 26, COURT_W, "center")
end

function love.load()
  love.math.setRandomSeed(love.timer.getTime())
  love.graphics.setBackgroundColor(COLORS.background)

  wavedash.init(true, true)
  wavedash.update_load_progress(0.2)

  state.small_font = love.graphics.newFont(18)
  state.score_font = love.graphics.newFont(56)
  wavedash.update_load_progress(0.55)

  reset_round()
  wavedash.update_load_progress(0.8)
end

function love.update(dt)
  local delta = math.min(dt, 0.05)

  if state.serving then
    start_serve()
  end

  update_player(delta)
  update_ai(delta)
  advance_ball(delta)
  handle_paddle_collisions()
  handle_scoring()
end

function love.draw()
  draw_court()
  draw_paddles_and_ball()
  draw_scores()
  draw_hud()
  release_first_playable_frame()
end

function love.keypressed(key)
  if key == "escape" then
    love.event.quit()
  end
end
