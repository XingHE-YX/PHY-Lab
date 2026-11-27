import { html, svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  compare,
  duration,
  motions,
  type Parameters,
  type Sample,
  type Trial,
} from "../model/physics";

const windowSize = 0.016;
const left = 31;
const right = 314;

export function arrivals(
  trial: Trial,
  sample: Sample,
  time: number,
  t: Messages,
) {
  const stride = windowSize / 2;
  const start = Math.min(
    duration - windowSize,
    Math.max(0, Math.floor((time - stride / 2) / stride) * stride),
  );
  const end = start + windowSize;
  const x = (mark: number) =>
    left + ((mark - start) / windowSize) * (right - left);
  const rows = [
    {
      label: t.emitRow,
      style: "emission-row",
      y: 60,
      rate: trial.emitted,
      origin: trial.emission(0),
      at: trial.emission,
    },
    {
      label: t.receiveRow,
      style: "reception-row",
      y: 145,
      rate: trial.received,
      origin: trial.arrival(0),
      at: trial.arrival,
    },
  ];

  return html` <div class="timing">
    ${svg`<svg viewBox="0 0 342 208" class="timing-chart" role="img" aria-label=${t.arrivals} data-received=${trial.received}>
        ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const tick = start + windowSize * fraction;
          return svg`<line x1=${x(tick)} x2=${x(tick)} y1="44" y2="172" class="time-grid" />
            <text x=${x(tick)} y="189" text-anchor="middle" class="svg-label">${Math.round(tick * 1000)}</text>`;
        })}
        ${rows.map((row) => {
          const first = Math.ceil((start - row.origin) * row.rate - 1e-9);
          const last = Math.floor((end - row.origin) * row.rate + 1e-9);
          return svg`<g class=${row.style}>
            <text x=${left} y=${row.y - 25} class="row-label">${row.label}</text>
            <text x=${right} y=${row.y - 25} text-anchor="end" class="svg-label">T = ${(1000 / row.rate).toFixed(2)} ms</text>
            <line x1=${left} x2=${right} y1=${row.y} y2=${row.y} class="timing-axis" />
            ${Array.from(
              { length: Math.max(0, last - first + 1) },
              (_, offset) => {
                const index = offset + first;
                const time = row.at(index);
                const highlighted =
                  row.style === "reception-row" &&
                  sample.index === index &&
                  sample.phase < 0.22;
                return svg`<line class=${highlighted ? "crest-tick highlighted" : "crest-tick"} data-index=${index}
                data-time=${time} x1=${x(time)} x2=${x(time)} y1=${row.y - 10} y2=${row.y + 10} />`;
              },
            )}
          </g>`;
        })}
        <line class="chart-cursor" x1=${x(time)} x2=${x(time)} y1="45" y2="172" />
        <text x=${right} y="203" text-anchor="end" class="svg-label">t (ms)</text>
      </svg>`}
    <p>${t.arrivalHint}</p>
  </div>`;
}

export function comparison(parameters: Parameters, t: Messages) {
  return html`<div class="comparison">
    <div class="comparison-list">
      ${motions.map((motion) => {
        const { emitted, received, shift } = compare({ ...parameters, motion });
        const relative = (100 * shift) / emitted;
        return html`<div
          class="comparison-row"
          data-case=${motion}
          data-received=${received}
          ?data-active=${motion === (parameters.speed === 0 ? "rest" : parameters.motion)}
        >
          <div class="comparison-label">
            <span>${t[motion]}</span><output>${received.toFixed(2)} Hz</output>
          </div>
          <div class="bar" aria-hidden="true">
            <span
              style=${`left:${50 + Math.min(0, relative / 2)}%;width:${Math.abs(relative) / 2}%`}
            ></span>
          </div>
          <output class="relative"
            >${relative > 0 ? "+" : ""}${relative.toFixed(1)}%</output
          >
        </div>`;
      })}
      <div class="comp-scale" aria-hidden="true">
        <span>−100%</span><span>0%</span><span>+100%</span>
      </div>
    </div>
    <p>${t.comparisonHint}</p>
  </div>`;
}
