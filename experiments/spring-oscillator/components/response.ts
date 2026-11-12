import { svg } from "lit";
import type { Locale } from "../../../src/infra/platform/contract";
import { labTexts } from "../locales/dynamics";
import { format } from "../model/physics";
import {
  responseAt,
  resonanceRatio,
  type OscillatorParameters,
} from "../model/dynamics";

export type ResponseView = "amplitude" | "phase";
export function responseChart(
  p: OscillatorParameters,
  view: ResponseView,
  locale: Locale,
  height: number,
  onInput: (ratio: number) => void,
  onCommit: () => void,
) {
  const l = labTexts(locale),
    peak = resonanceRatio(p);
  const ratios = [
    ...new Set([
      ...Array.from({ length: 361 }, (_, i) => i / 120),
      p.ratio,
      ...(peak === null ? [] : [peak]),
    ]),
  ].sort((a, b) => a - b);
  const value = (ratio: number) => {
    const r = responseAt(p, ratio);
    return view === "amplitude"
      ? r.amplitude
      : r.phase === null
        ? null
        : (r.phase * 180) / Math.PI;
  };
  const points = ratios.map((ratio) => ({ ratio, value: value(ratio) }));
  const maximum =
    view === "phase"
      ? 180
      : Math.max(0.01, ...points.map((p) => p.value ?? 0)) * 1.12;
  const left = 52,
    right = 394,
    top = 31,
    bottom = Math.max(70, height - 36);
  const x = (ratio: number) => left + (ratio / 3) * (right - left);
  const y = (v: number) => bottom - (v / maximum) * (bottom - top);
  let gap = true;
  const path = points
    .map((point) => {
      if (point.value === null) {
        gap = true;
        return "";
      }
      const prefix = gap ? "M" : "L";
      gap = false;
      return `${prefix}${x(point.ratio)},${y(point.value)}`;
    })
    .join(" ");
  const seek = (event: PointerEvent) => {
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
    onInput(Math.max(0, Math.min(3, ((point.x - left) / (right - left)) * 3)));
  };
  const current = value(p.ratio);
  return svg`<svg class="chart response-chart" viewBox=${`0 0 420 ${Math.max(110, height)}`} role="img" aria-label=${view === "amplitude" ? l.amplitudeResponse + " (m)" : l.phaseResponse + " (°)"}
    @pointerdown=${(event: PointerEvent) => {
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      seek(event);
    }} @pointermove=${seek} @pointerup=${onCommit} @pointercancel=${onCommit} @lostpointercapture=${onCommit}>
    <text x="8" y="17" fill="var(--muted)" font-family="var(--font)" font-size="14">${view === "amplitude" ? "X (m)" : "δ (°)"}</text>
    ${[0, maximum / 2, maximum].map((v) => svg`<path d=${`M${left} ${y(v)}H${right}`} stroke="var(--border)" stroke-dasharray="3 5"/><text x=${left - 7} y=${y(v) + 4} text-anchor="end" fill="var(--muted)" font-size="11" font-family="var(--mono)">${format(v, view === "phase" ? 0 : 2)}</text>`)}
    ${[0, 0.5, 1, 1.5, 2, 2.5, 3].map((r) => svg`<path d=${`M${x(r)} ${top}V${bottom}`} stroke="var(--border)" stroke-dasharray="3 5"/><text x=${x(r)} y=${bottom + 17} text-anchor="middle" fill="var(--muted)" font-size="11" font-family="var(--mono)">${r}</text>`)}
    <text x=${right} y=${bottom + 33} text-anchor="end" fill="var(--muted)" font-size="12">r = Ω/ω₀</text>
    <path d=${`M${x(1)} ${top}V${bottom}`} stroke="var(--muted)" stroke-dasharray="4 4"/>
    <path d=${path} stroke="var(--blue)" stroke-width="2" fill="none"/>
    <path d=${`M${x(p.ratio)} ${top}V${bottom}`} stroke="var(--primary)" stroke-dasharray="2 4"/>
    ${current === null && view === "amplitude" && p.force > 0 ? svg`<text x=${x(1) + 8} y=${top + 15} fill="var(--text)" font-size="17">∞</text>` : current === null ? svg`<text x="210" y=${(top + bottom) / 2} text-anchor="middle" fill="var(--muted)" font-size="13">${l.noPhase}</text>` : svg`<circle class="resonance-point" data-ratio=${p.ratio} data-value=${current} cx=${x(p.ratio)} cy=${y(current)} r="4" fill="var(--primary)" stroke="var(--surface)" stroke-width="2"/>`}
  </svg>`;
}
