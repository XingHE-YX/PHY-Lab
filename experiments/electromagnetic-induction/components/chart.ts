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

export const viewWidth = 342;
export const defaultChartHeight = 224;
export const units = { flux: "μWb", emf: "mV", current: "mA" } as const;
const multipliers = { flux: 1e6, emf: 1e3, current: 1e3 };
const spanFloor = { flux: 1, emf: 0.2, current: 0.02 };
const symbols = { flux: "Φ", emf: "ε", current: "I" };

export function plotBox(height: number) {
  return { left: 48, right: 320, top: 20, bottom: Math.max(110, height - 34) };
}

export function plotValue(sample: Sample, metric: Observation) {
  return sample[metric] * multipliers[metric];
}

const xAt = (
  plot: ReturnType<typeof plotBox>,
  step: number,
  duration: number,
) => plot.left + ((plot.right - plot.left) * step * stepSeconds) / duration;

const yAt = (plot: ReturnType<typeof plotBox>, value: number, scale: number) =>
  (plot.top + plot.bottom) / 2 -
  (value * (plot.bottom - plot.top)) / (2 * scale);

export function chartData(
  parameters: Parameters,
  path: readonly number[],
  metric: Observation,
  height = defaultChartHeight,
) {
  const plot = plotBox(height);
  const duration = Math.max(
    4,
    Math.ceil(((path.length - 1) * stepSeconds) / 4) * 4,
  );
  const firstSample = sampleAt(parameters, path, 0);
  const values = [
    {
      step: 0,
      value: plotValue(firstSample, metric),
      flux: plotValue(firstSample, "flux"),
    },
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
        flux: plotValue(sample, "flux"),
      });
    }
  }
  const peak = Math.max(
    spanFloor[metric],
    ...values.map(({ value }) => Math.abs(value)),
  );
  const increment = 10 ** Math.floor(Math.log10(peak));
  const scale = Math.ceil((peak * 1.05) / increment) * increment;
  const fluxPeak = Math.max(
    spanFloor.flux,
    ...values.map(({ flux }) => Math.abs(flux)),
  );
  return {
    duration,
    scale,
    trace: values
      .map(
        ({ step, value }) =>
          `${xAt(plot, step, duration).toFixed(2)},${yAt(plot, value, scale).toFixed(2)}`,
      )
      .join(" "),
    fluxRef:
      metric === "flux"
        ? ""
        : values
            .map(
              ({ step, flux }) =>
                `${xAt(plot, step, duration).toFixed(2)},${yAt(plot, (flux / fluxPeak) * scale * 0.72, scale).toFixed(2)}`,
            )
            .join(" "),
  };
}

interface Interactions {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
}

export function chartFraction(event: PointerEvent) {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  const { left, right } = plotBox(defaultChartHeight);
  return (point.x - left) / (right - left);
}

export function chart(
  data: ReturnType<typeof chartData>,
  metric: Observation,
  cursor: number,
  sample: Sample,
  interactions: Interactions,
  t: Messages,
  height = defaultChartHeight,
) {
  const plot = plotBox(height);
  const { duration, scale, trace, fluxRef } = data;
  const activeX = xAt(plot, cursor, duration);
  const value = plotValue(sample, metric);
  return svg`<svg
    class=${`trace-chart ${metric}`}
    viewBox=${`0 0 ${viewWidth} ${height}`}
    role="img"
    aria-label=${t[metric]}
    @pointerdown=${interactions.start}
    @pointermove=${interactions.move}
    @pointerup=${interactions.end}
    @pointercancel=${interactions.end}
    @lostpointercapture=${interactions.end}
  >
    <text x=${plot.left} y="13" class="svg-label">${symbols[metric]} (${units[metric]})</text>
    ${[-1, -0.5, 0, 0.5, 1].map((fraction) => {
      const level = yAt(plot, fraction * scale, scale);
      return svg`<line x1=${plot.left} x2=${plot.right} y1=${level} y2=${level} class=${fraction === 0 ? "axis-line" : "chart-grid"} />
        <text x="41" y=${level + 3.5} class="svg-label" text-anchor="end">${Number((fraction * scale).toFixed(3))}</text>`;
    })}
    ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      const x = plot.left + (plot.right - plot.left) * fraction;
      return svg`<line x1=${x} x2=${x} y1=${plot.top} y2=${plot.bottom} class="chart-grid" />
        <text x=${x} y=${plot.bottom + 15} class="svg-label" text-anchor="middle">${fraction * duration}</text>`;
    })}
    ${fluxRef ? svg`<polyline class="trace flux-ref" points=${fluxRef} />` : svg``}
    <polyline class="trace" points=${trace} />
    <line x1=${activeX} x2=${activeX} y1=${plot.top} y2=${plot.bottom} class="chart-cursor" />
    <circle cx=${activeX} cy=${yAt(plot, value, scale)} r="4.5" class="chart-point" data-value=${value} />
    <text x=${plot.right} y=${height - 4} text-anchor="end" class="svg-label">t (s)</text>
  </svg>`;
}
