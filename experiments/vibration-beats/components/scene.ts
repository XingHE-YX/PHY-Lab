import { svg } from "lit";
import type { Messages } from "../locales/messages";
import type { at } from "../model/physics";

const originX = 152;
const originY = 162;
const trackX = 425;
const scale = 13;

type Point = { x: number; y: number };

function vector(start: Point, end: Point, kind: string) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (length < 0.01) return svg``;
  const alongX = (end.x - start.x) / length;
  const alongY = (end.y - start.y) / length;
  const headSize = Math.min(7, length * 0.45);
  const baseX = end.x - alongX * headSize;
  const baseY = end.y - alongY * headSize;
  return svg`<g class=${kind}>
    <line x1=${start.x} y1=${start.y} x2=${end.x} y2=${end.y} class="vector-line" />
    <path d=${`M ${end.x} ${end.y} L ${baseX - alongY * headSize * 0.55} ${baseY + alongX * headSize * 0.55} L ${baseX + alongY * headSize * 0.55} ${baseY - alongX * headSize * 0.55} Z`} fill="currentColor" />
  </g>`;
}

export function scene(
  state: ReturnType<typeof at>,
  vectors: boolean,
  t: Messages,
) {
  const origin = { x: originX, y: originY };
  const first = {
    x: originX + state.firstX * scale,
    y: originY - state.firstY * scale,
  };
  const sum = {
    x: originX + state.sumX * scale,
    y: originY - state.sumY * scale,
  };
  const second = {
    x: originX + state.secondX * scale,
    y: originY - state.secondY * scale,
  };
  const tracks = [
    { value: state.firstX, label: "x₁", kind: "first", y: 92 },
    { value: state.secondX, label: "x₂", kind: "second", y: 162 },
    { value: state.sumX, label: "x₁ + x₂", kind: "sum", y: 232 },
  ];
  return svg`<svg class="motion-scene" viewBox="0 0 570 320" role="img" aria-label=${t.scene}>
    <text x=${originX} y="31" class="scene-title" text-anchor="middle">${t.plane}</text>
    <text x=${trackX} y="31" class="scene-title" text-anchor="middle">${t.tracks}</text>
    <line class="guide" x1="288" y1="48" x2="288" y2="275" />
    ${[4, 8].map((radius) => svg`<circle cx=${originX} cy=${originY} r=${radius * scale} class="guide grid-ring" />`)}
    <path class="axis" d="M 39 162 H 265 M 152 49 V 275" />
    <text x="257" y="152" class="svg-label">x</text>
    <text x="161" y="59" class="svg-label">y</text>
    <circle cx=${originX} cy=${originY} r="2.5" class="origin" />
    ${
      vectors
        ? svg`<g class="phasors">
      ${[first, second, sum].map((point) => svg`<line x1=${point.x} y1=${point.y} x2=${point.x} y2=${originY} class="projection" />`)}
      <line x1=${originX} y1=${originY} x2=${second.x} y2=${second.y} class="second ghost" />
      ${vector(origin, first, "first")}
      ${vector(first, sum, "second")}
      ${vector(origin, sum, "sum")}
      <circle cx=${sum.x} cy=${sum.y} r="3" class="sum point" />
    </g>`
        : svg``
    }
    ${tracks.map(({ value, label, kind, y }) => {
      const x = trackX + value * scale;
      return svg`<g class=${kind}>
        <text x="312" y=${y - 15} class="track-label">${label}</text>
        <line x1="321" y1=${y} x2="529" y2=${y} class="axis" />
        ${[-8, -4, 0, 4, 8].map((tick) => svg`<line x1=${trackX + tick * scale} y1=${y - 4} x2=${trackX + tick * scale} y2=${y + 4} class="axis" />`)}
        <line x1=${trackX} y1=${y} x2=${x} y2=${y} class="vector-line" />
        <circle data-track=${kind} data-value=${value} cx=${x} cy=${y} r=${kind === "sum" ? 6 : 5} class="point" />
      </g>`;
    })}
    ${[-8, -4, 0, 4, 8].map((tick) => svg`<text text-anchor="middle" x=${trackX + tick * scale} y="256" class="svg-label">${tick}</text>`)}
    <text x="549" y="256" class="svg-label" text-anchor="end">cm</text>
    <text x=${originX} y="296" class="svg-label" text-anchor="middle">x₁ + x₂ = x (cm)</text>
  </svg>`;
}
