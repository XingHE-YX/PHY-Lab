import { svg } from "lit";
import { clamp, format, type LCParameters } from "../model/physics";
import {
  transientValues,
  sampleTransient,
  type TransientProfile,
  type TransientPoint,
} from "../model/transient";
import type { LCTexts } from "../locales/messages";
type Metric = "voltage" | "current" | "energy";
export function transientChart(
  p: LCParameters,
  profile: TransientProfile,
  time: number,
  metric: Metric,
  zoom: "impulse" | "full",
  t: LCTexts,
  seek: (time: number) => void,
  height: number,
) {
  const end = Math.max(
    1e-9,
    zoom === "full"
      ? profile.duration
      : Math.min(
          profile.duration,
          Math.max(2 * profile.peakTime, 12 * profile.timeScale),
        ),
  );
  const points = profile.points.filter((point) => point.time <= end);
  if (points.at(-1)?.time !== end) points.push(sampleTransient(profile, end));
  const traces: {
    label: string;
    color: string;
    dash?: string;
    value: (point: TransientPoint) => number;
  }[] =
    metric === "voltage"
      ? [
          {
            label: "Uₛ",
            color: "var(--red)",
            value: (point) => point.switchVoltage,
          },
          {
            label: "Uʟ",
            color: "var(--blue)",
            dash: "5 3",
            value: (point) =>
              transientValues(p, profile.model, point).inductorVoltage,
          },
        ]
      : metric === "current"
        ? [
            {
              label: "I",
              color: "var(--green)",
              value: (point) => point.current * 1e3,
            },
          ]
        : [
            {
              label: "E꜀",
              color: "var(--blue)",
              value: (point) =>
                transientValues(p, profile.model, point).electric * 1e3,
            },
            {
              label: "Eʟ",
              color: "var(--green)",
              dash: "5 3",
              value: (point) =>
                transientValues(p, profile.model, point).magnetic * 1e3,
            },
            {
              label: "Eₚ",
              color: "var(--muted)",
              dash: "2 3",
              value: (point) =>
                transientValues(p, profile.model, point).contactEnergy * 1e3,
            },
            {
              label: t.lossShort,
              color: "var(--red)",
              value: (point) =>
                transientValues(p, profile.model, point).dissipated * 1e3,
            },
          ];
  const peak =
    Math.max(
      metric === "energy" ? 0.001 : 1e-3,
      ...traces.flatMap((trace) => points.map(trace.value).map(Math.abs)),
    ) * 1.1;
  const low = metric === "energy" ? 0 : -peak;
  const x = (time: number) => 50 + (time / end) * 264;
  const bottom = Math.max(100, height - 36);
  const y = (value: number) =>
    bottom - ((value - low) / (peak - low)) * (bottom - 34);
  const current = sampleTransient(profile, time);
  const pointer = (event: PointerEvent) => {
    const node = event.currentTarget as SVGSVGElement;
    if (
      event.type === "pointermove" &&
      !node.hasPointerCapture(event.pointerId)
    )
      return;
    const matrix = node.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    seek(clamp((point.x - 50) / 264, 0, 1) * end);
  };
  return svg`<svg class="transient-chart" viewBox=${`0 0 332 ${height}`} role="img" tabindex="0" aria-label=${t.transientPlot + "; " + t[metric]} @pointerdown=${(
    e: PointerEvent,
  ) => {
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    pointer(e);
  }} @pointermove=${pointer} @keydown=${(event: KeyboardEvent) => {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? end
          : event.key === "ArrowLeft"
            ? Math.max(0, time - end / 100)
            : event.key === "ArrowRight"
              ? Math.min(end, time + end / 100)
              : null;
    if (next !== null) {
      event.preventDefault();
      seek(next);
    }
  }}>
    <text x="8" y="15" class="axis-text">${metric === "voltage" ? "V" : metric === "current" ? "mA" : "mJ"}</text>
    ${[low, metric === "energy" ? peak / 2 : 0, peak].map((v) => svg`<path d=${`M50 ${y(v)}H314`} stroke="var(--border)" stroke-dasharray="3 4"/><text x="44" y=${y(v) + 3} text-anchor="end" class="axis-text">${format(v, metric === "energy" ? 2 : 0)}</text>`)}
    ${[0, 1, 2, 3, 4].map((index) => svg`<text x=${x((end * index) / 4)} y=${bottom + 17} text-anchor="middle" class="axis-text">${format(((end * index) / 4) * 1e6, 1)}</text>`)}
    ${traces.map((trace) => svg`<path d=${points.map((point, i) => `${i ? "L" : "M"}${x(point.time).toFixed(2)},${y(trace.value(point)).toFixed(2)}`).join(" ")} fill="none" stroke=${trace.color} stroke-width="1.8" stroke-dasharray=${trace.dash ?? ""}/>`)}
    ${time <= end ? svg`<path d=${`M${x(current.time)} 34V${bottom}`} stroke="var(--muted)" stroke-dasharray="3 4"/>${traces.map((trace) => svg`<circle cx=${x(current.time)} cy=${y(trace.value(current))} r="3" fill=${trace.color}/>`)}` : ""}
    <text x="314" y=${bottom + 32} text-anchor="end" class="axis-text">Δt / μs</text>
  </svg>`;
}
