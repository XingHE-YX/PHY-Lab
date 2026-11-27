import { html, svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  clamp,
  compare,
  duration,
  motions,
  type Motion,
  type Parameters,
  type Sample,
  type Trial,
} from "../model/physics";

export const windowSize = 0.016;
const chartWidth = 342;
const left = 26;
const right = 318;

export function windowStartFor(time: number) {
  const stride = windowSize / 2;
  return Math.min(
    duration - windowSize,
    Math.max(0, Math.floor((time - stride / 2) / stride) * stride),
  );
}

export function chartTimeFromEvent(event: PointerEvent, windowStart: number) {
  const target = event.currentTarget as SVGSVGElement;
  const matrix = target.getScreenCTM();
  if (!matrix) return null;
  const x = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  ).x;
  const ratio = clamp((x - left) / (right - left), 0, 1);
  return clamp(windowStart + ratio * windowSize, 0, duration);
}

export interface ChartScrub {
  start(event: PointerEvent, windowStart: number): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
}

export function arrivals(
  trial: Trial,
  sample: Sample,
  time: number,
  height: number,
  scrub: ChartScrub,
  t: Messages,
) {
  const viewHeight = Math.max(176, Math.round(height));
  const start = windowStartFor(time);
  const end = start + windowSize;
  const x = (mark: number) =>
    left + ((mark - start) / windowSize) * (right - left);

  const topAxis = Math.round(viewHeight * 0.27);
  const bottomAxis = Math.round(viewHeight * 0.67);
  const gridTop = Math.max(24, topAxis - 22);
  const gridBottom = Math.min(viewHeight - 34, bottomAxis + 24);
  const tickY = gridBottom + 14;
  const unitY = Math.min(viewHeight - 3, tickY + 15);

  const rows = [
    {
      label: t.emitRow,
      symbol: "Tₛ",
      style: "emission-row",
      y: topAxis,
      rate: trial.emitted,
      origin: trial.emission(0),
      at: trial.emission,
    },
    {
      label: t.receiveRow,
      symbol: "Tᵣ",
      style: "reception-row",
      y: bottomAxis,
      rate: trial.received,
      origin: trial.arrival(0),
      at: trial.arrival,
    },
  ];

  return html`<div class="timing">
    <div class="chart-wrap">
      ${svg`<svg viewBox=${`0 0 ${chartWidth} ${viewHeight}`} class="timing-chart" role="img"
        aria-label=${t.arrivals} data-received=${trial.received}
        @pointerdown=${(event: PointerEvent) => scrub.start(event, start)}
        @pointermove=${scrub.move}
        @pointerup=${scrub.end}
        @pointercancel=${scrub.end}
        @lostpointercapture=${scrub.end}>
          ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
            const tick = start + windowSize * fraction;
            return svg`<line x1=${x(tick)} x2=${x(tick)} y1=${gridTop} y2=${gridBottom} class="time-grid" />
              <text x=${x(tick)} y=${tickY} text-anchor="middle" class="svg-label">${Math.round(tick * 1000)}</text>`;
          })}
          ${rows.map((row) => {
            const first = Math.ceil((start - row.origin) * row.rate - 1e-9);
            const last = Math.floor((end - row.origin) * row.rate + 1e-9);
            const count = Math.max(0, last - first + 1);
            const pairBracket =
              count >= 2
                ? svg`<rect class="period-band" x=${x(row.at(first))} y=${row.y - 10}
                    width=${Math.max(1, x(row.at(first + 1)) - x(row.at(first)))} height="20" rx="2" />`
                : svg``;
            return svg`<g class=${row.style}>
              <text x=${left} y=${row.y - 19} class="row-label">${row.label}</text>
              <text x=${right} y=${row.y - 19} text-anchor="end" class="svg-label">${row.symbol} = ${(1000 / row.rate).toFixed(2)} ms</text>
              ${pairBracket}
              <line x1=${left} x2=${right} y1=${row.y} y2=${row.y} class="timing-axis" />
              ${Array.from({ length: count }, (_, offset) => {
                const index = offset + first;
                const markTime = row.at(index);
                const highlighted =
                  row.style === "reception-row" &&
                  sample.index === index &&
                  sample.phase < 0.22;
                return svg`<line class=${highlighted ? "crest-tick highlighted" : "crest-tick"} data-index=${index}
                  data-time=${markTime} x1=${x(markTime)} x2=${x(markTime)} y1=${row.y - 10} y2=${row.y + 10} />`;
              })}
              <circle class="cursor-dot" cx=${x(time)} cy=${row.y} r="3.4" />
            </g>`;
          })}
          <line class="chart-cursor" x1=${x(time)} x2=${x(time)} y1=${gridTop} y2=${gridBottom} />
          <text x=${right} y=${unitY} text-anchor="end" class="svg-label">t (ms)</text>
        </svg>`}
    </div>
    <p class="chart-hint">${t.arrivalHint}</p>
  </div>`;
}

export function comparison(
  parameters: Parameters,
  onSelectMotion: (motion: Motion) => void,
  onSwitchMover: () => void,
  t: Messages,
) {
  const effectiveMotion = parameters.speed === 0 ? "rest" : parameters.motion;
  const current = compare(parameters);
  const altMover = parameters.mover === "source" ? "observer" : "source";
  const alt = compare({ ...parameters, mover: altMover });
  const roleDiff = current.received - alt.received;
  const altLabel = altMover === "source" ? t.sourceMoves : t.observerMoves;

  return html`<div class="comparison">
    <div class="comparison-list">
      ${motions.map((motion) => {
        const { emitted, received, shift } = compare({ ...parameters, motion });
        const relative = (100 * shift) / emitted;
        const active = motion === effectiveMotion;
        return html`<button
          type="button"
          class="comparison-row"
          data-case=${motion}
          data-received=${received}
          ?data-active=${active}
          aria-pressed=${active ? "true" : "false"}
          @click=${() => onSelectMotion(motion)}
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
        </button>`;
      })}
      <div class="comp-scale" aria-hidden="true">
        <span>−100%</span><span>0%</span><span>+100%</span>
      </div>
      <div class="role-contrast" data-alt-mover=${altMover}>
        ${
          effectiveMotion === "rest"
            ? html`<p>${t.roleContrastRest}</p>`
            : html`<div class="role-contrast-body">
                  <span>${t.roleContrastLabel} · ${altLabel}</span>
                  <output
                    >${alt.received.toFixed(2)} Hz
                    <small
                      >(${roleDiff >= 0 ? "+" : ""}${roleDiff.toFixed(2)}
                      Hz)</small
                    ></output
                  >
                </div>
                <button
                  type="button"
                  class="switch-role"
                  @click=${onSwitchMover}
                >
                  ${t.switchRole}
                </button>`
        }
      </div>
    </div>
    <p class="chart-hint">${t.comparisonHint}</p>
  </div>`;
}
