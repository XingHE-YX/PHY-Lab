import { html, nothing, svg } from "lit";
import type { Messages } from "../locales/messages";
import { clamp, type Metric, type Sample, type Trial } from "../model/physics";

const series = ["left", "right", "total"] as const;
export const units = { momentum: "kg·m/s", kinetic: "J" };
export const symbols = { momentum: "p", kinetic: "K" };
const chartWidth = 338;
const plotLeft = 46;
const plotRight = 318;
const plotTop = 20;

export function number(value: number, digits = 2) {
  const factor = 10 ** digits;
  const magnitude = Math.abs(value) * factor;
  const rounded = Math.round(magnitude + Number.EPSILON * magnitude);
  return ((Math.sign(value) * rounded) / factor).toFixed(digits);
}

export function chartTimeFromEvent(event: PointerEvent, duration: number) {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  if (!matrix) return null;
  const x = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  ).x;
  const ratio = clamp((x - plotLeft) / (plotRight - plotLeft), 0, 1);
  return ratio * duration;
}

export interface ChartScrub {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
}

export function totals(trial: Trial, sample: Sample, t: Messages) {
  const pct =
    trial.transfer !== null &&
    trial.transfer > 1e-6 &&
    trial.before.kinetic.total > 1e-9
      ? Math.round((100 * trial.transfer) / trial.before.kinetic.total)
      : null;
  return html`<div class="totals">
    <table aria-label=${t.compare}>
      <thead>
        <tr>
          <th scope="col">${t.compare}</th>
          <th scope="col" ?data-current=${sample.phase !== "after"}>
            ${trial.contact === null ? t.initial : t.before}
          </th>
          <th scope="col" ?data-current=${sample.phase === "after"}>
            ${t.after}
          </th>
        </tr>
      </thead>
      <tbody>
        ${(["momentum", "kinetic"] as const).map(
          (metric) =>
            html`<tr>
              <th scope="row">
                ${metric === "momentum" ? t.momentum : t.kinetic}
                <small>${units[metric]}</small>
              </th>
              <td data-before=${metric}>
                ${number(trial.before[metric].total)}
              </td>
              <td data-after=${metric}>
                ${trial.after ? number(trial.after[metric].total) : "—"}
              </td>
            </tr>`,
        )}
      </tbody>
    </table>
    <p class="conversion">
      <span>${t.transfer}</span>
      <span class="conversion-val">
        <output data-transfer
          >${trial.transfer === null ? "—" : `${number(trial.transfer)} J`}</output
        >${pct !== null ? html`<small class="transfer-pct"> (${pct}%)</small>` : nothing}
      </span>
    </p>
  </div>`;
}

export function plotQuantities(
  trial: Trial,
  sample: Sample,
  time: number,
  metric: Metric,
  height: number,
  scrub: ChartScrub,
  t: Messages,
) {
  const viewHeight = Math.max(152, Math.round(height));
  const plotBottom = viewHeight - 30;
  const before = trial.before[metric];
  const after = trial.after?.[metric] ?? before;
  const peak = Math.max(
    1,
    ...[before, after].flatMap((values) =>
      series.map((key) => Math.abs(values[key])),
    ),
  );
  const increment = 10 ** Math.floor(Math.log10(peak));
  const upper = Math.ceil(peak / increment) * increment;
  const lower = metric === "momentum" ? -upper : 0;
  const xAt = (point: number) =>
    plotLeft + ((plotRight - plotLeft) * point) / trial.duration;
  const yAt = (value: number) =>
    plotBottom - ((plotBottom - plotTop) * (value - lower)) / (upper - lower);
  const eventX = trial.contact === null ? null : xAt(trial.contact);
  const cursor = xAt(time);

  return html`<div class=${`legend ${metric}`}>
      <span class="left">A</span><span class="right">B</span
      ><span class="aggregate">${t.total}</span>
    </div>
    <div class="chart-wrap">
      ${svg`<svg class=${`quantity-chart ${metric}`} viewBox=${`0 0 ${chartWidth} ${viewHeight}`} role="img" aria-label=${t[metric]}
        @pointerdown=${scrub.start}
        @pointermove=${scrub.move}
        @pointerup=${scrub.end}
        @pointercancel=${scrub.end}
        @lostpointercapture=${scrub.end}>
        <text x=${plotLeft} y="13" class="scale-label">${symbols[metric]} (${units[metric]})</text>
        ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = lower + (upper - lower) * fraction;
          const y = yAt(value);
          return svg`<line x1=${plotLeft} x2=${plotRight} y1=${y} y2=${y} class=${value === 0 ? "plot-axis" : "plot-grid"} />
            <text x="40" y=${y + 3.5} text-anchor="end" class="scale-label">${Number(value.toFixed(2))}</text>`;
        })}
        ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const stamp = trial.duration * fraction;
          const x = xAt(stamp);
          return svg`<line x1=${x} x2=${x} y1=${plotTop} y2=${plotBottom} class="plot-grid" />
            <text x=${x} y=${plotBottom + 14} text-anchor="middle" class="scale-label">${number(stamp)}</text>`;
        })}
        ${
          eventX !== null
            ? svg`<line x1=${eventX} x2=${eventX} y1=${plotTop} y2=${plotBottom} class="contact-line" />
              <text x=${eventX > plotRight - 28 ? eventX - 4 : eventX + 4} y=${plotTop + 10} text-anchor=${eventX > plotRight - 28 ? "end" : "start"} class="contact-tag">t꜀</text>`
            : svg``
        }
        ${series.map((key) => {
          const startY = yAt(before[key]);
          const endY = yAt(after[key]);
          const transition = eventX === null ? "" : `H ${eventX} V ${endY}`;
          return svg`<path class=${`trace ${key === "total" ? "aggregate" : key}`} d=${`M ${plotLeft} ${startY} ${transition} H ${plotRight}`} />`;
        })}
        <line x1=${cursor} x2=${cursor} y1=${plotTop} y2=${plotBottom} class="chart-cursor" />
        ${series.map(
          (
            key,
          ) => svg`<circle class=${`chart-point ${key === "total" ? "aggregate" : key}`}
          cx=${cursor} cy=${yAt(sample[metric][key])} r="3.8" data-series=${key} data-value=${sample[metric][key]} />`,
        )}
        <text x=${plotRight} y=${plotBottom + 27} text-anchor="end" class="scale-label">t (s)</text>
      </svg>`}
    </div>
    <p class="chart-hint">${t.chartHint}</p>`;
}
