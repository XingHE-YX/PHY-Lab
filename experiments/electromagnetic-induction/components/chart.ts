import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  intervalSample,
  sampleAt,
  stepSeconds,
  type Parameters,
  type Sample,
} from "../model/physics";
import type { Observation } from "../model/snapshot";

const plot = { left: 48, right: 320, top: 22, bottom: 203 };
export const units = { flux: "μWb", emf: "mV", current: "mA" } as const;
const multipliers = { flux: 1e6, emf: 1e3, current: 1e3 };
const spanFloor = { flux: 1, emf: 0.2, current: 0.02 };
const symbols = { flux: "Φ", emf: "ε", current: "I" };

export function plotValue(sample: Sample, metric: Observation) {
  return sample[metric] * multipliers[metric];
}

const xAt = (step: number, duration: number) =>
  plot.left + ((plot.right - plot.left) * step * stepSeconds) / duration;
const yAt = (value: number, scale: number) =>
  (plot.top + plot.bottom) / 2 -
  (value * (plot.bottom - plot.top)) / (2 * scale);

export function chartData(
  parameters: Parameters,
  path: readonly number[],
  metric: Observation,
) {
  const duration = Math.max(
    4,
    Math.ceil(((path.length - 1) * stepSeconds) / 4) * 4,
  );
  const values = [
    { step: 0, value: plotValue(sampleAt(parameters, path, 0), metric) },
  ];
  for (let index = 1; index < path.length; index++) {
    for (const fraction of [0, 1]) {
      const sample = intervalSample(
        parameters,
        path[index - 1],
        path[index],
        fraction,
      );
      values.push({
        step: index - 1 + fraction,
        value: plotValue(sample, metric),
      });
    }
  }
  const peak = Math.max(
    spanFloor[metric],
    ...values.map(({ value }) => Math.abs(value)),
  );
  const increment = 10 ** Math.floor(Math.log10(peak));
  const scale = Math.ceil((peak * 1.05) / increment) * increment;
  return {
    duration,
    scale,
    trace: values
      .map(
        ({ step, value }) =>
          `${xAt(step, duration).toFixed(2)},${yAt(value, scale).toFixed(2)}`,
      )
      .join(" "),
  };
}

export function chart(
  data: ReturnType<typeof chartData>,
  metric: Observation,
  cursor: number,
  sample: Sample,
  last: number,
  seek: (step: number) => void,
  t: Messages,
) {
  const { duration, scale, trace } = data;
  const activeX = xAt(cursor, duration);
  const value = plotValue(sample, metric);
  return svg`<svg class=${`trace-chart ${metric}`} viewBox="0 0 342 239" role="img" aria-label=${t[metric]}
    @click=${(event: MouseEvent) => {
      if (last <= 0) return;
      const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
      if (!matrix) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      );
      if (
        point.x >= plot.left &&
        point.x <= plot.right &&
        point.y >= plot.top &&
        point.y <= plot.bottom
      )
        seek(
          Math.min(
            last,
            ((duration / stepSeconds) * (point.x - plot.left)) /
              (plot.right - plot.left),
          ),
        );
    }}>
    <text x=${plot.left} y="14" class="svg-label">${symbols[metric]} (${units[metric]})</text>
    ${[-1, -0.5, 0, 0.5, 1].map((fraction) => {
      const level = yAt(fraction * scale, scale);
      return svg`<line x1=${plot.left} x2=${plot.right} y1=${level} y2=${level} class=${fraction === 0 ? "axis-line" : "chart-grid"} />
        <text x="41" y=${level + 4} class="svg-label" text-anchor="end">${Number((fraction * scale).toFixed(3))}</text>`;
    })}
    ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      const x = plot.left + (plot.right - plot.left) * fraction;
      return svg`<line x1=${x} x2=${x} y1=${plot.top} y2=${plot.bottom} class="chart-grid" />
        <text x=${x} y="220" class="svg-label" text-anchor="middle">${fraction * duration}</text>`;
    })}
    <polyline class="trace" points=${trace} />
    <line x1=${activeX} x2=${activeX} y1=${plot.top} y2=${plot.bottom} class="chart-cursor" />
    <circle cx=${activeX} cy=${yAt(value, scale)} r="4.5" class="chart-point" data-value=${value} />
    <text x=${plot.right} y="235" text-anchor="end" class="svg-label">t (s)</text>
  </svg>`;
}
