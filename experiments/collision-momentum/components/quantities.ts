import { html, svg } from "lit";
import type { Messages } from "../locales/messages";
import type { Metric, Sample, Trial } from "../model/physics";

const series = ["left", "right", "total"] as const;
export const units = { momentum: "kg·m/s", kinetic: "J" };
export const symbols = { momentum: "p", kinetic: "K" };
const plot = { left: 47, right: 317, top: 22, bottom: 143 };

export function number(value: number, digits = 2) {
  const factor = 10 ** digits;
  const magnitude = Math.abs(value) * factor;
  const rounded = Math.round(magnitude + Number.EPSILON * magnitude);
  return ((Math.sign(value) * rounded) / factor).toFixed(digits);
}

export function totals(trial: Trial, sample: Sample, t: Messages) {
  return html`<div class="totals">
    <h2>${t.compare}</h2>
    <table aria-label=${t.compare}>
      <thead>
        <tr>
          <th scope="col">${t.total}</th>
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
      <output data-transfer
        >${trial.transfer === null ? "—" : `${number(trial.transfer)} J`}</output
      >
    </p>
  </div>`;
}

export function plotQuantities(
  trial: Trial,
  sample: Sample,
  time: number,
  metric: Metric,
  seek: (time: number) => void,
  t: Messages,
) {
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
    plot.left + ((plot.right - plot.left) * point) / trial.duration;
  const yAt = (value: number) =>
    plot.bottom -
    ((plot.bottom - plot.top) * (value - lower)) / (upper - lower);
  const eventX = trial.contact === null ? null : xAt(trial.contact);
  const cursor = xAt(time);

  return html` <div class=${`legend ${metric}`}>
      <span class="left">A</span><span class="right">B</span
      ><span class="aggregate">${t.total}</span>
    </div>
    <div class="chart-wrap">
      ${svg`<svg class=${`quantity-chart ${metric}`} viewBox="0 0 338 179" role="img" aria-label=${t[metric]}
        @click=${(event: MouseEvent) => {
          const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
          if (!matrix) return;
          const point = new DOMPoint(
            event.clientX,
            event.clientY,
          ).matrixTransform(matrix.inverse());
          if (
            point.x >= plot.left &&
            point.x <= plot.right &&
            point.y >= plot.top &&
            point.y <= plot.bottom
          )
            seek(
              ((point.x - plot.left) * trial.duration) /
                (plot.right - plot.left),
            );
        }}>
        <text x=${plot.left} y="14" class="scale-label">${symbols[metric]} (${units[metric]})</text>
        ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const value = lower + (upper - lower) * fraction;
          const y = yAt(value);
          return svg`<line x1=${plot.left} x2=${plot.right} y1=${y} y2=${y} class=${value === 0 ? "plot-axis" : "plot-grid"} />
            <text x="40" y=${y + 4} text-anchor="end" class="scale-label">${Number(value.toFixed(2))}</text>`;
        })}
        ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const stamp = trial.duration * fraction;
          const x = xAt(stamp);
          return svg`<line x1=${x} x2=${x} y1=${plot.top} y2=${plot.bottom} class="plot-grid" />
            <text x=${x} y="159" text-anchor="middle" class="scale-label">${number(stamp)}</text>`;
        })}
        ${eventX !== null ? svg`<line x1=${eventX} x2=${eventX} y1=${plot.top} y2=${plot.bottom} class="contact-line" />` : svg``}
        ${series.map((key) => {
          const startY = yAt(before[key]);
          const endY = yAt(after[key]);
          const transition = eventX === null ? "" : `H ${eventX} V ${endY}`;
          return svg`<path class=${`trace ${key === "total" ? "aggregate" : key}`} d=${`M ${plot.left} ${startY} ${transition} H ${plot.right}`} />`;
        })}
        <line x1=${cursor} x2=${cursor} y1=${plot.top} y2=${plot.bottom} class="chart-cursor" />
        ${series.map(
          (
            key,
          ) => svg`<circle class=${`chart-point ${key === "total" ? "aggregate" : key}`}
          cx=${cursor} cy=${yAt(sample[metric][key])} r="4" data-series=${key} data-value=${sample[metric][key]} />`,
        )}
        <text x=${plot.right} y="175" text-anchor="end" class="scale-label">t (s)</text>
      </svg>`}
    </div>`;
}
