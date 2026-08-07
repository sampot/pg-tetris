/** Lightweight Tetris SFX — original Web Audio tones. */

export class TetrisAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.22;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [slide]
   */
  tone(freq, dur, type = "square", gain = 0.1, when = 0, slide = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  click() {
    this.tone(480, 0.04, "triangle", 0.05);
  }
  move() {
    this.tone(220, 0.03, "triangle", 0.04);
  }
  rotate() {
    this.tone(520, 0.05, "square", 0.05);
  }
  drop() {
    this.tone(180, 0.06, "sawtooth", 0.04, 0, -60);
  }
  lock() {
    this.tone(140, 0.08, "triangle", 0.06);
  }
  clear() {
    this.tone(440, 0.06, "sine", 0.07);
    this.tone(660, 0.08, "sine", 0.06, 0.05);
    this.tone(880, 0.12, "triangle", 0.06, 0.1);
  }
  over() {
    this.tone(330, 0.12, "triangle", 0.07);
    this.tone(247, 0.18, "sine", 0.07, 0.1);
    this.tone(196, 0.28, "sine", 0.08, 0.24);
  }
}
