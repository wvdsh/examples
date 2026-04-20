gdjs.Game_32SceneCode = {};
gdjs.Game_32SceneCode.localVariables = [];
gdjs.Game_32SceneCode.idToCallbackMap = new Map();
gdjs.Game_32SceneCode.GDBackgroundObjects1= [];
gdjs.Game_32SceneCode.GDGroundObjects1= [];
gdjs.Game_32SceneCode.GDBallObjects1= [];
gdjs.Game_32SceneCode.GDPaddle_9595LeftObjects1= [];
gdjs.Game_32SceneCode.GDPaddle_9595RightObjects1= [];
gdjs.Game_32SceneCode.GDGoal_9595LeftObjects1= [];
gdjs.Game_32SceneCode.GDGoal_9595RightObjects1= [];
gdjs.Game_32SceneCode.GDScore_9595Player1Objects1= [];
gdjs.Game_32SceneCode.GDScore_9595Player2Objects1= [];


gdjs.Game_32SceneCode.userFunc0x944150 = function GDJSInlineCode(runtimeScene) {
"use strict";
// --- One-time setup: scene variables + Wavedash SDK ---
const scene = runtimeScene;
const game = scene.getGame();
const input = game.getInputManager();
const dt = scene.getTimeManager().getElapsedTime() / 1000;

const sv = scene.getVariables();
const v = (name) => sv.get(name);

if (!v('initialized').getAsBoolean()) {
    v('initialized').setBoolean(true);
    v('ballVx').setNumber(400);
    v('ballVy').setNumber(100);
    v('score1').setNumber(0);
    v('score2').setNumber(0);

    (async () => {
        try {
            const WavedashJS = await window.WavedashJS;
            WavedashJS.updateLoadProgressZeroToOne(1.0);
            WavedashJS.init({ debug: true });
        } catch (e) { console.warn('[wavedash] init failed:', e); }
    })();
}

// --- Constants ---
const W = 1280, H = 720;
const PADDLE_SPEED = 500;
const AI_SPEED = 350;
const BALL_SPEED = 400;
const PLAY_TOP = 40;
const PLAY_BOTTOM = 640;

// --- Object lookups ---
const ball = scene.getObjects('Ball')[0];
const pL = scene.getObjects('Paddle_Left')[0];
const pR = scene.getObjects('Paddle_Right')[0];
const s1 = scene.getObjects('Score_Player1')[0];
const s2 = scene.getObjects('Score_Player2')[0];
if (!ball || !pL || !pR) return;

// --- Left paddle: W/S ---
const pLH = pL.getHeight();
const minPaddleY = PLAY_TOP;
const maxPaddleY = PLAY_BOTTOM - pLH;

let leftDir = 0;
if (input.isKeyPressed(87)) leftDir -= 1;  // W: up
if (input.isKeyPressed(83)) leftDir += 1;  // S: down
let lpy = pL.getY() + leftDir * PADDLE_SPEED * dt;
lpy = Math.max(minPaddleY, Math.min(maxPaddleY, lpy));
pL.setY(lpy);

// --- Right paddle: simple tracking AI ---
const pRH = pR.getHeight();
const target = ball.getY() + ball.getHeight() / 2 - pRH / 2;
const dy = target - pR.getY();
const step = AI_SPEED * dt;
const move = Math.abs(dy) < step ? dy : Math.sign(dy) * step;
let rpy = Math.max(minPaddleY, Math.min(PLAY_BOTTOM - pRH, pR.getY() + move));
pR.setY(rpy);

// --- Ball physics ---
let vx = v('ballVx').getAsNumber();
let vy = v('ballVy').getAsNumber();
let bx = ball.getX() + vx * dt;
let by = ball.getY() + vy * dt;

const ballW = ball.getWidth();
const ballH = ball.getHeight();

// Top/bottom walls
if (by < PLAY_TOP && vy < 0) { vy = -vy; by = PLAY_TOP; }
if (by + ballH > PLAY_BOTTOM && vy > 0) { vy = -vy; by = PLAY_BOTTOM - ballH; }

// AABB vs paddle (flip vx only, avoids edge-tunneling)
function hit(p) {
    return bx < p.getX() + p.getWidth() && bx + ballW > p.getX()
        && by < p.getY() + p.getHeight() && by + ballH > p.getY();
}
if (hit(pL) && vx < 0) { vx = -vx; bx = pL.getX() + pL.getWidth(); }
if (hit(pR) && vx > 0) { vx = -vx; bx = pR.getX() - ballW; }

// Scoring
function reset(dir) {
    bx = W / 2 - ballW / 2;
    by = H / 2 - ballH / 2;
    vx = BALL_SPEED * dir;
    vy = (Math.random() - 0.5) * 200;
}
if (bx + ballW < 0) { v('score2').setNumber(v('score2').getAsNumber() + 1); reset(-1); }
else if (bx > W)    { v('score1').setNumber(v('score1').getAsNumber() + 1); reset(1); }

ball.setX(bx); ball.setY(by);
v('ballVx').setNumber(vx);
v('ballVy').setNumber(vy);

// Score text
if (s1) s1.setString(String(v('score1').getAsNumber() | 0));
if (s2) s2.setString(String(v('score2').getAsNumber() | 0));

};
gdjs.Game_32SceneCode.eventsList0 = function(runtimeScene) {

{


gdjs.Game_32SceneCode.userFunc0x944150(runtimeScene);

}


};

gdjs.Game_32SceneCode.func = function(runtimeScene) {
runtimeScene.getOnceTriggers().startNewFrame();

gdjs.Game_32SceneCode.GDBackgroundObjects1.length = 0;
gdjs.Game_32SceneCode.GDGroundObjects1.length = 0;
gdjs.Game_32SceneCode.GDBallObjects1.length = 0;
gdjs.Game_32SceneCode.GDPaddle_9595LeftObjects1.length = 0;
gdjs.Game_32SceneCode.GDPaddle_9595RightObjects1.length = 0;
gdjs.Game_32SceneCode.GDGoal_9595LeftObjects1.length = 0;
gdjs.Game_32SceneCode.GDGoal_9595RightObjects1.length = 0;
gdjs.Game_32SceneCode.GDScore_9595Player1Objects1.length = 0;
gdjs.Game_32SceneCode.GDScore_9595Player2Objects1.length = 0;

gdjs.Game_32SceneCode.eventsList0(runtimeScene);
gdjs.Game_32SceneCode.GDBackgroundObjects1.length = 0;
gdjs.Game_32SceneCode.GDGroundObjects1.length = 0;
gdjs.Game_32SceneCode.GDBallObjects1.length = 0;
gdjs.Game_32SceneCode.GDPaddle_9595LeftObjects1.length = 0;
gdjs.Game_32SceneCode.GDPaddle_9595RightObjects1.length = 0;
gdjs.Game_32SceneCode.GDGoal_9595LeftObjects1.length = 0;
gdjs.Game_32SceneCode.GDGoal_9595RightObjects1.length = 0;
gdjs.Game_32SceneCode.GDScore_9595Player1Objects1.length = 0;
gdjs.Game_32SceneCode.GDScore_9595Player2Objects1.length = 0;


return;

}

gdjs['Game_32SceneCode'] = gdjs.Game_32SceneCode;
