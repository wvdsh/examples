class_name HudMenu
extends CanvasLayer

@onready var main_menu: Panel = $MainMenu
@onready var online_menu: Panel = $OnlineMenu
@onready var lobby_view: Panel = $LobbyView
@onready var lobby_list: VBoxContainer = $OnlineMenu/HBox/RightPanel/ScrollContainer/LobbyList
@onready var empty_label: Label = $OnlineMenu/HBox/RightPanel/ScrollContainer/LobbyList/EmptyLabel
@onready var lobby_header: Label = $LobbyView/VBox/LobbyHeader
@onready var lobby_status: Label = $LobbyView/VBox/StatusLabel
@onready var start_button: Button = $LobbyView/VBox/StartButton

func show_main_menu() -> void:
	main_menu.visible = true
	online_menu.visible = false
	lobby_view.visible = false

func show_online_menu() -> void:
	main_menu.visible = false
	online_menu.visible = true
	lobby_view.visible = false

func show_lobby_view() -> void:
	main_menu.visible = false
	online_menu.visible = false
	lobby_view.visible = true

func hide_all() -> void:
	main_menu.visible = false
	online_menu.visible = false
	lobby_view.visible = false

func clear_lobby_list() -> void:
	for child in lobby_list.get_children():
		if child == empty_label:
			continue
		child.queue_free()

func populate_lobby_list(lobbies: Array, on_select: Callable) -> void:
	clear_lobby_list()
	var shown := 0
	for lobby in lobbies:
		var lobby_id: String = lobby.get("lobbyId", "")
		if lobby_id == "":
			continue
		var host_username := WavedashSDK.get_lobby_data_string(lobby_id, "host_username")
		var label := host_username if host_username != "" else lobby_id.substr(0, 6)
		var btn := Button.new()
		btn.text = "%s's game" % label
		btn.custom_minimum_size = Vector2(0, 36)
		btn.pressed.connect(func(): on_select.call(lobby_id))
		lobby_list.add_child(btn)
		lobby_list.move_child(btn, lobby_list.get_child_count() - 2)  # keep EmptyLabel last
		shown += 1
	empty_label.visible = shown == 0

func set_lobby_header(text: String) -> void:
	lobby_header.text = text

func set_lobby_status(text: String) -> void:
	lobby_status.text = text

func show_start_button(show: bool) -> void:
	start_button.visible = show
