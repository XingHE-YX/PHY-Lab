import { svg } from "lit";
import {
  at,
  derived,
  timeWindow,
  format,
  type LCParameters,
  type LCSeed,
} from "../model/physics";
export interface Trace {
  metric:
    | "q"
    | "current"
    | "electric"
    | "magnetic"
    | "total"
    | "position"
    | "velocity";
  color: string;
  dash?: string;
}
function value(
  p: LCParameters,
  time: number,
  metric: Trace["metric"],
  seed?: LCSeed,
) {
  const s = at(p, time, seed),
    d = derived(p);
  switch (metric) {
    case "q":
      return s.q * 1e6;
    case "current":
      return s.current * 1e3;
    case "position":
      return d.charge === 0 ? 0 : s.q / Math.abs(d.charge);
    case "velocity":
      return d.current === 0 ? 0 : -s.current / d.current;
    default:
      return s[metric] * 1e3;
  }
}
export function chart(
  p: LCParameters,
  time: number,
  traces: Trace[],
  label: string,
  timeLabel: string,
  height: number,
  seek: (time: number) => void,
  seed?: LCSeed,
) {
  const { start, span: end } = timeWindow(p, time);
  const left = 49,
    right = 318,
    top = 24,
    bottom = Math.max(70, height - 33),
    energy = traces.some((t) =>
      ["electric", "magnetic", "total"].includes(t.metric),
    );
  const d = derived(p),
    first = traces[0]?.metric;
  const peak =
    first === "q"
      ? Math.max(1, Math.abs(d.charge) * 1e6)
      : first === "current"
        ? Math.max(1, d.current * 1e3)
        : energy
          ? Math.max(0.001, d.energy * 1e3)
          : 1;
  const maximum = peak * 1.12,
    minimum = energy ? 0 : -maximum;
  const x = (t: number) => left + ((t - start) / end) * (right - left),
    y = (v: number) =>
      bottom - ((v - minimum) / (maximum - minimum)) * (bottom - top);
  const points = Array.from({ length: 321 }, (_, i) => start + (end * i) / 320);
  const pointer = (e: PointerEvent) => {
    const node = e.currentTarget as SVGSVGElement;
    if (e.type === "pointermove" && !node.hasPointerCapture(e.pointerId))
      return;
    const matrix = node.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    seek(
      start + Math.max(0, Math.min(1, (point.x - left) / (right - left))) * end,
    );
  };
  return svg`<svg class="lc-chart" viewBox=${`0 0 332 ${height}`} role="img" aria-label=${label + "; " + timeLabel} @pointerdown=${(
    e: PointerEvent,
  ) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    pointer(e);
  }} @pointermove=${pointer}>
    <text x="8" y="14" class="axis-text">${label}</text>
    ${[minimum, energy ? maximum / 2 : 0, maximum].map((v) => svg`<path d=${`M${left} ${y(v)}H${right}`} stroke="var(--border)" stroke-dasharray="3 5"/><text x=${left - 6} y=${y(v) + 3} text-anchor="end" class="axis-text">${format(v, Math.abs(maximum) < 0.1 ? 3 : 1)}</text>`)}
    ${[0, 1, 2, 3, 4].map((i) => svg`<path d=${`M${x(start + (i * end) / 4)} ${top}V${bottom}`} stroke="var(--border)" stroke-dasharray="3 5"/><text x=${x(start + (i * end) / 4)} y=${bottom + 15} text-anchor="middle" class="axis-text">${format((start + (i * end) / 4) * 1e3, 1)}</text>`)}
    ${traces.map((trace) => svg`<path class="trace" data-metric=${trace.metric} d=${points.map((t, i) => `${i ? "L" : "M"}${x(t).toFixed(2)},${y(value(p, t, trace.metric, seed)).toFixed(2)}`).join(" ")} fill="none" stroke=${trace.color} stroke-width="1.8" stroke-dasharray=${trace.dash ?? ""}/>`)}
    <path class="time-cursor" d=${`M${x(time)} ${top}V${bottom}`} stroke="var(--muted)" stroke-dasharray="3 4"/>
    ${traces.map((trace) => svg`<circle class="chart-point" data-metric=${trace.metric} data-value=${value(p, time, trace.metric, seed)} cx=${x(time)} cy=${y(value(p, time, trace.metric, seed))} r="3" fill=${trace.color}/>`)}
    <text x=${right} y=${bottom + 29} text-anchor="end" class="axis-text">${timeLabel}</text>
  </svg>`;
}
