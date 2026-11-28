import { html, svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  limits,
  objectFor,
  scenarios,
  solve,
  type Image,
  type Parameters,
} from "../model/optics";

const chartWidth = 340;
const plotLeft = 44;
const plotRight = 320;
const plotTop = 20;
const vMax = 100;

export function signed(value: number | null, unit = "") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
}

export function objectFromCurveEvent(event: PointerEvent) {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  if (!matrix) return null;
  const x = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  ).x;
  const ratio = Math.min(
    1,
    Math.max(0, (x - plotLeft) / (plotRight - plotLeft)),
  );
  return limits.object.min + ratio * (limits.object.max - limits.object.min);
}

export interface CurveScrub {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
}

export function details(
  parameters: Parameters,
  image: Image,
  height: number,
  scrub: CurveScrub,
  t: Messages,
) {
  const { focal, object } = parameters;
  const location =
    image.kind === "real"
      ? t.oppositeSide
      : image.kind === "virtual"
        ? t.objectSide
        : "—";

  const viewHeight = Math.max(152, Math.round(height));
  const plotBottom = viewHeight - 28;
  const uMin = limits.object.min;
  const uMax = limits.object.max;
  const xAt = (u: number) =>
    plotLeft + ((u - uMin) / (uMax - uMin)) * (plotRight - plotLeft);
  const yAt = (v: number) =>
    (plotTop + plotBottom) / 2 - ((v / vMax) * (plotBottom - plotTop)) / 2;

  const sampleBranch = (from: number, to: number) => {
    const pts: string[] = [];
    const steps = 64;
    for (let i = 0; i <= steps; i++) {
      const u = from + ((to - from) * i) / steps;
      const gap = u - focal;
      if (Math.abs(gap) < 1e-4) continue;
      const v = (focal * u) / gap;
      if (Math.abs(v) <= vMax)
        pts.push(`${xAt(u).toFixed(1)},${yAt(v).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  const virtualPts = sampleBranch(uMin, Math.max(uMin, focal - 0.15));
  const realPts = sampleBranch(Math.min(uMax, focal + 0.15), uMax);
  const fx = xAt(focal);
  const fy = yAt(focal);
  const ux = xAt(object);
  const inRangeV = image.distance !== null && Math.abs(image.distance) <= vMax;

  return html`<div class="reading-panel">
    <section class="detail-card">
      <div class="detail-head">
        <h3 data-kind=${image.kind}>${t[image.kind]}</h3>
        <span>${location}</span>
      </div>
      <dl>
        <div>
          <dt>${t.imageDistance}</dt>
          <dd>${signed(image.distance, "cm")}</dd>
        </div>
        <div>
          <dt>${t.magnification}</dt>
          <dd>${signed(image.magnification, "×")}</dd>
        </div>
        <div>
          <dt>${t.imageHeight}</dt>
          <dd>${signed(image.height, "cm")}</dd>
        </div>
      </dl>
    </section>
    <div class="curve-wrap">
      ${svg`<svg class="curve-chart" viewBox=${`0 0 ${chartWidth} ${viewHeight}`} role="img" aria-label="v(u)"
        @pointerdown=${scrub.start}
        @pointermove=${scrub.move}
        @pointerup=${scrub.end}
        @pointercancel=${scrub.end}
        @lostpointercapture=${scrub.end}>
        <text x=${plotLeft} y="13" class="axis-label">v (cm)</text>
        ${[-100, -50, 0, 50, 100].map((val) => {
          const y = yAt(val);
          return svg`<line x1=${plotLeft} x2=${plotRight} y1=${y} y2=${y} class=${val === 0 ? "plot-axis" : "plot-grid"} />
            <text x="38" y=${y + 3.5} text-anchor="end" class="axis-label">${val}</text>`;
        })}
        ${[10, 25, 40, 55, 70].map((val) => {
          const x = xAt(val);
          return svg`<line x1=${x} x2=${x} y1=${plotTop} y2=${plotBottom} class="plot-grid" />
            <text x=${x} y=${plotBottom + 13} text-anchor="middle" class="axis-label">${val}</text>`;
        })}
        <line x1=${fx} x2=${fx} y1=${plotTop} y2=${plotBottom} class="asymptote" />
        <line x1=${plotLeft} x2=${plotRight} y1=${fy} y2=${fy} class="asymptote" />
        <text x=${fx + 4} y=${plotTop + 10} class="asymptote-label">u=f</text>
        ${virtualPts ? svg`<polyline class="curve-trace virtual" points=${virtualPts} />` : svg``}
        ${realPts ? svg`<polyline class="curve-trace real" points=${realPts} />` : svg``}
        <line x1=${ux} x2=${ux} y1=${plotTop} y2=${plotBottom} class="curve-cursor" />
        ${
          inRangeV && image.distance !== null
            ? svg`<circle class=${`curve-point ${image.kind}`} cx=${ux} cy=${yAt(image.distance)} r="4.5" />`
            : svg`<circle class="curve-point off" cx=${ux} cy=${image.distance === null ? yAt(0) : image.distance > 0 ? plotTop + 4 : plotBottom - 4} r="3.5" />`
        }
        <text x=${plotRight} y=${plotBottom + 25} text-anchor="end" class="axis-label">u (cm)</text>
      </svg>`}
    </div>
    <p class="panel-hint">${t.curveHint}</p>
  </div>`;
}

export function comparisons(
  focal: number,
  active: number,
  onSelect: (objectDistance: number) => void,
  t: Messages,
) {
  return html`
    <div class="comparison-panel">
      <table aria-label=${t.compare} class="comparison">
        <thead>
          <tr>
            <th scope="col">u (cm)</th>
            <th scope="col">v (cm)</th>
            <th scope="col">M (×)</th>
          </tr>
        </thead>
        <tbody>
          ${scenarios.map((scenario) => {
            const object = objectFor(scenario, focal);
            const { image } = solve({ focal, object });
            return html`<tr
              class="clickable-row"
              data-scenario=${scenario}
              ?data-current=${object === active}
              tabindex="0"
              role="button"
              @click=${() => onSelect(object)}
              @keydown=${(event: KeyboardEvent) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(object);
                }
              }}
            >
              <th scope="row">
                ${object.toFixed(1)}<small>${t[image.kind]}</small>
              </th>
              <td>${signed(image.distance)}</td>
              <td>${signed(image.magnification)}</td>
            </tr>`;
          })}
        </tbody>
      </table>
      <p class="panel-hint">${t.comparisonHint}</p>
    </div>
  `;
}
