extends Node2D

@export var radius: float = 10.0
@export var color: Color = Color(0.97, 0.98, 1.0, 1.0)

func _draw() -> void:
	draw_circle(Vector2.ZERO, radius, color)
