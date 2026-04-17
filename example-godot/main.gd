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

const CHANNEL_PADDLE := 0
const CHANNEL_EVENTS := 1
const PADDLE_SEND_EPSILON := 0.5
const WavedashConstants = preload("res://addons/wavedash/WavedashConstants.gd")

enum State { MENU, LOCAL, ONLINE_MENU, IN_LOBBY, ONLINE_GAME }

var state: int = State.MENU
var is_host: bool = false
var current_lobby_id: String = ""
var peer_id: String = ""
var peer_connected: bool = false

var left_y: float = COURT_H * 0.5
var right_y: float = COURT_H * 0.5
var ball_pos: Vector2 = Vector2(COURT_W * 0.5, COURT_H * 0.5)
var ball_vel: Vector2 = Vector2.ZERO
var left_score: int = 0
var right_score: int = 0
var left_name: String = "Player"
var right_name: String = "Guest"
var serve_dir: int = 1
var _last_sent_paddle_y: float = -1.0

@onready var left_paddle: ColorRect = $LeftPaddle
@onready var right_paddle: ColorRect = $RightPaddle
@onready var ball: Node2D = $Ball
@onready var left_score_label: Label = $LeftScore
@onready var right_score_label: Label = $RightScore
@onready var hud: HudMenu = $HUD

func _ready() -> void:
	WavedashSDK.init({"debug": true})

	WavedashSDK.got_lobbies.connect(_on_got_lobbies)
	WavedashSDK.lobby_created.connect(_on_lobby_created)
	WavedashSDK.lobby_joined.connect(_on_lobby_joined)
	WavedashSDK.lobby_users_updated.connect(_on_lobby_users_updated)
	WavedashSDK.lobby_left.connect(_on_lobby_left)
	WavedashSDK.lobby_kicked.connect(_on_lobby_kicked)
	WavedashSDK.p2p_connection_established.connect(_on_p2p_connected)
	WavedashSDK.p2p_peer_disconnected.connect(_on_peer_disconnected)

	hud.main_menu.get_node("VBox/PlayLocalButton").pressed.connect(_on_play_local)
	hud.main_menu.get_node("VBox/PlayOnlineButton").pressed.connect(_on_play_online)
	hud.online_menu.get_node("HBox/LeftPanel/CreateLobbyButton").pressed.connect(_on_create_lobby)
	hud.online_menu.get_node("HBox/LeftPanel/RefreshButton").pressed.connect(_on_refresh_lobbies)
	hud.online_menu.get_node("HBox/LeftPanel/BackButton").pressed.connect(_on_back_to_menu)
	hud.start_button.pressed.connect(_on_start_game)

	_enter_menu()

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	if state == State.LOCAL:
		_update_paddles_local(delta)
		_update_ball(delta)
		_sync_nodes()
	elif state == State.ONLINE_GAME:
		_drain_p2p()
		_update_online_paddles(delta)
		_update_ball(delta)
		_broadcast_paddle_if_changed()
		_sync_nodes()
	elif state == State.IN_LOBBY:
		_drain_p2p()

func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("ui_cancel"):
		return
	match state:
		State.LOCAL:
			_reset_scores()
			_enter_menu()
		State.ONLINE_MENU:
			_enter_menu()
		State.IN_LOBBY, State.ONLINE_GAME:
			_leave_current_lobby()

# ---- State transitions ----

func _enter_menu() -> void:
	state = State.MENU
	hud.show_main_menu()
	_show_gameplay(false)

func _enter_local_game() -> void:
	state = State.LOCAL
	_reset_scores()
	_reset_ball(1)
	var username := WavedashSDK.get_username()
	left_name = username if username != "" else "Player"
	right_name = "Guest"
	_update_score_labels()
	hud.hide_all()
	_show_gameplay(true)

func _enter_online_menu() -> void:
	state = State.ONLINE_MENU
	peer_id = ""
	peer_connected = false
	hud.show_online_menu()
	_show_gameplay(false)
	_on_refresh_lobbies()

func _enter_lobby(is_host_role: bool) -> void:
	state = State.IN_LOBBY
	is_host = is_host_role
	peer_connected = false
	_reset_scores()
	var self_username := WavedashSDK.get_username()
	if is_host:
		left_name = self_username if self_username != "" else "Host"
		right_name = "Waiting..."
	else:
		left_name = WavedashSDK.get_username(peer_id)
		if left_name == "":
			left_name = "Host"
		right_name = self_username if self_username != "" else "Guest"
	_update_score_labels()
	hud.show_lobby_view()
	hud.set_lobby_header("%s   vs   %s" % [left_name, right_name])
	if is_host:
		hud.set_lobby_status("Share this lobby with a friend")
		hud.show_start_button(false)
	else:
		hud.set_lobby_status("Waiting for host to start...")
		hud.show_start_button(false)
	_show_gameplay(false)

func _enter_online_game(initial_pos: Vector2, initial_vel: Vector2) -> void:
	state = State.ONLINE_GAME
	ball_pos = initial_pos
	ball_vel = initial_vel
	left_y = COURT_H * 0.5
	right_y = COURT_H * 0.5
	_last_sent_paddle_y = -1.0
	hud.hide_all()
	_update_score_labels()
	_show_gameplay(true)

func _show_gameplay(show: bool) -> void:
	left_paddle.visible = show
	right_paddle.visible = show
	ball.visible = show
	left_score_label.visible = show
	right_score_label.visible = show
	$CenterLine.visible = show

# ---- Button handlers ----

func _on_play_local() -> void:
	_enter_local_game()

func _on_play_online() -> void:
	_enter_online_menu()

func _on_back_to_menu() -> void:
	_enter_menu()

func _on_refresh_lobbies() -> void:
	WavedashSDK.list_available_lobbies()

func _on_create_lobby() -> void:
	WavedashSDK.create_lobby(WavedashConstants.LOBBY_TYPE_PUBLIC, 2)

func _on_start_game() -> void:
	if not is_host or not peer_connected:
		return
	serve_dir = 1
	var pos := Vector2(COURT_W * 0.5, COURT_H * 0.5)
	var vel := Vector2(
		serve_dir * START_BALL_SPEED_X,
		randf_range(-START_BALL_SPEED_Y, START_BALL_SPEED_Y),
	)
	if absf(vel.y) < 60.0:
		vel.y = -80.0 if vel.y < 0.0 else 80.0
	_send_event({"event": "StartGame", "data": {"pos": pos, "vel": vel}})
	_enter_online_game(pos, vel)

# ---- SDK signal handlers ----

func _on_got_lobbies(payload) -> void:
	if state != State.ONLINE_MENU:
		return
	var lobbies: Array = []
	if payload is Array:
		lobbies = payload
	elif payload is Dictionary and payload.has("data") and payload.data is Array:
		lobbies = payload.data
	hud.populate_lobby_list(lobbies, _on_lobby_button_pressed)

func _on_lobby_button_pressed(lobby_id: String) -> void:
	WavedashSDK.join_lobby(lobby_id)

func _on_lobby_created(payload) -> void:
	if not payload.get("success", false):
		push_warning("create_lobby failed: %s" % payload.get("message", ""))
		return
	var lobby_id: String = payload.get("data", "")
	if lobby_id == "":
		return
	var username := WavedashSDK.get_username()
	if username != "":
		WavedashSDK.set_lobby_data_string(lobby_id, "host_username", username)

func _on_lobby_joined(payload) -> void:
	current_lobby_id = payload.get("lobbyId", "")
	var host_id: String = payload.get("hostId", "")
	var self_id := WavedashSDK.get_user_id()
	var host_role := host_id == self_id
	peer_id = ""
	if host_role:
		# Find peer if already present (unlikely for host but handle it)
		peer_id = _find_peer_in_users(payload.get("users", []), self_id)
	else:
		peer_id = host_id
	_enter_lobby(host_role)
	if peer_id != "":
		_on_peer_present()

func _on_lobby_users_updated(payload) -> void:
	if state != State.IN_LOBBY and state != State.ONLINE_GAME:
		return
	var self_id := WavedashSDK.get_user_id()
	var users: Array = payload.get("users", [])
	var new_peer := _find_peer_in_users(users, self_id)
	if new_peer == "" and peer_id != "":
		peer_id = ""
		peer_connected = false
		if state == State.ONLINE_GAME:
			_leave_current_lobby()
		else:
			right_name = "Waiting..." if is_host else right_name
			hud.set_lobby_header("%s   vs   %s" % [left_name, right_name])
			hud.set_lobby_status("Share this lobby with a friend")
			hud.show_start_button(false)
		return
	if new_peer != "" and new_peer != peer_id:
		peer_id = new_peer
		_on_peer_present()

func _on_peer_present() -> void:
	if state != State.IN_LOBBY:
		return
	if is_host:
		right_name = "Connecting..."
		hud.set_lobby_header("%s   vs   %s" % [left_name, right_name])
		hud.set_lobby_status("Establishing P2P connection...")

func _on_p2p_connected(payload) -> void:
	if state != State.IN_LOBBY:
		return
	var connected_id: String = payload.get("userId", "")
	if connected_id == "":
		return
	if peer_id == "":
		peer_id = connected_id
	elif connected_id != peer_id:
		return
	peer_connected = true
	var peer_username := WavedashSDK.get_username(peer_id)
	if peer_username == "":
		peer_username = "Guest"
	if is_host:
		right_name = peer_username
		hud.set_lobby_header("%s   vs   %s" % [left_name, right_name])
		hud.set_lobby_status("Ready! Click Start when you're ready to play.")
		hud.show_start_button(true)
	else:
		hud.set_lobby_status("Connected. Waiting for host to start...")

func _on_peer_disconnected(payload) -> void:
	if state != State.ONLINE_GAME and state != State.IN_LOBBY:
		return
	var disconnected_id: String = payload.get("userId", "")
	if disconnected_id != peer_id:
		return
	_leave_current_lobby()

func _on_lobby_left(_payload) -> void:
	current_lobby_id = ""
	peer_id = ""
	peer_connected = false

func _on_lobby_kicked(_payload) -> void:
	current_lobby_id = ""
	peer_id = ""
	peer_connected = false
	_enter_online_menu()

func _leave_current_lobby() -> void:
	var lobby_id := current_lobby_id
	current_lobby_id = ""
	peer_id = ""
	peer_connected = false
	if lobby_id != "":
		WavedashSDK.leave_lobby(lobby_id)
	_enter_online_menu()

func _find_peer_in_users(users: Array, self_id: String) -> String:
	for u in users:
		if not (u is Dictionary):
			continue
		var uid: String = u.get("id", "")
		if uid != "" and uid != self_id:
			return uid
	return ""

# ---- P2P I/O ----

func _send_paddle(y: float) -> void:
	var payload := P2PMessage.pack({"event": "PaddleMoved", "data": {"y": y}})
	WavedashSDK.send_p2p_message("", payload, CHANNEL_PADDLE, false)

func _send_event(msg: Dictionary) -> void:
	var payload := P2PMessage.pack(msg)
	WavedashSDK.send_p2p_message("", payload, CHANNEL_EVENTS, true)

func _broadcast_paddle_if_changed() -> void:
	var my_y := left_y if is_host else right_y
	if absf(my_y - _last_sent_paddle_y) < PADDLE_SEND_EPSILON:
		return
	_last_sent_paddle_y = my_y
	_send_paddle(my_y)

func _drain_p2p() -> void:
	for paddle_packet in WavedashSDK.drain_p2p_channel(CHANNEL_PADDLE):
		var paddle_msg := P2PMessage.unpack(paddle_packet.get("payload", PackedByteArray()))
		if paddle_msg.get("event", "") == "PaddleMoved":
			_apply_remote_paddle(paddle_msg.data.y)
	for event_packet in WavedashSDK.drain_p2p_channel(CHANNEL_EVENTS):
		var event_msg := P2PMessage.unpack(event_packet.get("payload", PackedByteArray()))
		_apply_event(event_msg)

func _apply_remote_paddle(y: float) -> void:
	if is_host:
		right_y = y
	else:
		left_y = y

func _apply_event(msg: Dictionary) -> void:
	match msg.get("event", ""):
		"StartGame":
			if not is_host and state == State.IN_LOBBY:
				_enter_online_game(msg.data.pos, msg.data.vel)
		"GoalScored":
			if not is_host:
				left_score = msg.data.left_score
				right_score = msg.data.right_score
				ball_pos = msg.data.pos
				ball_vel = msg.data.vel
				_update_score_labels()

# ---- Paddles / ball ----

func _update_paddles_local(delta: float) -> void:
	left_y = _move_paddle(
		left_y, delta,
		Input.is_action_pressed("left_paddle_up"),
		Input.is_action_pressed("left_paddle_down"),
	)
	right_y = _move_paddle(
		right_y, delta,
		Input.is_action_pressed("right_paddle_up"),
		Input.is_action_pressed("right_paddle_down"),
	)

func _update_online_paddles(delta: float) -> void:
	# Your paddle responds to both W/S and arrow keys.
	var up := Input.is_action_pressed("left_paddle_up") or Input.is_action_pressed("right_paddle_up")
	var down := Input.is_action_pressed("left_paddle_down") or Input.is_action_pressed("right_paddle_down")
	if is_host:
		left_y = _move_paddle(left_y, delta, up, down)
	else:
		right_y = _move_paddle(right_y, delta, up, down)

func _move_paddle(y: float, delta: float, up: bool, down: bool) -> float:
	var dir := 0.0
	if up:
		dir -= 1.0
	if down:
		dir += 1.0
	return clampf(y + dir * PADDLE_SPEED * delta, PADDLE_H * 0.5, COURT_H - PADDLE_H * 0.5)

func _update_ball(delta: float) -> void:
	# Bounces are deterministic (pure x-flip + fixed speedup, y preserved), so
	# both host and guest run identical paddle/wall simulation. Only the host
	# is authoritative for goals, which also reseed y via a new random serve.
	var authoritative := state == State.LOCAL or (state == State.ONLINE_GAME and is_host)

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

	if not authoritative:
		return

	var scored := false
	if ball_pos.x + BALL_RADIUS < 0.0:
		right_score += 1
		serve_dir = -1
		_update_score_labels()
		_start_serve()
		scored = true
	elif ball_pos.x - BALL_RADIUS > COURT_W:
		left_score += 1
		serve_dir = 1
		_update_score_labels()
		_start_serve()
		scored = true
	if scored and state == State.ONLINE_GAME:
		_send_event({"event": "GoalScored", "data": {
			"left_score": left_score,
			"right_score": right_score,
			"pos": ball_pos,
			"vel": ball_vel,
		}})

func _ball_hits_paddle(paddle_x: float, paddle_y: float) -> bool:
	var half_w := PADDLE_W * 0.5
	var half_h := PADDLE_H * 0.5
	return ball_pos.x + BALL_RADIUS >= paddle_x - half_w \
		and ball_pos.x - BALL_RADIUS <= paddle_x + half_w \
		and ball_pos.y + BALL_RADIUS >= paddle_y - half_h \
		and ball_pos.y - BALL_RADIUS <= paddle_y + half_h

func _bounce(left_side: bool) -> void:
	# Deterministic: flip x, bump speed, leave y untouched, snap pos to paddle
	# edge. Both sides compute identically so no BallHit event is needed.
	var next_speed_x := minf(absf(ball_vel.x) * 1.05 + 24.0, MAX_BALL_SPEED_X)
	ball_vel.x = next_speed_x if left_side else -next_speed_x
	if left_side:
		ball_pos.x = LEFT_X + PADDLE_W * 0.5 + BALL_RADIUS
	else:
		ball_pos.x = RIGHT_X - PADDLE_W * 0.5 - BALL_RADIUS

func _reset_ball(dir: int) -> void:
	serve_dir = dir
	_start_serve()

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

func _reset_scores() -> void:
	left_score = 0
	right_score = 0

func _update_score_labels() -> void:
	left_score_label.text = "%s: %d" % [left_name, left_score]
	right_score_label.text = "%s: %d" % [right_name, right_score]
