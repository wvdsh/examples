class_name P2PMessage
extends RefCounted

const EVENT_PADDLE_MOVED := 0
const EVENT_GOAL_SCORED := 2
const EVENT_START_GAME := 3

static func pack(msg: Dictionary) -> PackedByteArray:
	var buf := StreamPeerBuffer.new()
	buf.big_endian = false
	match msg.get("event", ""):
		"PaddleMoved":
			buf.put_u8(EVENT_PADDLE_MOVED)
			buf.put_float(msg.data.y)
		"GoalScored":
			buf.put_u8(EVENT_GOAL_SCORED)
			buf.put_u32(msg.data.left_score)
			buf.put_u32(msg.data.right_score)
			buf.put_float(msg.data.pos.x)
			buf.put_float(msg.data.pos.y)
			buf.put_float(msg.data.vel.x)
			buf.put_float(msg.data.vel.y)
		"StartGame":
			buf.put_u8(EVENT_START_GAME)
			buf.put_float(msg.data.pos.x)
			buf.put_float(msg.data.pos.y)
			buf.put_float(msg.data.vel.x)
			buf.put_float(msg.data.vel.y)
		_:
			push_warning("P2PMessage.pack: unknown event ", msg.get("event", ""))
	return buf.data_array

static func unpack(data: PackedByteArray) -> Dictionary:
	if data.is_empty():
		return {}
	var buf := StreamPeerBuffer.new()
	buf.big_endian = false
	buf.data_array = data
	var event_id := buf.get_u8()
	match event_id:
		EVENT_PADDLE_MOVED:
			return {"event": "PaddleMoved", "data": {"y": buf.get_float()}}
		EVENT_GOAL_SCORED:
			return {"event": "GoalScored", "data": {
				"left_score": buf.get_u32(),
				"right_score": buf.get_u32(),
				"pos": Vector2(buf.get_float(), buf.get_float()),
				"vel": Vector2(buf.get_float(), buf.get_float()),
			}}
		EVENT_START_GAME:
			return {"event": "StartGame", "data": {
				"pos": Vector2(buf.get_float(), buf.get_float()),
				"vel": Vector2(buf.get_float(), buf.get_float()),
			}}
	push_warning("P2PMessage.unpack: unknown event id ", event_id)
	return {}
