import { TetrisAudio } from "./audio.js";
import { CELL, COLS, COLORS, ROWS, TetrisGame } from "./game.js";

const BEST_KEY = "pg-tetris-best";
const audio = new TetrisAudio();
const game = new TetrisGame();

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const nextCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("next"));
const ctx = canvas.getContext("2d");
const nctx = nextCanvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const statusEl = document.getElementById("status");
const pauseOverlay = document.getElementById("pause-overlay");
const btnStart = document.getElementById("btn-start");
const btnPause = document.getElementById("btn-pause");
const btnMute = document.getElementById("btn-mute");

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
nextCanvas.width = 4 * 20;
nextCanvas.height = 4 * 20;

let best = loadBest();
let lastTs = 0;

function loadBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(BEST_KEY) || 0));
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* */
  }
}

/** @param {string} msg @param {string} [tone] */
function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  scoreEl.textContent = String(game.score);
  bestEl.textContent = String(Math.max(best, game.best, game.score));
  linesEl.textContent = String(game.lines);
  levelEl.textContent = String(game.level);
  btnStart.textContent = game.status === "ready" ? "開局" : "重開";
  btnPause.disabled = game.status !== "playing" && game.status !== "paused";
  btnPause.textContent = game.status === "paused" ? "繼續" : "暫停";
  pauseOverlay.hidden = game.status !== "paused";
}

function draw() {
  if (!ctx || !nctx) return;
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL + 0.5, 0);
    ctx.lineTo(x * CELL + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL + 0.5);
    ctx.lineTo(canvas.width, y * CELL + 0.5);
    ctx.stroke();
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const k = game.grid[y][x];
      if (k) drawCell(ctx, x, y, COLORS[k], 1, CELL);
    }
  }

  if (game.piece && game.status !== "over") {
    const gy = game.ghostY();
    for (const { x, y } of game.cells({ ...game.piece, y: gy })) {
      if (y >= 0) drawCell(ctx, x, y, COLORS[game.piece.kind], 0.22, CELL);
    }
    for (const { x, y } of game.cells(game.piece)) {
      if (y >= 0) drawCell(ctx, x, y, COLORS[game.piece.kind], 1, CELL);
    }
  }

  if (game.lockFlash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${game.lockFlash * 0.25})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  nctx.fillStyle = "#0b1220";
  nctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (game.next) {
    const fake = { kind: game.next, rot: 0, x: 0, y: 0 };
    const cells = game.cells(fake);
    let minX = 9,
      maxX = 0,
      minY = 9,
      maxY = 0;
    for (const c of cells) {
      minX = Math.min(minX, c.x);
      maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y);
      maxY = Math.max(maxY, c.y);
    }
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const s = 18;
    const ox = (nextCanvas.width - bw * s) / 2;
    const oy = (nextCanvas.height - bh * s) / 2;
    for (const c of cells) {
      drawCell(nctx, c.x - minX, c.y - minY, COLORS[game.next], 1, s, ox, oy);
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} alpha
 * @param {number} size
 * @param {number} [ox]
 * @param {number} [oy]
 */
function drawCell(c, x, y, color, alpha, size, ox = 0, oy = 0) {
  const px = ox + x * size;
  const py = oy + y * size;
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(px + 1, py + 1, size - 2, size - 2);
  c.fillStyle = "rgba(255,255,255,0.22)";
  c.fillRect(px + 2, py + 2, size - 6, 3);
  c.globalAlpha = 1;
}

/** @param {string[]} events */
function handleEvents(events) {
  for (const e of events) {
    if (e === "lock") audio.lock();
    else if (e === "clear") audio.clear();
    else if (e === "over") {
      audio.over();
      best = Math.max(best, game.score);
      saveBest();
      setStatus(game.message, "bad");
    }
  }
}

btnStart.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  game.start(best);
  setStatus(game.message);
  syncHud();
});

btnPause.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  if (game.togglePause()) {
    setStatus(game.message, game.status === "paused" ? "warn" : "");
    syncHud();
  }
});

pauseOverlay.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  if (game.status === "paused" && game.togglePause()) {
    setStatus(game.message);
    syncHud();
  }
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  const on = btnMute.getAttribute("aria-pressed") !== "true";
  btnMute.setAttribute("aria-pressed", on ? "true" : "false");
  btnMute.textContent = on ? "音效" : "靜音";
  audio.setEnabled(on);
  audio.click();
});

/**
 * @param {string} action
 */
async function act(action) {
  await audio.unlock();
  if (game.status === "paused" && action !== "pause") return;
  let ok = false;
  if (action === "left") ok = game.move(-1);
  else if (action === "right") ok = game.move(1);
  else if (action === "rot") ok = game.rotate(1);
  else if (action === "rotccw") ok = game.rotate(-1);
  else if (action === "soft") ok = game.softDrop();
  else if (action === "hard") {
    const n = game.hardDrop();
    ok = n >= 0;
    if (ok) audio.drop();
  } else if (action === "pause") {
    if (game.togglePause()) {
      setStatus(game.message, game.status === "paused" ? "warn" : "");
      syncHud();
    }
    return;
  }
  if (ok) {
    if (action === "left" || action === "right") audio.move();
    else if (action === "rot" || action === "rotccw") audio.rotate();
    if (game.message.includes("消除") || game.message.includes("四消")) {
      audio.clear();
      setStatus(game.message, "ok");
    }
    if (game.status === "over") {
      best = Math.max(best, game.score);
      saveBest();
      audio.over();
      setStatus(game.message, "bad");
    }
  }
  syncHud();
}

for (const b of document.querySelectorAll("[data-act]")) {
  b.addEventListener("click", () => void act(/** @type {HTMLElement} */ (b).dataset.act || ""));
}

window.addEventListener("keydown", (ev) => {
  const map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "soft",
    ArrowUp: "rot",
    " ": "hard",
    z: "rotccw",
    Z: "rotccw",
    x: "rot",
    X: "rot",
    p: "pause",
    P: "pause",
  };
  const a = map[ev.key];
  if (!a) return;
  ev.preventDefault();
  void act(a);
});

function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;
  const events = game.update(dt);
  handleEvents(events);
  draw();
  syncHud();
  requestAnimationFrame(frame);
}

bestEl.textContent = String(best);
setStatus(game.message);
syncHud();
draw();
requestAnimationFrame(frame);
