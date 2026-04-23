import 'dart:js_interop';
import 'dart:math' as math;
import 'package:flame/camera.dart';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// --- Wavedash SDK bridge ---

@JS('WavedashJS.init')
external void _wavedashInit();

@JS('WavedashJS.updateLoadProgressZeroToOne')
external void _wavedashUpdateProgress(double p);

void wavedashInit() {
  _wavedashUpdateProgress(1.0);
  _wavedashInit();
}

// --- Constants ---

const double screenW    = 900;
const double screenH    = 600;
const double paddleW    = 15;
const double paddleH    = 100;
const double ballSize   = 15;
const double paddleEdge = 50;
const double paddleSpd  = 500;
const double aiSpd      = 350;
const double ballSpd    = 400;

// --- Components ---

class PongGame extends FlameGame with KeyboardEvents {
  late RectangleComponent leftPad, rightPad, ball, centerLine;
  late TextComponent scoreLeft, scoreRight;

  double leftY  = screenH / 2 - paddleH / 2;
  double rightY = screenH / 2 - paddleH / 2;
  double bx     = screenW / 2 - ballSize / 2;
  double by     = screenH / 2 - ballSize / 2;
  double bvx    = ballSpd;
  double bvy    = ballSpd * 0.25;
  int ls = 0, rs = 0;
  bool upPressed = false, downPressed = false;

  @override
  Future<void> onLoad() async {
    wavedashInit();

    // Letterbox the 900x600 play field to fit the browser window.
    camera.viewport = FixedResolutionViewport(resolution: Vector2(screenW, screenH));
    camera.viewfinder.position = Vector2(screenW / 2, screenH / 2);

    final bg = RectangleComponent(
      size: Vector2(screenW, screenH),
      paint: Paint()..color = const Color(0xFF0A0A0A),
    );
    world.add(bg);

    centerLine = RectangleComponent(
      position: Vector2(screenW / 2 - 1, 0),
      size: Vector2(2, screenH),
      paint: Paint()..color = const Color(0x28FFFFFF),
    );
    world.add(centerLine);

    leftPad = RectangleComponent(
      position: Vector2(paddleEdge, leftY),
      size: Vector2(paddleW, paddleH),
      paint: Paint()..color = const Color(0xFFFFFFFF),
    );
    world.add(leftPad);

    rightPad = RectangleComponent(
      position: Vector2(screenW - paddleEdge - paddleW, rightY),
      size: Vector2(paddleW, paddleH),
      paint: Paint()..color = const Color(0xFFFFFFFF),
    );
    world.add(rightPad);

    ball = RectangleComponent(
      position: Vector2(bx, by),
      size: Vector2(ballSize, ballSize),
      paint: Paint()..color = const Color(0xFFFFFFFF),
    );
    world.add(ball);

    scoreLeft = TextComponent(
      text: '0',
      position: Vector2(screenW / 2 - 52, 20),
      textRenderer: TextPaint(
        style: const TextStyle(
          color: Color(0x4DFFFFFF),
          fontSize: 40,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
    world.add(scoreLeft);

    scoreRight = TextComponent(
      text: '0',
      position: Vector2(screenW / 2 + 12, 20),
      textRenderer: TextPaint(
        style: const TextStyle(
          color: Color(0x4DFFFFFF),
          fontSize: 40,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
    world.add(scoreRight);
  }

  @override
  KeyEventResult onKeyEvent(KeyEvent event, Set<LogicalKeyboardKey> keys) {
    upPressed = keys.contains(LogicalKeyboardKey.arrowUp) ||
        keys.contains(LogicalKeyboardKey.keyW);
    downPressed = keys.contains(LogicalKeyboardKey.arrowDown) ||
        keys.contains(LogicalKeyboardKey.keyS);
    return KeyEventResult.handled;
  }

  double _clamp(double v, double lo, double hi) => math.max(lo, math.min(hi, v));

  void _resetBall(double dir) {
    bx = screenW / 2 - ballSize / 2;
    by = screenH / 2 - ballSize / 2;
    bvx = ballSpd * dir;
    bvy = ballSpd * 0.25;
  }

  @override
  void update(double dt) {
    super.update(dt);

    // Left paddle
    if (upPressed)   leftY -= paddleSpd * dt;
    if (downPressed) leftY += paddleSpd * dt;
    leftY = _clamp(leftY, 0, screenH - paddleH);
    leftPad.position.y = leftY;

    // Right paddle AI
    final target = by - paddleH / 2;
    final diff   = target - rightY;
    final step   = aiSpd * dt;
    if (diff.abs() < step) {
      rightY = target;
    } else {
      rightY += diff > 0 ? step : -step;
    }
    rightY = _clamp(rightY, 0, screenH - paddleH);
    rightPad.position.y = rightY;

    // Ball
    bx += bvx * dt;
    by += bvy * dt;

    // Wall bounce
    if (by < 0)                   { by = 0;                   bvy = -bvy; }
    if (by > screenH - ballSize)  { by = screenH - ballSize;  bvy = -bvy; }

    // Left paddle collision
    if (bvx < 0 &&
        bx < paddleEdge + paddleW && bx + ballSize > paddleEdge &&
        by + ballSize > leftY && by < leftY + paddleH) {
      bx  = paddleEdge + paddleW;
      bvx = -bvx;
    }

    // Right paddle collision
    final rx = screenW - paddleEdge - paddleW;
    if (bvx > 0 &&
        bx + ballSize > rx && bx < rx + paddleW &&
        by + ballSize > rightY && by < rightY + paddleH) {
      bx  = rx - ballSize;
      bvx = -bvx;
    }

    // Scoring
    if (bx + ballSize < 0) {
      rs++;
      scoreRight.text = '$rs';
      _resetBall(1);
    }
    if (bx > screenW) {
      ls++;
      scoreLeft.text = '$ls';
      _resetBall(-1);
    }

    ball.position = Vector2(bx, by);
  }
}

void main() {
  runApp(GameWidget(game: PongGame()));
}
