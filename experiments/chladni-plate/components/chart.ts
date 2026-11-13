import { html, svg } from "lit";
import type { Snapshot } from "../model/snapshot";
import { plate } from "../model/catalog";
import {
  displacement,
  type Response,
  type responseCurve,
} from "../model/response";
import { texts } from "../locales/messages";
const W = 294,
  L = 48,
  R = 12,
  T = 15,
  B = 35;
export function historyChart(
  data: Snapshot,
  r: Response,
  locale: string,
  H = 180,
) {
  const t = texts(locale),
    start = Math.max(0, Math.floor(data.cycles) - 1),
    end = start + 2;
  const { real, imaginary } = displacement(
      plate,
      r,
      data.probe.x,
      data.probe.y,
    ),
    w = 2 * Math.PI * data.params.frequency;
  const value = (cycles: number) => {
    const phase = 2 * Math.PI * cycles,
      y = real * Math.cos(phase) - imaginary * Math.sin(phase);
    return data.metric === "w"
      ? y * 1e6
      : data.metric === "v"
        ? -w * (real * Math.sin(phase) + imaginary * Math.cos(phase)) * 1e3
        : -w * w * y;
  };
  const peak =
    Math.max(
      1e-12,
      Math.hypot(real, imaginary) *
        (data.metric === "w" ? 1e6 : data.metric === "v" ? w * 1e3 : w * w),
    ) * 1.12;
  const X = (n: number) => L + ((n - start) / (end - start)) * (W - L - R),
    Y = (v: number) => T + ((1 - v / peak) / 2) * (H - T - B);
  const path = Array.from({ length: 161 }, (_, i) => {
    const n = start + (2 * i) / 160;
    return `${i ? "L" : "M"}${X(n).toFixed(2)},${Y(value(n)).toFixed(2)}`;
  }).join("");
  const color =
    data.metric === "w"
      ? "var(--blue)"
      : data.metric === "v"
        ? "var(--green)"
        : "var(--red)";
  return html`<svg
    class="plate-chart"
    viewBox="0 0 ${W} ${H}"
    role="img"
    aria-label=${t.probeHistory}
  >
    ${[1, 0, -1].map((v) => svg`<path d="M${L},${Y(v * peak)}H${W - R}" stroke="var(--border)"/><text x="${L - 6}" y="${Y(v * peak) + 3}" text-anchor="end">${v === 0 ? "0" : (v * peak).toPrecision(2)}</text>`)}
    <path d=${path} fill="none" stroke=${color} stroke-width="1.7" />
    <path
      d="M${X(data.cycles)},${T}V${H - B}"
      stroke="var(--muted)"
      stroke-dasharray="3 4"
    />
    <circle
      class="chart-point"
      data-value=${value(data.cycles)}
      cx=${X(data.cycles)}
      cy=${Y(value(data.cycles))}
      r="3.5"
      fill=${color}
    />
    ${[0, 1, 2].map((v) => svg`<text x="${X(start + v)}" y="${H - B + 17}" text-anchor="${v === 0 ? "start" : v === 2 ? "end" : "middle"}">${(((start + v) / data.params.frequency) * 1000).toFixed(1)}</text>`)}
    <text x=${W - R} y=${H - 3} text-anchor="end">t / ms</text>
    <text x=${L} y="10">
      ${data.metric === "w" ? "w / μm" : data.metric === "v" ? "v / mm·s⁻¹" : "a / m·s⁻²"}
    </text>
  </svg>`;
}
export function resonanceChart(
  data: Snapshot,
  curve: ReturnType<typeof responseCurve>,
  locale: string,
  pointer: (e: PointerEvent) => void,
  keys: (e: KeyboardEvent) => void,
  H = 180,
) {
  const t = texts(locale),
    min = curve[0].frequency,
    max = curve.at(-1)!.frequency,
    peak = Math.max(1e-9, ...curve.map((s) => s.amplitude * 1e6)) * 1.08;
  const X = (f: number) => L + ((f - min) / (max - min)) * (W - L - R),
    Y = (a: number) => H - B - ((a * 1e6) / peak) * (H - T - B);
  const path = curve
    .map(
      (s, i) =>
        `${i ? "L" : "M"}${X(s.frequency).toFixed(2)},${Y(s.amplitude).toFixed(2)}`,
    )
    .join("");
  const current = curve.find((s) => s.frequency === data.params.frequency);
  return html`<svg
    class="plate-chart response-plot"
    viewBox="0 0 ${W} ${H}"
    role="slider"
    tabindex="0"
    aria-label=${t.chooseFrequency}
    aria-valuemin=${min}
    aria-valuemax=${max}
    aria-valuenow=${data.params.frequency}
    aria-valuetext=${data.params.frequency.toFixed(2) + " Hz"}
    @pointerdown=${pointer}
    @pointermove=${pointer}
    @keydown=${keys}
  >
    ${[0, 0.5, 1].map((v) => svg`<path d="M${L},${Y((v * peak) / 1e6)}H${W - R}" stroke="var(--border)"/><text x="${L - 5}" y="${Y((v * peak) / 1e6) + 3}" text-anchor="end">${(v * peak).toPrecision(2)}</text>`)}
    <path d=${path} fill="none" stroke="var(--blue)" stroke-width="1.6" />
    <path
      d="M${X(data.params.frequency)},${T}V${H - B}"
      stroke="var(--primary)"
      stroke-dasharray="3 4"
    />
    ${current ? svg`<circle class="response-point" data-value=${current.amplitude} cx="${X(current.frequency)}" cy="${Y(current.amplitude)}" r="3.5" fill="var(--primary)"/>` : ""}
    ${[0, 0.5, 1].map((v) => svg`<text x="${L + v * (W - L - R)}" y="${H - B + 17}" text-anchor="${v === 0 ? "start" : v === 1 ? "end" : "middle"}">${Math.round(min + v * (max - min))}</text>`)}
    <text x=${W - R} y=${H - 3} text-anchor="end">f / Hz</text>
    <text x=${L} y="10">RMS / μm</text>
  </svg>`;
}
export function frequencyFromPointer(
  e: PointerEvent,
  min: number,
  max: number,
) {
  const svg = e.currentTarget as SVGSVGElement,
    m = svg.getScreenCTM();
  if (!m) return min;
  const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  return min + ((max - min) * (point.x - L)) / (W - L - R);
}
