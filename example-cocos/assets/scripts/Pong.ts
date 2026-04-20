import {
    _decorator,
    Component,
    Node,
    Vec2,
    Camera,
    Canvas,
    Sprite,
    UITransform,
    input,
    Input,
    EventKeyboard,
    KeyCode,
} from 'cc';

const { ccclass, property } = _decorator;

declare global {
    interface Window {
        WavedashJS: any;
    }
}

// Arena
const LEFT_WALL = -450;
const RIGHT_WALL = 450;
const TOP_WALL = 300;
const BOTTOM_WALL = -300;
const WALL_THICKNESS = 10;
const FIELD_W = RIGHT_WALL - LEFT_WALL;

// Paddle
const PADDLE_W = 20;
const PADDLE_H = 120;
const PADDLE_SPEED = 500;
const AI_SPEED = 350;
const PADDLE_X = 400;
const PADDLE_PADDING = 10;

// Ball
const BALL_SIZE = 20;
const BALL_SPEED = 400;

interface Rect { x: number; y: number; w: number; h: number; }

@ccclass('Pong')
export class Pong extends Component {
    // Drag the authored scene Nodes onto these slots in the Inspector.
    @property(Node) leftPaddle: Node = null!;
    @property(Node) rightPaddle: Node = null!;
    @property(Node) ball: Node = null!;

    private leftPaddleY = 0;
    private rightPaddleY = 0;
    private ballPos = new Vec2(0, 0);
    private ballVel = new Vec2(0, 0);

    private leftScore = 0;
    private rightScore = 0;

    private keys: Record<number, boolean> = {};

    start() {
        // Wavedash SDK init
        (async () => {
            try {
                const WavedashJS = await (window as any).WavedashJS;
                if (WavedashJS) {
                    WavedashJS.updateLoadProgressZeroToOne(1.0);
                    WavedashJS.init({ debug: true });
                }
            } catch (e) {
                console.warn('[wavedash] init failed:', e);
            }
        })();

        // --- Diagnostic: dump scene/camera/sprite state ---
        const canvas = this.node.getComponent(Canvas);
        const camera = this.node.getComponent(Camera);
        console.log('[pong/diag] this.node =', this.node.name, 'layer', this.node.layer, 'active', this.node.active);
        console.log('[pong/diag] Canvas component =', canvas);
        if (canvas) console.log('[pong/diag]   cameraComponent =', canvas.cameraComponent, 'alignCanvasWithScreen =', canvas.alignCanvasWithScreen);
        console.log('[pong/diag] Camera component =', camera);
        if (camera) {
            console.log('[pong/diag]   visibility =', camera.visibility.toString(16), 'priority =', camera.priority);
            console.log('[pong/diag]   clearFlags =', camera.clearFlags, 'projection =', camera.projection, 'orthoHeight =', camera.orthoHeight);
            console.log('[pong/diag]   node.worldPosition =', camera.node.worldPosition.toString());
        }
        console.log('[pong/diag] children of Canvas:');
        for (const child of this.node.children) {
            const sprite = child.getComponent(Sprite);
            const ui = child.getComponent(UITransform);
            console.log('[pong/diag]  -', child.name,
                'active', child.active,
                'layer', child.layer.toString(16),
                'worldPos', child.worldPosition.toString(),
                'UITransform', ui ? `${ui.width}x${ui.height} anchor ${ui.anchorX},${ui.anchorY}` : 'NONE',
                'Sprite', sprite ? `enabled=${sprite.enabled} spriteFrame=${sprite.spriteFrame?.name ?? 'NULL'} sizeMode=${sprite.sizeMode} color=${sprite.color.toHEX()}` : 'NONE');
        }

        // Init ball
        const dir = new Vec2(1, 0.25).normalize();
        this.ballPos.set(0, 0);
        this.ballVel.set(dir.x * BALL_SPEED, dir.y * BALL_SPEED);

        // Keyboard
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(e: EventKeyboard) { this.keys[e.keyCode] = true; }
    private onKeyUp(e: EventKeyboard) { this.keys[e.keyCode] = false; }

    update(dt: number) {
        this.movePaddles(dt);
        this.applyVelocity(dt);
        this.checkCollisions();
        this.syncTransforms();
    }

    private movePaddles(dt: number) {
        // Left: W / S
        let leftDir = 0;
        if (this.keys[KeyCode.KEY_W]) leftDir += 1;
        if (this.keys[KeyCode.KEY_S]) leftDir -= 1;
        this.leftPaddleY = this.clampPaddle(this.leftPaddleY + leftDir * PADDLE_SPEED * dt);

        // Right paddle: simple tracking AI. Move toward ball y, capped at AI_SPEED.
        const dy = this.ballPos.y - this.rightPaddleY;
        const step = AI_SPEED * dt;
        const move = Math.abs(dy) < step ? dy : Math.sign(dy) * step;
        this.rightPaddleY = this.clampPaddle(this.rightPaddleY + move);
    }

    private clampPaddle(y: number): number {
        const maxY = TOP_WALL - WALL_THICKNESS / 2 - PADDLE_H / 2 - PADDLE_PADDING;
        const minY = BOTTOM_WALL + WALL_THICKNESS / 2 + PADDLE_H / 2 + PADDLE_PADDING;
        return Math.max(minY, Math.min(maxY, y));
    }

    private applyVelocity(dt: number) {
        this.ballPos.x += this.ballVel.x * dt;
        this.ballPos.y += this.ballVel.y * dt;
    }

    private checkCollisions() {
        if (this.ballPos.x < LEFT_WALL - BALL_SIZE) {
            this.rightScore += 1;
            console.log('[pong] score', this.leftScore, '-', this.rightScore);
            this.ballPos.set(0, 0);
            const d = new Vec2(-1, 0.25).normalize();
            this.ballVel.set(d.x * BALL_SPEED, d.y * BALL_SPEED);
            return;
        }
        if (this.ballPos.x > RIGHT_WALL + BALL_SIZE) {
            this.leftScore += 1;
            console.log('[pong] score', this.leftScore, '-', this.rightScore);
            this.ballPos.set(0, 0);
            const d = new Vec2(1, 0.25).normalize();
            this.ballVel.set(d.x * BALL_SPEED, d.y * BALL_SPEED);
            return;
        }

        // Paddles: always bounce horizontally (avoids edge-detection tunneling
        // when the paddle moves into the ball from the side).
        const paddles: Rect[] = [
            { x: -PADDLE_X, y: this.leftPaddleY, w: PADDLE_W, h: PADDLE_H },
            { x: PADDLE_X, y: this.rightPaddleY, w: PADDLE_W, h: PADDLE_H },
        ];
        for (const p of paddles) {
            if (aabbOverlap(this.ballPos, BALL_SIZE / 2, p)) {
                // Flip toward the opposite side of the paddle.
                const newSign = this.ballPos.x < p.x ? -1 : 1;
                if (Math.sign(this.ballVel.x) !== newSign) {
                    this.ballVel.x = Math.abs(this.ballVel.x) * newSign;
                }
            }
        }

        // Walls: flip vertically when hit from the correct side.
        const walls: Rect[] = [
            { x: 0, y: TOP_WALL, w: FIELD_W + WALL_THICKNESS, h: WALL_THICKNESS },
            { x: 0, y: BOTTOM_WALL, w: FIELD_W + WALL_THICKNESS, h: WALL_THICKNESS },
        ];
        for (const w of walls) {
            if (aabbOverlap(this.ballPos, BALL_SIZE / 2, w)) {
                const newSign = this.ballPos.y < w.y ? -1 : 1;
                if (Math.sign(this.ballVel.y) !== newSign) {
                    this.ballVel.y = Math.abs(this.ballVel.y) * newSign;
                }
            }
        }
    }

    private syncTransforms() {
        if (this.leftPaddle) this.leftPaddle.setPosition(-PADDLE_X, this.leftPaddleY, 0);
        if (this.rightPaddle) this.rightPaddle.setPosition(PADDLE_X, this.rightPaddleY, 0);
        if (this.ball) this.ball.setPosition(this.ballPos.x, this.ballPos.y, 0);
    }
}

function aabbOverlap(ballCenter: Vec2, ballRadius: number, rect: Rect): boolean {
    const rx = rect.x - rect.w / 2;
    const ry = rect.y - rect.h / 2;
    const closestX = Math.max(rx, Math.min(ballCenter.x, rx + rect.w));
    const closestY = Math.max(ry, Math.min(ballCenter.y, ry + rect.h));
    const dx = ballCenter.x - closestX;
    const dy = ballCenter.y - closestY;
    return dx * dx + dy * dy <= ballRadius * ballRadius;
}
