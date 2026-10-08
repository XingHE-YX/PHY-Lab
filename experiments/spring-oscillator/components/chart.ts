import { svg } from "lit";
import {
  sample,
  stateAt,
  format,
  type Parameters,
  type PhysicsState,
} from "../model/physics";
export type Metric = "x" | "v" | "a" | "kinetic" | "potential" | "total";
const colors: Record<Metric, string> = {
  x: "var(--blue)",
  v: "var(--green)",
  a: "var(--red)",
  kinetic: "var(--green)",
  potential: "var(--blue)",
  total: "var(--text)",
};
const cache = new Map<string, ReturnType<typeof sample>>();
const pathCache = new WeakMap<ReturnType<typeof sample>, Map<string, string>>();
function samples(p: Parameters, start: number, end: number) {
  const key = JSON.stringify([p, start, end]);
  if (!cache.has(key)) {
    if (cache.size > 8) cache.clear();
    const count = Math.min(
      4097,
      Math.max(241, Math.ceil(((end - start) / stateAt(p, 0).period) * 60) + 1),
    );
    cache.set(key, sample(p, start, end, count));
  }
  return cache.get(key)!;
}
export function chart(
  p: Parameters,
  previous: Parameters | null,
  time: number,
  metrics: Metric[],
  label: string,
  unit: string,
  onSeek: (time: number) => void,
  height = 177,
) {
  const state = stateAt(p, time),
    duration = 2 * state.period,
    start = Math.floor(Math.max(0, time - 1e-9) / duration) * duration,
    end = start + duration;
  const data = samples(p, start, end),
    old = previous ? samples(previous, start, end) : null;
  const energy = unit === "J";
  const peak = (params: Parameters, metric: Metric) => {
    const state = stateAt(params, 0);
    return metric === "x"
      ? params.A
      : metric === "v"
        ? params.A * state.omega
        : metric === "a"
          ? params.A * state.omega ** 2
          : state.total;
  };
  const maximum =
    Math.max(
      energy ? 0.05 : 0.01,
      ...metrics.map((metric) => peak(p, metric)),
      ...(previous ? metrics.map((metric) => peak(previous, metric)) : []),
    ) * 1.12;
  const left = 45,
    right = 391,
    top = 30,
    bottom = height - 30;
  const px = (t: number) => left + ((t - start) / duration) * (right - left);
  const py = (value: number) =>
    energy
      ? bottom - (value / maximum) * (bottom - top)
      : (top + bottom) / 2 - ((value / maximum) * (bottom - top)) / 2;
  const path = (points: typeof data, metric: Metric) => {
    let paths = pathCache.get(points);
    if (!paths) {
      paths = new Map();
      pathCache.set(points, paths);
    }
    const key = JSON.stringify([metric, maximum, energy, height]);
    if (paths.has(key)) return paths.get(key)!;
    const value = points
      .map(
        (point, i) =>
          (i ? "L" : "M") +
          px(point.t).toFixed(2) +
          "," +
          py(point[metric]).toFixed(2),
      )
      .join(" ");
    paths.set(key, value);
    return value;
  };
  const seek = (event: PointerEvent) => {
    if (event.type === "pointermove" && event.buttons !== 1) return;
    const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    onSeek(
      start +
        Math.min(1, Math.max(0, (point.x - left) / (right - left))) * duration,
    );
  };
  return svg`<svg class="chart" viewBox=${"0 0 420 " + height} role="img" aria-label=${label + " (" + unit + ")"} @pointerdown=${(
    event: PointerEvent,
  ) => {
    (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    seek(event);
  }} @pointermove=${seek}><text x="8" y="16" fill="var(--muted)" font-size="16" font-family="var(--font)">${label} (${unit})</text>${(energy ? [0, maximum / 2, maximum] : [-maximum, 0, maximum]).map((value) => svg`<path d=${"M" + left + " " + py(value) + "H" + right} stroke="var(--border)" stroke-dasharray=${value === 0 ? "0" : "3 5"} stroke-width=".7"/><text x=${left - 9} y=${py(value) + 3} text-anchor="end" fill="var(--muted)" font-size="11" font-family="var(--mono)">${format(value, Math.abs(value) < 0.1 ? 3 : 2)}</text>`)}${[0, 0.25, 0.5, 0.75, 1].map((fraction) => svg`<path d=${"M" + (left + (right - left) * fraction) + " " + top + "V" + bottom} stroke="var(--border)" stroke-width=".7"/><text x=${left + (right - left) * fraction} y=${height - 10} text-anchor="middle" fill="var(--muted)" font-size="11" font-family="var(--mono)">${format(start + duration * fraction, 2)}</text>`)}<text x="409" y=${height - 10} fill="var(--muted)" font-size="11">s</text>${old ? metrics.map((metric) => svg`<path d=${path(old, metric)} fill="none" stroke=${colors[metric]} stroke-width="1.3" stroke-dasharray="4 4" opacity=".3"/>`) : ""}${metrics.map((metric) => svg`<path d=${path(data, metric)} fill="none" stroke=${colors[metric]} stroke-width="1.7" stroke-dasharray=${metric === "total" ? "5 4" : "0"}/>`)}<path d=${"M" + px(time) + " " + top + "V" + bottom} stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3"/>${metrics.map((metric) => svg`<circle cx=${px(time)} cy=${py(state[metric])} r="3.2" fill=${colors[metric]} stroke="var(--surface)" stroke-width="1.5"/>`)}</svg>`;
}
