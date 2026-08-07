/**
 * Lightweight Tetris — 10×20, 7-bag, soft/hard drop, ghost.
 * Genre homage; not a commercial clone.
 */

export const COLS = 10;
export const ROWS = 20;
export const CELL = 24;

/** @typedef {'I'|'O'|'T'|'S'|'Z'|'J'|'L'} PieceKind */

/** @type {Record<PieceKind, number[][][]>} */
const SHAPES = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
};

/** @type {Record<PieceKind, string>} */
export const COLORS = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#f87171",
  J: "#60a5fa",
  L: "#fb923c",
};

const KINDS = /** @type {PieceKind[]} */ (["I", "O", "T", "S", "Z", "J", "L"]);
const LINE_SCORE = [0, 100, 300, 500, 800];

/**
 * @typedef {{ kind: PieceKind, rot: number, x: number, y: number }} Piece
 */

export class TetrisGame {
  constructor() {
    /** @type {'ready'|'playing'|'paused'|'over'} */
    this.status = "ready";
    this.message = "按開局開始";
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.best = 0;
    /** @type {(PieceKind|null)[][]} */
    this.grid = emptyGrid();
    /** @type {Piece | null} */
    this.piece = null;
    /** @type {PieceKind[]} */
    this.bag = [];
    /** @type {PieceKind | null} */
    this.next = null;
    this.dropMs = 800;
    this.accum = 0;
    this.lockFlash = 0;
  }

  /** @param {number} [best] */
  start(best = 0) {
    this.status = "playing";
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.best = best;
    this.grid = emptyGrid();
    this.bag = [];
    this.next = this.pull();
    this.dropMs = gravityMs(1);
    this.accum = 0;
    this.lockFlash = 0;
    this.spawn();
    this.message = "左移／右移／旋轉／落下";
  }

  togglePause() {
    if (this.status === "playing") {
      this.status = "paused";
      this.message = "已暫停 — 再按繼續";
      return true;
    }
    if (this.status === "paused") {
      this.status = "playing";
      this.message = "繼續";
      return true;
    }
    return false;
  }

  pull() {
    if (!this.bag.length) {
      this.bag = shuffle(KINDS.slice());
    }
    return /** @type {PieceKind} */ (this.bag.pop());
  }

  spawn() {
    const kind = this.next || this.pull();
    this.next = this.pull();
    const shape = SHAPES[kind][0];
    const piece = {
      kind,
      rot: 0,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    };
    if (!this.valid(piece)) {
      this.piece = piece;
      this.status = "over";
      this.message = "遊戲結束";
      this.best = Math.max(this.best, this.score);
      return false;
    }
    this.piece = piece;
    return true;
  }

  /** @param {Piece} p */
  cells(p) {
    const mat = SHAPES[p.kind][p.rot];
    /** @type {{x:number,y:number}[]} */
    const out = [];
    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c]) out.push({ x: p.x + c, y: p.y + r });
      }
    }
    return out;
  }

  /** @param {Piece} p */
  valid(p) {
    for (const { x, y } of this.cells(p)) {
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && this.grid[y][x]) return false;
    }
    return true;
  }

  /** @param {number} dx */
  move(dx) {
    if (this.status !== "playing" || !this.piece) return false;
    const next = { ...this.piece, x: this.piece.x + dx };
    if (!this.valid(next)) return false;
    this.piece = next;
    return true;
  }

  rotate(dir = 1) {
    if (this.status !== "playing" || !this.piece) return false;
    const p = this.piece;
    if (p.kind === "O") return true;
    const rot = (p.rot + dir + 4) % 4;
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      const next = { ...p, rot, x: p.x + k };
      if (this.valid(next)) {
        this.piece = next;
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (this.status !== "playing" || !this.piece) return false;
    const next = { ...this.piece, y: this.piece.y + 1 };
    if (this.valid(next)) {
      this.piece = next;
      this.score += 1;
      return true;
    }
    this.lock();
    return false;
  }

  hardDrop() {
    if (this.status !== "playing" || !this.piece) return 0;
    let n = 0;
    while (true) {
      const next = { ...this.piece, y: this.piece.y + 1 };
      if (!this.valid(next)) break;
      this.piece = next;
      n += 1;
    }
    this.score += n * 2;
    this.lock();
    return n;
  }

  ghostY() {
    if (!this.piece) return 0;
    let y = this.piece.y;
    while (this.valid({ ...this.piece, y: y + 1 })) y += 1;
    return y;
  }

  lock() {
    if (!this.piece) return;
    for (const { x, y } of this.cells(this.piece)) {
      if (y < 0) {
        this.status = "over";
        this.message = "遊戲結束";
        this.best = Math.max(this.best, this.score);
        this.piece = null;
        return;
      }
      this.grid[y][x] = this.piece.kind;
    }
    this.piece = null;
    const cleared = this.clearLines();
    if (cleared) {
      this.lines += cleared;
      this.score += LINE_SCORE[cleared] * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropMs = gravityMs(this.level);
      this.lockFlash = 0.2;
      this.message = cleared === 4 ? "四消！" : `消除 ${cleared} 行`;
    }
    this.best = Math.max(this.best, this.score);
    if (this.status === "playing") this.spawn();
  }

  clearLines() {
    let n = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (this.grid[y].every(Boolean)) {
        this.grid.splice(y, 1);
        this.grid.unshift(Array(COLS).fill(null));
        n += 1;
        y += 1;
      }
    }
    return n;
  }

  /**
   * @param {number} dt
   * @returns {string[]}
   */
  update(dt) {
    /** @type {string[]} */
    const events = [];
    if (this.lockFlash > 0) this.lockFlash = Math.max(0, this.lockFlash - dt);
    if (this.status !== "playing") return events;
    this.accum += dt * 1000;
    while (this.accum >= this.dropMs) {
      this.accum -= this.dropMs;
      if (!this.piece) break;
      const next = { ...this.piece, y: this.piece.y + 1 };
      if (this.valid(next)) this.piece = next;
      else {
        this.lock();
        events.push("lock");
        if (this.lockFlash > 0) events.push("clear");
        break;
      }
    }
    if (this.status === "over") events.push("over");
    return events;
  }
}

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** @param {number} level */
function gravityMs(level) {
  return Math.max(100, 800 - (level - 1) * 70);
}

/**
 * @template T
 * @param {T[]} a
 */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
