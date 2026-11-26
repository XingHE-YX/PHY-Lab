import { svg } from "lit";
import type { Messages } from "../locales/messages";
import { at, derive, envelope, type Parameters } from "../model/physics";
import type { Observation } from "../model/snapshot";

export const viewWidth = 344;
export const defaultChartHeight = 224;
const maxDisplacement = 8;

export function plotBox(height: number) {
  return { left: 40, right: 326, top: 20, bottom: Math.max(110, height - 34) };
}

export interface Window {
  start: number;
  end: number;
}

export function chartWindow(
  parameters: Parameters,
  observation: Observation,
  time: number,
): Window {
  const { duration, waveWindow } = derive(parameters);
  if (observation === "envelope" || duration <= waveWindow)
    return { start: 0, end: duration };
  const stride = waveWindow * 0.5;
  const start = Math.min(
    duration - waveWindow,
    Math.max(0, Math.floor((time - stride / 2) / stride) * stride),
  );
  return { start, end: start + waveWindow };
}

const xAt = (plot: ReturnType<typeof plotBox>, window: Window, time: number) =>
  plot.left +
  ((plot.right - plot.left) * (time - window.start)) /
    (window.end - window.start);

const yAt = (plot: ReturnType<typeof plotBox>, value: number) =>
  (plot.top + plot.bottom) / 2 -
  (value * (plot.bottom - plot.top)) / (2 * maxDisplacement);

export function paths(
  parameters: Parameters,
  observation: Observation,
  window: Window,
  height = defaultChartHeight,
) {
  const plot = plotBox(height);
  const width = window.end - window.start;
  const maxFreq = Math.max(
    parameters.frequencyFirst,
    parameters.frequencySecond,
  );
  if (observation === "waves") {
    const kinds = ["first", "second", "sum"] as const;
    const points = kinds.map(() => [] as string[]);
    const samples = Math.max(96, Math.ceil(24 * width * maxFreq));
    for (let index = 0; index <= samples; index++) {
      const time = window.start + (index / samples) * width;
      const x = xAt(plot, window, time).toFixed(2);
      const mark = at(parameters, time);
      [mark.firstX, mark.secondX, mark.sumX].forEach((value, row) =>
        points[row].push(`${x},${yAt(plot, value).toFixed(2)}`),
      );
    }
    return kinds.map(
      (kind, index) =>
        svg`<polyline class=${`trace ${kind}`} points=${points[index].join(" ")} />`,
    );
  }

  const carrierSamples = Math.min(
    900,
    Math.max(240, Math.ceil(20 * width * maxFreq)),
  );
  const carrierPoints: string[] = [];
  for (let index = 0; index <= carrierSamples; index++) {
    const time = window.start + (index / carrierSamples) * width;
    const x = xAt(plot, window, time).toFixed(2);
    carrierPoints.push(
      `${x},${yAt(plot, at(parameters, time).sumX).toFixed(2)}`,
    );
  }

  const upperPoints: string[] = [];
  const lowerPoints: string[] = [];
  const boundSamples = 320;
  for (let index = 0; index <= boundSamples; index++) {
    const time = window.start + (index / boundSamples) * width;
    const x = xAt(plot, window, time).toFixed(2);
    const radius = envelope(parameters, time);
    upperPoints.push(`${x},${yAt(plot, radius).toFixed(2)}`);
    lowerPoints.push(`${x},${yAt(plot, -radius).toFixed(2)}`);
  }

  return [
    svg`<polyline class="trace carrier" points=${carrierPoints.join(" ")} />`,
    svg`<polyline class="trace bound" points=${upperPoints.join(" ")} />`,
    svg`<polyline class="trace bound" points=${lowerPoints.join(" ")} />`,
  ];
}

interface Interactions {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
}

export function chart(
  parameters: Parameters,
  observation: Observation,
  window: Window,
  time: number,
  traces: ReturnType<typeof paths>,
  interactions: Interactions,
  t: Messages,
  height = defaultChartHeight,
) {
  const plot = plotBox(height);
  const { firstX, secondX, sumX } = at(parameters, time);
  const radius = envelope(parameters, time);
  const cursor = xAt(plot, window, time);
  const readings =
    observation === "waves"
      ? [
          { kind: "first", value: firstX },
          { kind: "second", value: secondX },
        ]
      : [
          { kind: "bound", value: radius },
          { kind: "bound", value: -radius },
        ];
  return svg`<svg
    class="time-chart"
    viewBox=${`0 0 ${viewWidth} ${height}`}
    role="img"
    aria-label=${t[observation]}
    data-start=${window.start}
    data-end=${window.end}
    @pointerdown=${interactions.start}
    @pointermove=${interactions.move}
    @pointerup=${interactions.end}
    @pointercancel=${interactions.end}
    @lostpointercapture=${interactions.end}
  >
    <text class="svg-label" x=${plot.left} y="13">${observation === "waves" ? "x (cm)" : "x, ±R (cm)"}</text>
    ${[-8, -4, 0, 4, 8].map((value) => {
      const y = yAt(plot, value);
      return svg`<line class=${value === 0 ? "axis" : "guide"} x1=${plot.left} x2=${plot.right} y1=${y} y2=${y} />
        <text class="svg-label" x="32" y=${y + 3.5} text-anchor="end">${value}</text>`;
    })}
    ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      const x = plot.left + fraction * (plot.right - plot.left);
      const stamp = window.start + fraction * (window.end - window.start);
      return svg`<line class="guide" x1=${x} x2=${x} y1=${plot.top} y2=${plot.bottom} />
        <text class="svg-label" x=${x} y=${plot.bottom + 15} text-anchor="middle">${stamp.toFixed(2)}</text>`;
    })}
    ${traces}
    <line class="cursor" x1=${cursor} x2=${cursor} y1=${plot.top} y2=${plot.bottom} />
    ${[...readings, { kind: "sum", value: sumX }].map(({ kind, value }) => svg`<circle class=${`point ${kind}`} data-series=${kind} data-value=${value} cx=${cursor} cy=${yAt(plot, value)} r="3.5" />`)}
    <text class="svg-label" x=${plot.right} y=${height - 4} text-anchor="end">t (s)</text>
  </svg>`;
}

export function pointerFraction(event: PointerEvent) {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  const { left, right } = plotBox(defaultChartHeight);
  return (point.x - left) / (right - left);
}
