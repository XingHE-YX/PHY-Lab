import { svg } from "lit";
import type { Snapshot } from "../model/snapshot";
import {
  temporalSamples,
  spatialSamples,
  waveAt,
  timeWindow,
  format,
  type WaveParameters,
} from "../model/physics";
type Metric = "y" | "v" | "incident" | "reflected";
const colors: Record<Metric, string> = {
  y: "var(--blue)",
  v: "var(--green)",
  incident: "var(--muted)",
  reflected: "var(--text)",
};
const cache = new Map<string, ReturnType<typeof temporalSamples>>();
export function waveChart(
  p: WaveParameters,
  time: number,
  probe: number,
  metric: "y" | "v",
  height: number,
  seek: (time: number) => void,
) {
  const { start, end } = timeWindow(p, time),
    x = probe * p.length;
  const key = JSON.stringify([p, x, start]);
  if (!cache.has(key)) {
    if (cache.size > 16) cache.clear();
    cache.set(key, temporalSamples(p, x, start, end));
  }
  const points = cache.get(key)!;
  const maximum =
    Math.max(
      metric === "y" ? 0.01 : 0.02,
      ...points.map((s) => Math.abs(s[metric])),
    ) * 1.15;
  return plot(
    points.map((s) => ({ u: s.time, values: { [metric]: s[metric] } })),
    [metric],
    start,
    end,
    maximum,
    time,
    { [metric]: waveAt(p, x, time)[metric] },
    height,
    `${metric === "y" ? "y" : "vᵧ"} (${metric === "y" ? "m" : "m/s"})`,
    "t (s)",
    seek,
  );
}
export function profileChart(
  p: WaveParameters,
  time: number,
  probe: number,
  height: number,
  setProbe: (fraction: number) => void,
  layers: Snapshot["layers"],
) {
  const points = spatialSamples(p, time);
  const s = waveAt(p, probe * p.length, time);
  return plot(
    points.map((s) => ({
      u: s.x,
      values: { y: s.y, incident: s.incident, reflected: s.reflected },
    })),
    [
      ...(layers.incident ? ["incident"] : []),
      ...(layers.reflected && p.mode !== "travel" ? ["reflected"] : []),
      ...(layers.total ? ["y"] : []),
    ] as Metric[],
    0,
    p.length,
    Math.max(0.01, p.amplitude * (p.mode === "travel" ? 1 : 2)) * 1.15,
    probe * p.length,
    s,
    height,
    "y (m)",
    "x (m)",
    (x) => setProbe(x / p.length),
  );
}
function plot(
  points: { u: number; values: Partial<Record<Metric, number>> }[],
  metrics: Metric[],
  start: number,
  end: number,
  max: number,
  cursor: number,
  cursorValues: Partial<Record<Metric, number>>,
  height: number,
  ylabel: string,
  xlabel: string,
  select: (value: number) => void,
) {
  const left = 48,
    right = 312,
    top = 27,
    bottom = Math.max(65, height - 32),
    h = Math.max(110, height);
  const x = (u: number) =>
    left + ((u - start) / (end - start)) * (right - left);
  const y = (v: number) =>
    (top + bottom) / 2 - ((v / max) * (bottom - top)) / 2;
  const pointer = (e: PointerEvent) => {
    const node = e.currentTarget as SVGSVGElement;
    if (e.type === "pointermove" && !node.hasPointerCapture(e.pointerId))
      return;
    const matrix = node.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    select(
      start +
        Math.max(0, Math.min(1, (point.x - left) / (right - left))) *
          (end - start),
    );
  };
  return svg`<svg class="wave-chart" viewBox=${`0 0 332 ${h}`} role="img" aria-label=${ylabel + ", " + xlabel} @pointerdown=${(
    e: PointerEvent,
  ) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    pointer(e);
  }} @pointermove=${pointer}>
    <text x="8" y="15" class="axis-text">${ylabel}</text>
    ${[-max, 0, max].map((v) => svg`<path d=${`M${left} ${y(v)}H${right}`} stroke="var(--border)" stroke-dasharray="3 5"/><text x=${left - 6} y=${y(v) + 4} text-anchor="end" class="axis-text">${format(v)}</text>`)}
    ${[0, 1, 2, 3, 4].map((i) => {
      const u = start + ((end - start) * i) / 4;
      return svg`<path d=${`M${x(u)} ${top}V${bottom}`} stroke="var(--border)" stroke-dasharray="3 5"/><text x=${x(u)} y=${bottom + 17} text-anchor="middle" class="axis-text">${format(u, 1)}</text>`;
    })}
    ${metrics.map((metric) => svg`<path d=${points.map((s, i) => `${i ? "L" : "M"}${x(s.u).toFixed(2)},${y(s.values[metric] ?? 0).toFixed(2)}`).join(" ")} fill="none" stroke=${colors[metric]} stroke-width=${metric === "y" ? 2 : 1.5} stroke-dasharray=${metric === "reflected" ? "2 4" : metric === "incident" ? "8 5" : ""}/>`)}
    <path d=${`M${x(cursor)} ${top}V${bottom}`} stroke="var(--primary)" stroke-dasharray="3 4"/>
    ${metrics.map((metric) => svg`<circle class="chart-point" data-metric=${metric} data-value=${cursorValues[metric] ?? 0} cx=${x(cursor)} cy=${y(cursorValues[metric] ?? 0)} r="3" fill=${colors[metric]}/>`)}
    <text x=${right} y=${bottom + 30} text-anchor="end" class="axis-text">${xlabel}</text>
  </svg>`;
}
