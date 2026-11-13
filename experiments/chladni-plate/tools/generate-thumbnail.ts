import { writeFile } from "node:fs/promises";
import { plate } from "../model/catalog";
import { modeAt } from "../model/plate";

// Extract exact nodal contours from the physical Rayleigh-Ritz mode 21 (index 20).
const mode = plate.modes[20];
const N = 128;
const half = 80;
const cx = 300;
const cy = 160;
const mountHalf = 0.14;

function evalGrid(i: number, j: number) {
  const x = (i / N) * 2 - 1;
  const y = (j / N) * 2 - 1;
  return modeAt(plate, mode, x, y).value;
}

const grid = Array.from({ length: N + 1 }, (_, j) =>
  Float64Array.from({ length: N + 1 }, (_, i) => evalGrid(i, j)),
);

type Pt = [number, number];
const segments: [Pt, Pt][] = [];

function interp(
  x1: number,
  y1: number,
  v1: number,
  x2: number,
  y2: number,
  v2: number,
): Pt {
  const t = Math.abs(v1 - v2) < 1e-12 ? 0.5 : v1 / (v1 - v2);
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}

for (let j = 0; j < N; j++) {
  const y0 = (j / N) * 2 - 1;
  const y1 = ((j + 1) / N) * 2 - 1;
  for (let i = 0; i < N; i++) {
    const x0 = (i / N) * 2 - 1;
    const x1 = ((i + 1) / N) * 2 - 1;
    if (
      Math.abs((x0 + x1) / 2) < mountHalf &&
      Math.abs((y0 + y1) / 2) < mountHalf
    )
      continue;
    const v00 = grid[j][i];
    const v10 = grid[j][i + 1];
    const v11 = grid[j + 1][i + 1];
    const v01 = grid[j + 1][i];
    const m =
      (v00 >= 0 ? 1 : 0) |
      (v10 >= 0 ? 2 : 0) |
      (v11 >= 0 ? 4 : 0) |
      (v01 >= 0 ? 8 : 0);
    if (m === 0 || m === 15) continue;
    const top = () => interp(x0, y0, v00, x1, y0, v10);
    const right = () => interp(x1, y0, v10, x1, y1, v11);
    const bottom = () => interp(x0, y1, v01, x1, y1, v11);
    const left = () => interp(x0, y0, v00, x0, y1, v01);
    const center = (v00 + v10 + v11 + v01) / 4;
    if (m === 1 || m === 14) segments.push([left(), top()]);
    else if (m === 2 || m === 13) segments.push([top(), right()]);
    else if (m === 4 || m === 11) segments.push([right(), bottom()]);
    else if (m === 8 || m === 7) segments.push([bottom(), left()]);
    else if (m === 3 || m === 12) segments.push([left(), right()]);
    else if (m === 6 || m === 9) segments.push([top(), bottom()]);
    else if (m === 5) {
      if (center >= 0) {
        segments.push([left(), bottom()], [top(), right()]);
      } else {
        segments.push([left(), top()], [bottom(), right()]);
      }
    } else if (m === 10) {
      if (center >= 0) {
        segments.push([left(), top()], [bottom(), right()]);
      } else {
        segments.push([left(), bottom()], [top(), right()]);
      }
    }
  }
}

const key = (p: Pt) => `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)}`;
const adj = new Map<string, { pt: Pt; edges: number[] }>();
segments.forEach(([a, b], idx) => {
  for (const p of [a, b]) {
    const k = key(p);
    if (!adj.has(k)) adj.set(k, { pt: p, edges: [] });
    adj.get(k)!.edges.push(idx);
  }
});

const used = new Uint8Array(segments.length);
const chains: Pt[][] = [];

function trace(startIdx: number): Pt[] {
  used[startIdx] = 1;
  const chain: Pt[] = [segments[startIdx][0], segments[startIdx][1]];
  for (const atEnd of [true, false]) {
    while (true) {
      const cur = atEnd ? chain[chain.length - 1] : chain[0];
      const node = adj.get(key(cur));
      const nextEdge = node?.edges.find((e) => !used[e]);
      if (nextEdge === undefined) break;
      used[nextEdge] = 1;
      const [a, b] = segments[nextEdge];
      const nextPt = key(a) === key(cur) ? b : a;
      if (atEnd) chain.push(nextPt);
      else chain.unshift(nextPt);
    }
  }
  return chain;
}

for (let i = 0; i < segments.length; i++) {
  if (!used[i]) chains.push(trace(i));
}

function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let index = 0;
  const [x1, y1] = pts[0];
  const [x2, y2] = pts[pts.length - 1];
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    let d: number;
    if (lenSq < 1e-12) d = Math.hypot(px - x1, py - y1);
    else {
      const t = Math.max(
        0,
        Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq),
      );
      d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > eps) {
    const left = simplify(pts.slice(0, index + 1), eps);
    const right = simplify(pts.slice(index), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], pts[pts.length - 1]];
}

const toScreen = ([x, y]: Pt): Pt => [cx + x * half, cy + y * half];
const paths = chains
  .filter((c) => c.length >= 3)
  .map((c) => simplify(c.map(toScreen), 0.35))
  .map(
    (pts) =>
      "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L"),
  )
  .join("");

const driveX = cx + 0.62 * half;
const driveY = cy + 0.32 * half;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320">
  <path fill="#f3f4f6" d="M0 0h600v320H0z"/>
  <path d="M${cx - half} ${cy}H${cx + half}M${cx} ${cy - half}V${cy + half}" stroke="#a3a8b1" stroke-dasharray="5 6"/>
  <path d="${paths}" fill="none" stroke="#245edb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${cx - half}" y="${cy - half}" width="${half * 2}" height="${half * 2}" rx="2" fill="none" stroke="#353a45" stroke-width="3"/>
  <rect x="${cx - 9}" y="${cy - 9}" width="18" height="18" rx="1.5" fill="#f3f4f6" stroke="#353a45" stroke-width="2.5"/>
  <circle cx="${cx}" cy="${cy}" r="2.5" fill="#353a45"/>
  <path d="M${driveX.toFixed(1)} ${(driveY - 6).toFixed(1)}l5.2 6-5.2 6-5.2-6z" fill="#245edb"/>
</svg>
`;

await writeFile(new URL("../assets/thumbnail.svg", import.meta.url), svg);
