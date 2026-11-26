import { svg } from "lit";
import type { Messages } from "../locales/messages";
import { at, derive, envelope, type Parameters } from "../model/physics";
import type { Observation } from "../model/snapshot";

export const plot = { left: 40, right: 326, top: 22, bottom: 192 };
const viewWidth = 344;
const viewHeight = 228;
const maxDisplacement = 8;

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

const xAt = (window: Window, time: number) =>
  plot.left +
  ((plot.right - plot.left) * (time - window.start)) /
    (window.end - window.start);
const yAt = (value: number) =>
  (plot.top + plot.bottom) / 2 -
  (value * (plot.bottom - plot.top)) / (2 * maxDisplacement);

export function paths(
  parameters: Parameters,
  observation: Observation,
  window: Window,
) {
  const kinds =
    observation === "waves" ? ["first", "second", "sum"] : ["bound", "bound"];
  const points = kinds.map(() => [] as string[]);
  const width = window.end - window.start;
  const samples =
    observation === "waves"
      ? Math.max(
          96,
          Math.ceil(
            24 *
              width *
              Math.max(parameters.frequencyFirst, parameters.frequencySecond),
          ),
        )
      : 320;

  for (let index = 0; index <= samples; index++) {
    const time = window.start + (index / samples) * width;
    const x = xAt(window, time).toFixed(2);
    const mark = observation === "waves" ? at(parameters, time) : null;
    const radius = mark ? 0 : envelope(parameters, time);
    const values = mark
      ? [mark.firstX, mark.secondX, mark.sumX]
      : [radius, -radius];
    values.forEach((value, row) =>
      points[row].push(`${x},${yAt(value).toFixed(2)}`),
    );
  }
  return kinds.map(
    (kind, index) =>
      svg`<polyline class=${`trace ${kind}`} points=${points[index].join(" ")} />`,
  );
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
) {
  const { firstX, secondX, sumX } = at(parameters, time);
  const radius = envelope(parameters, time);
  const cursor = xAt(window, time);
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
    viewBox=${`0 0 ${viewWidth} ${viewHeight}`}
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
    <text class="svg-label" x=${plot.left} y="14">${observation === "waves" ? "x (cm)" : "x, ±R (cm)"}</text>
    ${[-8, -4, 0, 4, 8].map((value) => {
      const y = yAt(value);
      return svg`<line class=${value === 0 ? "axis" : "guide"} x1=${plot.left} x2=${plot.right} y1=${y} y2=${y} />
        <text class="svg-label" x="32" y=${y + 4} text-anchor="end">${value}</text>`;
    })}
    ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
      const x = plot.left + fraction * (plot.right - plot.left);
      const stamp = window.start + fraction * (window.end - window.start);
      return svg`<line class="guide" x1=${x} x2=${x} y1=${plot.top} y2=${plot.bottom} />
        <text class="svg-label" x=${x} y="209" text-anchor="middle">${stamp.toFixed(2)}</text>`;
    })}
    ${traces}
    <line class="cursor" x1=${cursor} x2=${cursor} y1=${plot.top} y2=${plot.bottom} />
    ${[...readings, { kind: "sum", value: sumX }].map(({ kind, value }) => svg`<circle class=${`point ${kind}`} data-series=${kind} data-value=${value} cx=${cursor} cy=${yAt(value)} r="3.5" />`)}
    <text class="svg-label" x=${plot.right} y="224" text-anchor="end">t (s)</text>
  </svg>`;
}

export function pointerFraction(event: PointerEvent) {
  const matrix = (event.currentTarget as SVGSVGElement).getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return (point.x - plot.left) / (plot.right - plot.left);
}
