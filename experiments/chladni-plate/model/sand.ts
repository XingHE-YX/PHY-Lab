import { clamp } from "./plate";
import { sample, type Field } from "./response";
export const MAX_CYCLES = 80,
  SAND_STEP = 1 / 16;
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export class SandSimulation {
  positions: Float32Array;
  private initial: Float32Array;
  private checkpoints = new Map<number, Float32Array>();
  private step = 0;
  private gradientX: Float32Array;
  private gradientY: Float32Array;
  private mobility: number;
  constructor(
    readonly grid: Field,
    readonly seed: number,
    count: number,
    frequency: number,
  ) {
    const rng = random(seed);
    this.positions = Float32Array.from(
      { length: count * 2 },
      () => rng() * 1.96 - 0.98,
    );
    this.initial = this.positions.slice();
    this.checkpoints.set(0, this.initial);
    this.gradientX = new Float32Array(grid.size ** 2);
    this.gradientY = this.gradientX.slice();
    const n = grid.size,
      dx = 2 / (n - 1),
      energy = (i: number, j: number) =>
        (grid.amplitude[j * n + i] / Math.max(grid.peak, 1e-30)) ** 2;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const left = Math.max(0, i - 1),
          right = Math.min(n - 1, i + 1),
          top = Math.max(0, j - 1),
          bottom = Math.min(n - 1, j + 1);
        this.gradientX[j * n + i] =
          (energy(right, j) - energy(left, j)) / ((right - left) * dx);
        this.gradientY[j * n + i] =
          (energy(i, bottom) - energy(i, top)) / ((bottom - top) * dx);
      }
    this.mobility = clamp(
      (grid.peak * (2 * Math.PI * frequency) ** 2) / 9.81,
      0,
      8,
    );
  }
  seek(cycles: number) {
    const target = Math.floor(clamp(cycles, 0, MAX_CYCLES) / SAND_STEP + 1e-8);
    if (target < this.step) {
      const nearest = Math.floor(target / 64) * 64;
      this.step = this.checkpoints.has(nearest) ? nearest : 0;
      this.positions = (
        this.checkpoints.get(this.step) ?? this.initial
      ).slice();
    }
    while (this.step < target) {
      this.advance();
      this.step++;
      if (this.step % 64 === 0)
        this.checkpoints.set(this.step, this.positions.slice());
    }
    return this.positions;
  }
  private advance() {
    if (this.mobility === 0) return;
    const g = this.grid,
      peak = Math.max(1e-30, g.peak),
      dt = SAND_STEP;
    for (let i = 0; i < this.positions.length; i += 2) {
      const x = this.positions[i],
        y = this.positions[i + 1];
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      const amp = sample(g, g.amplitude, x, y) / peak;
      let gx = sample(g, this.gradientX, x, y),
        gy = sample(g, this.gradientY, x, y);
      const max = Math.max(1, Math.hypot(gx, gy) / 6);
      gx /= max;
      gy /= max;
      let hash =
        Math.imul(i + 1, 0x45d9f3b) ^
        Math.imul(this.step + 1, 0x27d4eb2d) ^
        this.seed;
      hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
      hash ^= hash >>> 16;
      const noiseX = (hash & 65535) / 32767.5 - 1,
        noiseY = (hash >>> 16) / 32767.5 - 1;
      const motion = this.mobility / (1 + this.mobility);
      const jitter = 0.008 * Math.sqrt(dt) * amp * motion;
      this.positions[i] = x - 0.035 * motion * gx * dt + jitter * noiseX;
      this.positions[i + 1] = y - 0.035 * motion * gy * dt + jitter * noiseY;
    }
  }
  get remaining() {
    let count = 0;
    for (let i = 0; i < this.positions.length; i += 2)
      if (
        Math.abs(this.positions[i]) <= 1 &&
        Math.abs(this.positions[i + 1]) <= 1
      )
        count++;
    return count;
  }
  get lowAmplitudeFraction() {
    let count = 0,
      total = 0;
    for (let i = 0; i < this.positions.length; i += 2) {
      const x = this.positions[i],
        y = this.positions[i + 1];
      if (Math.abs(x) > 1 || Math.abs(y) > 1) continue;
      total++;
      if (sample(this.grid, this.grid.amplitude, x, y) < this.grid.peak * 0.08)
        count++;
    }
    return total ? count / total : 0;
  }
}
