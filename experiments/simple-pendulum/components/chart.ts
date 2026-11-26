import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  limits,
  periodRatio,
  radians,
  type Pendulum,
  type Sample,
} from "../model/physics";
import type { Observation } from "../model/snapshot";

const plot = { left: 45, right: 322, top: 21, bottom: 191 };
const amplitudeLimit = limits.angle.max;
type Axis = {
  min: number;
  max: number;
  ticks: readonly number[];
  label: string;
  digits: number;
};

function horizontal(value: number, axis: Axis) {
  return (
    plot.left +
    ((plot.right - plot.left) * (value - axis.min)) / (axis.max - axis.min)
  );
}

function vertical(value: number, axis: Axis) {
  return (
    plot.bottom -
    ((plot.bottom - plot.top) * (value - axis.min)) / (axis.max - axis.min)
  );
}

const periodX: Axis = {
  min: 0,
  max: amplitudeLimit,
  ticks: [0, 45, 90, 135, 170],
  label: "|θ₀| (°)",
  digits: 0,
};
const periodY: Axis = {
  min: 1,
  max: 2.5,
  ticks: [1, 1.5, 2, 2.5],
  label: "T / T₀",
  digits: 1,
};
const angleSeries = [
  { kind: "actual", value: (sample: Sample) => sample.angle / radians },
  {
    kind: "approximation",
    value: (sample: Sample) => sample.angleLinear / radians,
  },
];
const energySeries = [
  { kind: "potential", value: (sample: Sample) => sample.potential },
  { kind: "kinetic", value: (sample: Sample) => sample.kinetic },
  { kind: "total", value: (sample: Sample) => sample.total },
];

export function chartData(
  model: Pendulum,
  observation: Observation,
  amplitude: number,
) {
  if (observation === "period") {
    return {
      x: periodX,
      y: periodY,
      series: [],
      traces: [
        svg`<line class="trace approximation" x1=${plot.left} x2=${plot.right} y1=${plot.bottom} y2=${plot.bottom} />`,
        svg`<polyline class="trace actual" points=${Array.from(
          { length: amplitudeLimit + 1 },
          (_, angle) =>
            `${horizontal(angle, periodX).toFixed(2)},${vertical(periodRatio(angle), periodY).toFixed(2)}`,
        ).join(" ")} />`,
      ],
    };
  }

  const x: Axis = {
    min: 0,
    max: model.duration,
    ticks: [
      0,
      model.duration / 4,
      model.duration / 2,
      (3 * model.duration) / 4,
      model.duration,
    ],
    label: "t (s)",
    digits: 2,
  };
  const series = observation === "motion" ? angleSeries : energySeries;
  const angleMax = amplitude <= 15 ? 15 : Math.ceil(amplitude / 30) * 30;
  const energyMax = Math.max(1, Math.ceil(model.at(0).total));
  const y: Axis =
    observation === "motion"
      ? {
          min: -angleMax,
          max: angleMax,
          ticks: [-angleMax, 0, angleMax],
          label: "θ (°)",
          digits: 0,
        }
      : {
          min: 0,
          max: energyMax,
          ticks: [0, energyMax / 2, energyMax],
          label: "E / m (J/kg)",
          digits: 1,
        };
  const points = series.map(() => [] as string[]);
  for (let index = 0; index <= 360; index++) {
    const time = (model.duration * index) / 360;
    const sample = model.at(time);
    const left = horizontal(time, x).toFixed(2);
    series.forEach(({ value }, row) =>
      points[row].push(`${left},${vertical(value(sample), y).toFixed(2)}`),
    );
  }
  return {
    x,
    y,
    series,
    traces: series.map(
      ({ kind }, index) =>
        svg`<polyline class=${`trace ${kind}`} points=${points[index].join(" ")} />`,
    ),
  };
}

export function chart(
  data: ReturnType<typeof chartData>,
  model: Pendulum,
  observation: Observation,
  amplitude: number,
  time: number,
  sample: Sample,
  seek: (time: number) => void,
  t: Messages,
) {
  const { x, y, traces, series } = data;
  const cursor = horizontal(observation === "period" ? amplitude : time, x);
  const points =
    observation === "period"
      ? [
          {
            kind: model.period === null ? "limit" : "actual",
            value: model.ratio,
          },
        ]
      : series.map(({ kind, value }) => ({ kind, value: value(sample) }));

  return svg`<svg class=${observation === "period" ? "chart" : "chart seekable"} viewBox="0 0 344 230"
    role="img" aria-label=${t[observation]}
    @click=${(event: MouseEvent) => {
      if (observation === "period" || model.period === null) return;
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
          ((point.x - plot.left) / (plot.right - plot.left)) * model.duration,
        );
    }}>
    <text class="svg-label" x=${plot.left} y="13">${y.label}</text>
    ${y.ticks.map((value) => {
      const level = vertical(value, y);
      return svg`<line class=${value === 0 ? "axis" : "grid-line"} x1=${plot.left} x2=${plot.right} y1=${level} y2=${level} />
        <text class="svg-label" x="37" y=${level + 4} text-anchor="end">${value.toFixed(y.digits)}</text>`;
    })}
    ${x.ticks.map((value) => {
      const offset = horizontal(value, x);
      return svg`<line class="grid-line" x1=${offset} x2=${offset} y1=${plot.top} y2=${plot.bottom} />
        <text class="svg-label" x=${offset} y="207" text-anchor="middle">${value.toFixed(x.digits)}</text>`;
    })}
    ${traces}
    <line class="graph-cursor" x1=${cursor} x2=${cursor} y1=${plot.top} y2=${plot.bottom} />
    ${points.map(
      ({ kind, value }) => svg`<circle class=${`chart-point ${kind}`}
      data-series=${kind} data-value=${value} cx=${cursor} cy=${vertical(value, y)} r="4" />`,
    )}
    <text class="svg-label" x=${plot.right} y="224" text-anchor="end">${x.label}</text>
  </svg>`;
}
