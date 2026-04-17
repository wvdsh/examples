import * as THREE from "./vendor/three.module.js";

const WavedashJS = await window.WavedashJS;

/* ── Constants ────────────────────────────────────── */

const FIELD_W = 16;
const FIELD_H = 9;
const PADDLE_W = 0.35;
const PADDLE_H = 2;
const BALL_SIZE = 0.35;
const PADDLE_SPEED = 9;
const BALL_SPEED_X = 6.5;
const BALL_SPEED_Y = 2.8;
const MAX_VX = 12;
const LEFT_X = -FIELD_W / 2 + 0.9;
const RIGHT_X = FIELD_W / 2 - 0.9;
const LOBBY_VISIBILITY_PUBLIC = 0;

// P2P channels:
//   0 = paddle position, unreliable
//   1 = events (StartGame / GoalScored), reliable
const CHANNEL_PADDLE = 0;
const CHANNEL_EVENTS = 1;
const PADDLE_SEND_EPSILON = 0.01;

/* ── Three.js scene ───────────────────────────────── */

const canvas = document.getElementById("wavedash-target");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a);

const camera = new THREE.OrthographicCamera(-FIELD_W / 2, FIELD_W / 2, FIELD_H / 2, -FIELD_H / 2, 0.1, 100);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  const fieldAspect = FIELD_W / FIELD_H;
  if (aspect > fieldAspect) {
    const halfH = FIELD_H / 2;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
  } else {
    const halfW = FIELD_W / 2;
    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfW / aspect;
    camera.bottom = -halfW / aspect;
  }
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener("resize", resize);

function makeRect(w, h, color) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color })
  );
  scene.add(mesh);
  return mesh;
}

const centerLine = makeRect(0.08, FIELD_H, 0x1e293b);
centerLine.position.z = -1;
const leftPaddle = makeRect(PADDLE_W, PADDLE_H, 0x3b82f6);
const rightPaddle = makeRect(PADDLE_W, PADDLE_H, 0xef4444);
const ball = new THREE.Mesh(
  new THREE.CircleGeometry(BALL_SIZE / 2, 32),
  new THREE.MeshBasicMaterial({ color: 0xf1f5f9 })
);
scene.add(ball);
leftPaddle.position.x = LEFT_X;
rightPaddle.position.x = RIGHT_X;

/* ── HUD (built entirely in JS) ───────────────────── */

function injectStyles() {
  const css = `
    [hidden] { display: none !important; }
    .wd-scoreboard {
      position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 48px; user-select: none; pointer-events: none;
    }
    .wd-scoreboard .side { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .wd-scoreboard .name { font-size: 18px; font-weight: 500; opacity: 0.75; letter-spacing: 0.05em; }
    .wd-scoreboard .value { font-size: 64px; font-weight: 700; letter-spacing: 0.08em; }

    .wd-hud { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
    .wd-panel {
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 32px;
      min-width: 320px;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
      pointer-events: auto;
    }
    .wd-panel h1 { margin: 0 0 24px; font-size: 28px; font-weight: 700; letter-spacing: 0.05em; text-align: center; }
    .wd-panel h2 { margin: 0 0 12px; font-size: 16px; font-weight: 600; opacity: 0.75; letter-spacing: 0.08em; text-transform: uppercase; }
    .wd-col { display: flex; flex-direction: column; gap: 12px; }
    .wd-row { display: flex; gap: 24px; }
    .wd-btn {
      background: #3b82f6; color: white; border: none; border-radius: 10px;
      padding: 12px 18px; font-size: 16px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: background 0.15s ease, transform 0.05s ease;
    }
    .wd-btn:hover { background: #2563eb; }
    .wd-btn:active { transform: translateY(1px); }
    .wd-btn.secondary { background: rgba(255, 255, 255, 0.08); }
    .wd-btn.secondary:hover { background: rgba(255, 255, 255, 0.16); }

    .wd-online { min-width: 640px; }
    .wd-online .left { min-width: 200px; }
    .wd-online .right { flex: 1; }
    .wd-lobby-list {
      background: rgba(0, 0, 0, 0.25); border-radius: 10px; padding: 8px;
      max-height: 320px; min-height: 160px; overflow-y: auto;
      display: flex; flex-direction: column; gap: 6px;
    }
    .wd-lobby-entry { background: rgba(255, 255, 255, 0.06); text-align: left; width: 100%; }
    .wd-lobby-empty { opacity: 0.5; text-align: center; padding: 24px 0; font-size: 14px; }
    .wd-status { opacity: 0.75; margin: 8px 0 20px; text-align: center; }
    .wd-matchup { font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 4px; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
}
injectStyles();

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "onClick") node.addEventListener("click", v);
    else if (k === "hidden") node.hidden = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) {
    if (c != null) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

// Scoreboard
const leftNameEl = el("div", { class: "name", text: "Player" });
const leftScoreEl = el("div", { class: "value", text: "0" });
const rightNameEl = el("div", { class: "name", text: "Guest" });
const rightScoreEl = el("div", { class: "value", text: "0" });
const scoreboard = el(
  "div",
  { class: "wd-scoreboard", hidden: true },
  el("div", { class: "side" }, leftNameEl, leftScoreEl),
  el("div", { class: "side" }, rightNameEl, rightScoreEl)
);

// Main menu
const mainMenu = el(
  "div",
  { class: "wd-panel wd-col", hidden: true },
  el("h1", { text: "Pong" }),
  el("button", { class: "wd-btn", text: "Play Local", onClick: enterLocalGame }),
  el("button", { class: "wd-btn", text: "Play Online", onClick: enterOnlineMenu })
);

// Online menu
const lobbyListEl = el("div", { class: "wd-lobby-list" });
const onlineMenu = el(
  "div",
  { class: "wd-panel wd-row wd-online", hidden: true },
  el(
    "div",
    { class: "wd-col left" },
    el("h2", { text: "Online" }),
    el("button", { class: "wd-btn", text: "Create Lobby", onClick: onCreateLobby }),
    el("button", { class: "wd-btn secondary", text: "Refresh List", onClick: refreshLobbies }),
    el("button", { class: "wd-btn secondary", text: "Back", onClick: enterMenu })
  ),
  el(
    "div",
    { class: "wd-col right" },
    el("h2", { text: "Lobbies" }),
    lobbyListEl
  )
);

// Lobby view
const lobbyMatchupEl = el("div", { class: "wd-matchup", text: "Host vs ..." });
const lobbyStatusEl = el("div", { class: "wd-status", text: "" });
const startGameBtn = el("button", { class: "wd-btn", text: "Start Game", hidden: true, onClick: onStartGame });
const lobbyView = el(
  "div",
  { class: "wd-panel wd-col", hidden: true },
  el("h1", { text: "Lobby" }),
  lobbyMatchupEl,
  lobbyStatusEl,
  startGameBtn,
  el("button", { class: "wd-btn secondary", text: "Leave", onClick: leaveCurrentLobby })
);

const hud = el("div", { class: "wd-hud" }, mainMenu, onlineMenu, lobbyView);
document.body.appendChild(scoreboard);
document.body.appendChild(hud);

function showPanel(panel) {
  for (const p of [mainMenu, onlineMenu, lobbyView]) p.hidden = p !== panel;
}
function setGameplayVisible(show) {
  leftPaddle.visible = show;
  rightPaddle.visible = show;
  ball.visible = show;
  centerLine.visible = show;
  scoreboard.hidden = !show;
}
setGameplayVisible(false);

function updateScoreboard() {
  leftNameEl.textContent = leftName;
  rightNameEl.textContent = rightName;
  leftScoreEl.textContent = leftScore;
  rightScoreEl.textContent = rightScore;
}
function setLobbyMatchup() {
  lobbyMatchupEl.textContent = `${leftName}   vs   ${rightName}`;
}

/* ── Game state ───────────────────────────────────── */

const State = {
  MENU: "MENU",
  LOCAL: "LOCAL",
  ONLINE_MENU: "ONLINE_MENU",
  IN_LOBBY: "IN_LOBBY",
  ONLINE_GAME: "ONLINE_GAME"
};

let state = State.MENU;
let isHost = false;
let currentLobbyId = "";
let peerId = "";
let peerConnected = false;

let leftY = 0, rightY = 0;
let ballX = 0, ballY = 0, ballVx = 0, ballVy = 0;
let leftScore = 0, rightScore = 0;
let leftName = "Player", rightName = "Guest";
let serveDir = 1;
let lastSentPaddleY = Infinity;

const input = { leftUp: false, leftDown: false, rightUp: false, rightDown: false };

const KEY_MAP = {
  KeyW: "leftUp",
  KeyS: "leftDown",
  ArrowUp: "rightUp",
  ArrowDown: "rightDown"
};

window.addEventListener("keydown", (e) => {
  const key = KEY_MAP[e.code];
  if (key) { input[key] = true; e.preventDefault(); return; }
  if (e.code === "Escape") onEscape();
});
window.addEventListener("keyup", (e) => {
  const key = KEY_MAP[e.code];
  if (key) { input[key] = false; e.preventDefault(); }
});
window.addEventListener("blur", () => {
  input.leftUp = input.leftDown = input.rightUp = input.rightDown = false;
});

/* ── State transitions ────────────────────────────── */

function enterMenu() {
  state = State.MENU;
  setGameplayVisible(false);
  showPanel(mainMenu);
}

function enterLocalGame() {
  state = State.LOCAL;
  leftScore = 0; rightScore = 0;
  leftName = WavedashJS.getUsername() || "Player";
  rightName = "Guest";
  serveDir = 1;
  resetBall();
  updateScoreboard();
  showPanel(null);
  setGameplayVisible(true);
}

function enterOnlineMenu() {
  state = State.ONLINE_MENU;
  peerId = "";
  peerConnected = false;
  setGameplayVisible(false);
  showPanel(onlineMenu);
  refreshLobbies();
}

function enterLobby(hostRole) {
  state = State.IN_LOBBY;
  isHost = hostRole;
  peerConnected = false;
  leftScore = 0; rightScore = 0;
  const self = WavedashJS.getUsername() || "Player";
  if (isHost) {
    leftName = self;
    rightName = "Waiting...";
    lobbyStatusEl.textContent = "Share this lobby with a friend";
  } else {
    leftName = (peerId && WavedashJS.getUsername(peerId)) || "Host";
    rightName = self;
    lobbyStatusEl.textContent = "Waiting for host to start...";
  }
  setLobbyMatchup();
  startGameBtn.hidden = true;
  updateScoreboard();
  setGameplayVisible(false);
  showPanel(lobbyView);
}

function enterOnlineGame(pos, vel) {
  state = State.ONLINE_GAME;
  ballX = pos.x; ballY = pos.y;
  ballVx = vel.x; ballVy = vel.y;
  leftY = 0; rightY = 0;
  lastSentPaddleY = Infinity;
  showPanel(null);
  updateScoreboard();
  setGameplayVisible(true);
}

function onEscape() {
  if (state === State.LOCAL) enterMenu();
  else if (state === State.ONLINE_MENU) enterMenu();
  else if (state === State.IN_LOBBY || state === State.ONLINE_GAME) leaveCurrentLobby();
}

/* ── Online menu handlers ─────────────────────────── */

async function refreshLobbies() {
  const response = await WavedashJS.listAvailableLobbies();
  if (state !== State.ONLINE_MENU) return;
  renderLobbyList((response && response.data) || []);
}

function renderLobbyList(lobbies) {
  lobbyListEl.innerHTML = "";
  if (!lobbies.length) {
    lobbyListEl.appendChild(el("div", { class: "wd-lobby-empty", text: "No lobbies yet." }));
    return;
  }
  for (const lobby of lobbies) {
    const id = lobby.lobbyId;
    if (!id) continue;
    const hostUsername = WavedashJS.getLobbyData(id, "host_username");
    const label = hostUsername || id.slice(0, 6);
    lobbyListEl.appendChild(el("button", {
      class: "wd-btn wd-lobby-entry",
      text: `${label}'s game`,
      onClick: () => tryJoinLobby(id)
    }));
  }
}

async function tryJoinLobby(lobbyId) {
  const response = await WavedashJS.joinLobby(lobbyId);
  if (response && response.success) return;
  // Stale/full/gone — the list is out of date, so pull a fresh one.
  if (state === State.ONLINE_MENU) refreshLobbies();
}

async function onCreateLobby() {
  const maxPlayers = 2;
  const response = await WavedashJS.createLobby(LOBBY_VISIBILITY_PUBLIC, maxPlayers);
  if (!response || !response.success) return;
  const lobbyId = response.data;
  const username = WavedashJS.getUsername();
  if (username) WavedashJS.setLobbyData(lobbyId, "host_username", username);
  // LobbyJoined event fires for the host and drives the state transition.
}

async function leaveCurrentLobby() {
  const id = currentLobbyId;
  currentLobbyId = "";
  peerId = "";
  peerConnected = false;
  if (id) await WavedashJS.leaveLobby(id);
  enterOnlineMenu();
}

function onStartGame() {
  if (!isHost || !peerConnected) return;
  serveDir = 1;
  const pos = { x: 0, y: 0 };
  let vy = (Math.random() - 0.5) * BALL_SPEED_Y * 2;
  if (Math.abs(vy) < 1.2) vy = vy < 0 ? -1.5 : 1.5;
  const vel = { x: serveDir * BALL_SPEED_X, y: vy };
  sendEvent({ event: "StartGame", pos, vel });
  enterOnlineGame(pos, vel);
}

/* ── SDK event wiring ─────────────────────────────── */

WavedashJS.addEventListener(WavedashJS.Events.LOBBY_JOINED, (e) => {
  const payload = e.detail;
  currentLobbyId = payload.lobbyId;
  const selfId = WavedashJS.getUserId();
  const hostRole = payload.hostId === selfId;
  peerId = findPeer(payload.users || [], selfId);
  enterLobby(hostRole);
  if (peerId && isHost) {
    rightName = "Connecting...";
    setLobbyMatchup();
    lobbyStatusEl.textContent = "Establishing P2P connection...";
  }
});

WavedashJS.addEventListener(WavedashJS.Events.LOBBY_USERS_UPDATED, (e) => {
  if (state !== State.IN_LOBBY && state !== State.ONLINE_GAME) return;
  const { userId, changeType } = e.detail;
  if (userId === WavedashJS.getUserId()) return;
  if (changeType === "JOINED") {
    if (peerId === userId) return;
    peerId = userId;
    if (isHost) {
      rightName = "Connecting...";
      setLobbyMatchup();
      lobbyStatusEl.textContent = "Establishing P2P connection...";
    }
  } else if (changeType === "LEFT" && userId === peerId) {
    // Peer bailed before the P2P connection went live; post-connection leaves
    // flow through P2PPeerDisconnected below.
    peerId = "";
    peerConnected = false;
    if (state === State.ONLINE_GAME) {
      leaveCurrentLobby();
    } else {
      rightName = isHost ? "Waiting..." : rightName;
      setLobbyMatchup();
      lobbyStatusEl.textContent = "Share this lobby with a friend";
      startGameBtn.hidden = true;
    }
  }
});

WavedashJS.addEventListener(WavedashJS.Events.P2P_CONNECTION_ESTABLISHED, (e) => {
  if (state !== State.IN_LOBBY) return;
  const { userId, username } = e.detail;
  if (!peerId) peerId = userId;
  else if (userId !== peerId) return;
  peerConnected = true;
  const peerUsername = username || WavedashJS.getUsername(peerId) || "Guest";
  if (isHost) {
    rightName = peerUsername;
    setLobbyMatchup();
    lobbyStatusEl.textContent = "Ready! Click Start when you're ready to play.";
    startGameBtn.hidden = false;
  } else {
    leftName = peerUsername;
    setLobbyMatchup();
    lobbyStatusEl.textContent = "Connected. Waiting for host to start...";
  }
});

WavedashJS.addEventListener(WavedashJS.Events.P2P_PEER_DISCONNECTED, (e) => {
  if (state !== State.IN_LOBBY && state !== State.ONLINE_GAME) return;
  if (e.detail.userId !== peerId) return;
  leaveCurrentLobby();
});

WavedashJS.addEventListener(WavedashJS.Events.LOBBY_KICKED, () => {
  currentLobbyId = "";
  peerId = "";
  peerConnected = false;
  enterOnlineMenu();
});

function findPeer(users, selfId) {
  for (const u of users) {
    const uid = u && u.userId;
    if (uid && uid !== selfId) return uid;
  }
  return "";
}

/* ── P2P messaging ────────────────────────────────── */

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function sendJSON(channel, reliable, obj) {
  const bytes = textEncoder.encode(JSON.stringify(obj));
  WavedashJS.broadcastP2PMessage(channel, reliable, bytes);
}
function sendEvent(msg) { sendJSON(CHANNEL_EVENTS, true, msg); }
function sendPaddle(y) { sendJSON(CHANNEL_PADDLE, false, { event: "PaddleMoved", y }); }

function drainChannel(channel) {
  const out = [];
  while (true) {
    const msg = WavedashJS.readP2PMessageFromChannel(channel);
    if (!msg) break;
    try {
      out.push(JSON.parse(textDecoder.decode(msg.payload)));
    } catch {
      // skip malformed packet
    }
  }
  return out;
}

function drainP2P() {
  for (const m of drainChannel(CHANNEL_PADDLE)) {
    if (m.event === "PaddleMoved") applyRemotePaddle(m.y);
  }
  for (const m of drainChannel(CHANNEL_EVENTS)) {
    if (m.event === "StartGame" && !isHost && state === State.IN_LOBBY) {
      enterOnlineGame(m.pos, m.vel);
    } else if (m.event === "GoalScored" && !isHost) {
      leftScore = m.leftScore;
      rightScore = m.rightScore;
      ballX = m.pos.x; ballY = m.pos.y;
      ballVx = m.vel.x; ballVy = m.vel.y;
      updateScoreboard();
    }
  }
}

function applyRemotePaddle(y) {
  if (isHost) rightY = y;
  else leftY = y;
}

function broadcastPaddleIfChanged() {
  const myY = isHost ? leftY : rightY;
  if (Math.abs(myY - lastSentPaddleY) < PADDLE_SEND_EPSILON) return;
  lastSentPaddleY = myY;
  sendPaddle(myY);
}

/* ── Simulation ───────────────────────────────────── */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function movePaddle(y, dt, up, down) {
  const dir = (up ? 1 : 0) + (down ? -1 : 0);
  const max = FIELD_H / 2 - PADDLE_H / 2;
  return clamp(y + dir * PADDLE_SPEED * dt, -max, max);
}

function resetBall() {
  ballX = 0;
  ballY = 0;
  ballVx = serveDir * BALL_SPEED_X;
  ballVy = (Math.random() - 0.5) * BALL_SPEED_Y * 2;
  if (Math.abs(ballVy) < 1.2) ballVy = ballVy < 0 ? -1.5 : 1.5;
}

function updateLocal(dt) {
  leftY = movePaddle(leftY, dt, input.leftUp, input.leftDown);
  rightY = movePaddle(rightY, dt, input.rightUp, input.rightDown);
  updateBall(dt, true);
}

function updateOnline(dt) {
  // Your paddle reacts to both W/S and arrows (matches the Godot example).
  const up = input.leftUp || input.rightUp;
  const down = input.leftDown || input.rightDown;
  if (isHost) leftY = movePaddle(leftY, dt, up, down);
  else rightY = movePaddle(rightY, dt, up, down);
  // Host is authoritative for goals; both sides run identical ball/bounce sim.
  updateBall(dt, isHost);
  broadcastPaddleIfChanged();
}

function updateBall(dt, authoritative) {
  ballX += ballVx * dt;
  ballY += ballVy * dt;

  const halfBall = BALL_SIZE / 2;
  if (ballY + halfBall > FIELD_H / 2) { ballY = FIELD_H / 2 - halfBall; ballVy = -Math.abs(ballVy); }
  if (ballY - halfBall < -FIELD_H / 2) { ballY = -FIELD_H / 2 + halfBall; ballVy = Math.abs(ballVy); }

  if (ballVx < 0 && ballHitsPaddle(LEFT_X, leftY)) bounce(true);
  else if (ballVx > 0 && ballHitsPaddle(RIGHT_X, rightY)) bounce(false);

  if (!authoritative) return;

  let scored = false;
  if (ballX + halfBall < -FIELD_W / 2) {
    rightScore++;
    serveDir = -1;
    updateScoreboard();
    resetBall();
    scored = true;
  } else if (ballX - halfBall > FIELD_W / 2) {
    leftScore++;
    serveDir = 1;
    updateScoreboard();
    resetBall();
    scored = true;
  }
  if (scored && state === State.ONLINE_GAME) {
    sendEvent({
      event: "GoalScored",
      leftScore, rightScore,
      pos: { x: ballX, y: ballY },
      vel: { x: ballVx, y: ballVy }
    });
  }
}

function ballHitsPaddle(px, py) {
  const halfBall = BALL_SIZE / 2;
  return (
    ballX + halfBall >= px - PADDLE_W / 2 &&
    ballX - halfBall <= px + PADDLE_W / 2 &&
    ballY + halfBall >= py - PADDLE_H / 2 &&
    ballY - halfBall <= py + PADDLE_H / 2
  );
}

function bounce(leftSide) {
  // Deterministic: flip x, bump speed, keep y — host and guest compute the
  // same bounce locally, so we don't send per-bounce packets.
  const nextVx = Math.min(Math.abs(ballVx) * 1.05 + 0.4, MAX_VX);
  ballVx = leftSide ? nextVx : -nextVx;
  const halfBall = BALL_SIZE / 2;
  ballX = leftSide
    ? LEFT_X + PADDLE_W / 2 + halfBall
    : RIGHT_X - PADDLE_W / 2 - halfBall;
}
function syncMeshes() {
  leftPaddle.position.y = leftY;
  rightPaddle.position.y = rightY;
  ball.position.set(ballX, ballY, 0);
}

/* ── Main loop ────────────────────────────────────── */

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.init({ debug: true });

enterMenu();

// If the game was launched with a ?lobby=... param, join it immediately.
// The LobbyJoined event handler will transition into the lobby view.
const launchLobbyId = WavedashJS.getLaunchParams().lobby;
if (launchLobbyId) {
  (async () => {
    const response = await WavedashJS.joinLobby(launchLobbyId);
    if (!response || !response.success) enterOnlineMenu();
  })();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state === State.LOCAL) {
    updateLocal(dt);
    syncMeshes();
  } else if (state === State.ONLINE_GAME) {
    drainP2P();
    updateOnline(dt);
    syncMeshes();
  } else if (state === State.IN_LOBBY) {
    drainP2P();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
