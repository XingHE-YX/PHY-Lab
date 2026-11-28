import { html, svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  chargeAxis,
  clamp,
  zeroTolerance,
  type Charges,
  type Reading,
} from "../model/electrostatics";
import type { profile } from "../model/profile";

export function display(value: number | undefined) {
  if (value === undefined) return "—";
  if (Math.abs(value) < 1e-9) return "0.00";
  if (Math.abs(value) < 0.01) return value.toExponential(1);
  return value.toFixed(2);
}

const plotLeft = 46;
const plotRight = 320;
const plotTop = 22;
const chartWidth = 342;

export function sliceOffsetFromEvent(
  event: PointerEvent,
  start: number,
  end: number,
) {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  if (!matrix) return null;
  const x = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  ).x;
  const ratio = clamp((x - plotLeft) / (plotRight - plotLeft), 0, 1);
  return start + ratio * (end - start);
}

export interface SliceScrub {
  start(event: PointerEvent, start: number, end: number): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
}

function miniArrow(x0: number, y0: number, dx: number, dy: number, head = 5.5) {
  const len = Math.hypot(dx, dy);
  if (len < 1.5) return "";
  const ux = dx / len;
  const uy = dy / len;
  const x1 = x0 + dx;
  const y1 = y0 + dy;
  const bx = x1 - ux * Math.min(head, len * 0.45);
  const by = y1 - uy * Math.min(head, len * 0.45);
  const w = Math.min(head * 0.55, len * 0.25);
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} M ${(bx - uy * w).toFixed(1)} ${(by + ux * w).toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} L ${(bx + uy * w).toFixed(1)} ${(by - ux * w).toFixed(1)}`;
}

export function contributions(
  reading: Reading | null,
  charges: Charges,
  t: Messages,
) {
  const rows = [
    { name: "A", key: "first", reading: reading?.parts[0] },
    { name: "B", key: "second", reading: reading?.parts[1] },
    { name: t.total, key: "total", reading },
  ];

  const toneFor = (index: 0 | 1) =>
    charges[index].nanoCoulombs > 0
      ? "positive"
      : charges[index].nanoCoulombs < 0
        ? "negative"
        : "neutral";

  const vectorBox = (() => {
    const cx = 62;
    const cy = 54;
    const r = 38;
    if (!reading) {
      return svg`<svg viewBox="0 0 124 108" class="vector-mini" aria-hidden="true">
        <circle cx=${cx} cy=${cy} r=${r} class="mini-ring" />
        <line x1=${cx - r} x2=${cx + r} y1=${cy} y2=${cy} class="mini-axis" />
        <line x1=${cx} x2=${cx} y1=${cy - r} y2=${cy + r} class="mini-axis" />
        <circle cx=${cx} cy=${cy} r="3" class="mini-origin masked" />
      </svg>`;
    }
    const [p0, p1] = reading.parts;
    const m0 = Math.hypot(p0.fieldX, p0.fieldY);
    const m1 = Math.hypot(p1.fieldX, p1.fieldY);
    const maxMag = Math.max(zeroTolerance, reading.magnitude, m0, m1);
    const scale = r / maxMag;
    const d0 = { x: p0.fieldX * scale, y: -p0.fieldY * scale };
    const d1 = { x: p1.fieldX * scale, y: -p1.fieldY * scale };
    const dn = { x: reading.fieldX * scale, y: -reading.fieldY * scale };
    const showParallelogram = m0 >= zeroTolerance && m1 >= zeroTolerance;

    return svg`<svg viewBox="0 0 124 108" class="vector-mini" aria-hidden="true">
      <circle cx=${cx} cy=${cy} r=${r} class="mini-ring" />
      <line x1=${cx - r} x2=${cx + r} y1=${cy} y2=${cy} class="mini-axis" />
      <line x1=${cx} x2=${cx} y1=${cy - r} y2=${cy + r} class="mini-axis" />
      ${
        showParallelogram
          ? svg`<line x1=${cx + d0.x} y1=${cy + d0.y} x2=${cx + dn.x} y2=${cy + dn.y} class="mini-sum-guide" />
              <line x1=${cx + d1.x} y1=${cy + d1.y} x2=${cx + dn.x} y2=${cy + dn.y} class="mini-sum-guide" />`
          : svg``
      }
      ${m0 >= zeroTolerance ? svg`<path class=${`mini-vec ${toneFor(0)}`} d=${miniArrow(cx, cy, d0.x, d0.y)} />` : svg``}
      ${m1 >= zeroTolerance ? svg`<path class=${`mini-vec ${toneFor(1)}`} d=${miniArrow(cx, cy, d1.x, d1.y)} />` : svg``}
      ${reading.magnitude >= zeroTolerance ? svg`<path class="mini-vec net" d=${miniArrow(cx, cy, dn.x, dn.y, 6.5)} />` : svg``}
      <circle cx=${cx} cy=${cy} r="2.6" class="mini-origin" />
    </svg>`;
  })();

  const potentialPeak = reading
    ? Math.max(
        1,
        Math.abs(reading.parts[0].potential),
        Math.abs(reading.parts[1].potential),
        Math.abs(reading.potential),
      )
    : 1;
  const barRows = [
    {
      label: "Vₐ",
      value: reading?.parts[0].potential,
      tone: toneFor(0),
    },
    {
      label: "Vᵦ",
      value: reading?.parts[1].potential,
      tone: toneFor(1),
    },
    {
      label: "V",
      value: reading?.potential,
      tone: "total",
    },
  ];

  return html`<div class="contribution-panel">
    <table class="contributions" aria-label=${t.contributions}>
      <thead>
        <tr>
          <th scope="col">${t.source}</th>
          <th scope="col">V <small>(V)</small></th>
          <th scope="col">Eₓ <small>(V/m)</small></th>
          <th scope="col">Eᵧ <small>(V/m)</small></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (row) =>
            html`<tr data-contribution=${row.key}>
              <th scope="row">${row.name}</th>
              <td data-component="potential">
                ${display(row.reading?.potential)}
              </td>
              <td data-component="fieldX">${display(row.reading?.fieldX)}</td>
              <td data-component="fieldY">${display(row.reading?.fieldY)}</td>
            </tr>`,
        )}
      </tbody>
    </table>
    <div class="superposition-visual">
      <div class="mini-card">
        <span class="mini-title">${t.vectorDiagram}</span>
        ${vectorBox}
      </div>
      <div class="mini-card">
        <span class="mini-title">${t.scalarDiagram}</span>
        <div class="scalar-bars">
          ${barRows.map(({ label, value, tone }) => {
            const frac =
              value === undefined
                ? 0
                : clamp((value / potentialPeak) * 50, -50, 50);
            const leftPct = 50 + Math.min(0, frac);
            const widthPct = Math.abs(frac);
            return html`<div class="scalar-row">
              <span>${label}</span>
              <div class="scalar-track" aria-hidden="true">
                <span
                  class=${`scalar-fill ${tone}`}
                  style=${`left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%`}
                ></span>
              </div>
              <output>${display(value)}</output>
            </div>`;
          })}
        </div>
      </div>
    </div>
    <p class="panel-hint">${t.probeHint}</p>
  </div>`;
}

export function slice(
  data: ReturnType<typeof profile>,
  reading: Reading | null,
  charges: Charges,
  height: number,
  scrub: SliceScrub,
  t: Messages,
) {
  const { start, end, scale, segments } = data;
  if (end - start <= 1e-9)
    return html`<div class="slice-panel empty"><p>${t.sliceEmpty}</p></div>`;
  const viewHeight = Math.max(176, Math.round(height));
  const plotBottom = viewHeight - 30;
  const xAt = (value: number) =>
    plotLeft + ((value - start) / (end - start)) * (plotRight - plotLeft);
  const yAt = (value: number) =>
    (plotTop + plotBottom) / 2 - ((value / scale) * (plotBottom - plotTop)) / 2;
  const axis = chargeAxis(charges);
  const parallelField = reading
    ? reading.fieldX * axis.x + reading.fieldY * axis.y
    : undefined;

  return html`<div class="slice-panel">
    <div class="chart-wrap">
      ${svg`<svg class="slice-chart" viewBox=${`0 0 ${chartWidth} ${viewHeight}`} role="img" aria-label=${t.profile}
        @pointerdown=${(event: PointerEvent) => scrub.start(event, start, end)}
        @pointermove=${scrub.move}
        @pointerup=${scrub.end}
        @pointercancel=${scrub.end}
        @lostpointercapture=${scrub.end}>
        <text x=${plotLeft} y="14" class="axis-label">V (V)</text>
        <text x=${plotRight} y="14" text-anchor="end" class="slice-slope">E∥ = ${parallelField === undefined ? "—" : `${display(parallelField)} V/m`}</text>
        ${[-1, -0.5, 0, 0.5, 1].map((fraction) => {
          const y = yAt(fraction * scale);
          return svg`<line x1=${plotLeft} x2=${plotRight} y1=${y} y2=${y} class=${fraction === 0 ? "world-axis" : "grid-line"} />
            <text x="40" y=${y + 3.5} text-anchor="end" class="axis-label">${fraction * scale}</text>`;
        })}
        ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const offset = start + (end - start) * fraction;
          const x = xAt(offset);
          return svg`<line x1=${x} x2=${x} y1=${plotTop} y2=${plotBottom} class="grid-line" />
            <text x=${x} y=${plotBottom + 14} text-anchor="middle" class="axis-label">${offset.toFixed(1)}</text>`;
        })}
        ${segments.map((line) => svg`<polyline class="profile-trace" points=${line.map(({ offset, value }) => `${xAt(offset).toFixed(2)},${yAt(value).toFixed(2)}`).join(" ")} />`)}
        <line class="profile-cursor" x1=${xAt(0)} x2=${xAt(0)} y1=${plotTop} y2=${plotBottom} />
        ${reading ? svg`<circle class="profile-probe" data-potential=${reading.potential} cx=${xAt(0)} cy=${yAt(reading.potential)} r="4.5" />` : svg``}
        <text x=${plotRight} y=${plotBottom + 27} text-anchor="end" class="axis-label">s (m)</text>
      </svg>`}
    </div>
    <p class="panel-hint">${t.sliceHint}</p>
  </div>`;
}
