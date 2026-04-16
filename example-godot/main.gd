extends Node2D

const COURT_W := 960.0
const COURT_H := 540.0
const PADDLE_W := 18.0
const PADDLE_H := 92.0
const BALL_RADIUS := 10.0
const LEFT_X := 40.0
const RIGHT_X := COURT_W - 40.0
const PADDLE_SPEED := 480.0
const START_BALL_SPEED_X := 360.0
const START_BALL_SPEED_Y := 180.0
const MAX_BALL_SPEED_X := 720.0
const MAX_BALL_SPEED_Y := 480.0

var left_y: float = COURT_H * 0.5
var right_y: float = COURT_H * 0.5
var ball_pos: Vector2 = Vector2(COURT_W * 0.5, COURT_H * 0.5)
var ball_vel: Vector2 = Vector2.ZERO
var left_score: int = 0
var right_score: int = 0
var left_name: String = "Player"
var serve_dir: int = 1

@onready var left_paddle: ColorRect = $LeftPaddle
@onready var right_paddle: ColorRect = $RightPaddle
@onready var ball: Node2D = $Ball
@onready var left_score_label: Label = $LeftScore
@onready var right_score_label: Label = $RightScore

func _ready() -> void:
	WavedashSDK.init({"debug": true})
	var username := WavedashSDK.get_username()
	if username != "":
		left_name = username
	_start_serve()
	_update_score_labels()

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	_update_paddles(delta)
	_update_ball(delta)
	_sync_nodes()

func _update_paddles(delta: float) -> void:
	var left_dir := 0.0
	if Input.is_action_pressed("left_paddle_up"):
		left_dir -= 1.0
	if Input.is_action_pressed("left_paddle_down"):
		left_dir += 1.0
	left_y = clampf(
		left_y + left_dir * PADDLE_SPEED * delta,
		PADDLE_H * 0.5,
		COURT_H - PADDLE_H * 0.5
	)

	var right_dir := 0.0
	if Input.is_action_pressed("right_paddle_up"):
		right_dir -= 1.0
	if Input.is_action_pressed("right_paddle_down"):
		right_dir += 1.0
	right_y = clampf(
		right_y + right_dir * PADDLE_SPEED * delta,
		PADDLE_H * 0.5,
		COURT_H - PADDLE_H * 0.5
	)

func _update_ball(delta: float) -> void:
	ball_pos += ball_vel * delta

	if ball_pos.y - BALL_RADIUS < 0.0:
		ball_pos.y = BALL_RADIUS
		ball_vel.y = absf(ball_vel.y)
	elif ball_pos.y + BALL_RADIUS > COURT_H:
		ball_pos.y = COURT_H - BALL_RADIUS
		ball_vel.y = -absf(ball_vel.y)

	if ball_vel.x < 0.0 and _ball_hits_paddle(LEFT_X, left_y):
		_bounce(true)
	elif ball_vel.x > 0.0 and _ball_hits_paddle(RIGHT_X, right_y):
		_bounce(false)

	if ball_pos.x + BALL_RADIUS < 0.0:
		right_score += 1
		serve_dir = -1
		_update_score_labels()
		_start_serve()
	elif ball_pos.x - BALL_RADIUS > COURT_W:
		left_score += 1
		serve_dir = 1
		_update_score_labels()
		_start_serve()

func _ball_hits_paddle(paddle_x: float, paddle_y: float) -> bool:
	var half_w := PADDLE_W * 0.5
	var half_h := PADDLE_H * 0.5
	return ball_pos.x + BALL_RADIUS >= paddle_x - half_w \
		and ball_pos.x - BALL_RADIUS <= paddle_x + half_w \
		and ball_pos.y + BALL_RADIUS >= paddle_y - half_h \
		and ball_pos.y - BALL_RADIUS <= paddle_y + half_h

func _bounce(left_side: bool) -> void:
	var paddle_y := left_y if left_side else right_y
	var impact := clampf((ball_pos.y - paddle_y) / (PADDLE_H * 0.5), -1.0, 1.0)
	var next_speed_x := minf(absf(ball_vel.x) * 1.05 + 24.0, MAX_BALL_SPEED_X)
	var next_speed_y := clampf(ball_vel.y + impact * 220.0, -MAX_BALL_SPEED_Y, MAX_BALL_SPEED_Y)

	if absf(next_speed_y) < 70.0:
		next_speed_y = -90.0 if impact < 0.0 else 90.0

	ball_vel.x = next_speed_x if left_side else -next_speed_x
	ball_vel.y = next_speed_y

	if left_side:
		ball_pos.x = LEFT_X + PADDLE_W * 0.5 + BALL_RADIUS
	else:
		ball_pos.x = RIGHT_X - PADDLE_W * 0.5 - BALL_RADIUS

func _start_serve() -> void:
	ball_pos = Vector2(COURT_W * 0.5, COURT_H * 0.5)
	ball_vel.x = serve_dir * START_BALL_SPEED_X
	ball_vel.y = randf_range(-START_BALL_SPEED_Y, START_BALL_SPEED_Y)
	if absf(ball_vel.y) < 60.0:
		ball_vel.y = -80.0 if ball_vel.y < 0.0 else 80.0

func _sync_nodes() -> void:
	left_paddle.position = Vector2(LEFT_X - PADDLE_W * 0.5, left_y - PADDLE_H * 0.5)
	right_paddle.position = Vector2(RIGHT_X - PADDLE_W * 0.5, right_y - PADDLE_H * 0.5)
	ball.position = ball_pos

func _update_score_labels() -> void:
	left_score_label.text = "%s: %d" % [left_name, left_score]
	right_score_label.text = "Guest: %d" % right_score
