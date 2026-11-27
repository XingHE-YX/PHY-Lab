import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  boundDistance,
  distances,
  type Parameters,
  type Sample,
} from "../model/physics";

const coilX = 467;
const pixelsPerMeter = 1420;
const axisY = 148;
const magnetX = (distance: number) => coilX - distance * pixelsPerMeter;

interface Input {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

export function pointerPosition(event: PointerEvent) {
  const matrix = (
    event.currentTarget as SVGGraphicsElement
  ).ownerSVGElement?.getScreenCTM();
  if (!matrix) return null;
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  ).x;
}

export function dragTarget(distance: number, delta: number) {
  return boundDistance(distance - delta / pixelsPerMeter);
}

export function scene(
  parameters: Parameters,
  sample: Sample,
  fields: boolean,
  input: Input,
  t: Messages,
) {
  const center = magnetX(sample.distance);
  const northNear = parameters.polarity === 1;
  const distance = (sample.distance * 100).toFixed(1);
  const clockwise = sample.direction === "clockwise";
  return svg`<svg class="apparatus" viewBox="0 0 600 326" aria-label=${t.bench}>
    <defs>
      <linearGradient id="north-shading" x2="0%" y2="100%">
        <stop offset="0%" class="north-highlight" />
        <stop offset="100%" class="north-shadow" />
      </linearGradient>
      <linearGradient id="south-shading" x2="0%" y2="100%">
        <stop offset="0%" class="south-highlight" />
        <stop offset="100%" class="south-shadow" />
      </linearGradient>
      <marker id="external-tip" orient="auto" markerWidth="7" markerHeight="7" refX="6" refY="3.5" viewBox="0 0 7 7">
        <path d="M 0 0 L 7 3.5 L 0 7 Z" class="external-tip" />
      </marker>
      <marker id="current-arrow" orient="auto" markerWidth="6" markerHeight="6" refX="5.5" refY="3" viewBox="0 0 6 6">
        <path d="M 0 0 L 6 3 L 0 6 Z" class="current-tip" />
      </marker>
    </defs>
    <text x="24" y="33" class="scene-note">${t.drag}</text>
    <line x1="36" x2="555" y1=${axisY} y2=${axisY} class="axis-line" />
    <path d="M 52 186 H 414 M 52 194 H 414" class="rail" />
    ${[distances.max, 0.2, 0.15, 0.1, distances.min].map(
      (mark) => svg`
      <line x1=${magnetX(mark)} x2=${magnetX(mark)} y1="185" y2="195" class="rail-tick" />
      <text x=${magnetX(mark)} y="209" text-anchor="middle" class="svg-label">${Math.round(mark * 100)}</text>
    `,
    )}
    <text x="46" y="209" class="svg-label">cm</text>
    <line x1=${coilX} x2=${coilX} y1="87" y2="224" class="coil-plane" />
    <text x="482" y="66" text-anchor="middle" class="scene-title">${t.coil}</text>
    <path d="M 451 192 V 216 H 513 V 192" class="coil-wire" />
    <path d="M 471 216 H 493" class="coil-bridge" />
    ${[449, 457, 465, 473, 481, 489, 497, 505].map(
      (offset) => svg`
      <ellipse cx=${offset} cy=${axisY} rx="19" ry="43" class="coil-turn" />
    `,
    )}
    <g class="magnet-handle" role="slider" tabindex="0" aria-label=${t.magnet}
      aria-description=${t.keyboard} aria-valuemin="7" aria-valuemax="26"
      aria-valuenow=${distance} aria-valuetext=${`${distance} cm`}
      data-position=${sample.distance}
      @pointerdown=${input.start} @pointermove=${input.move}
      @pointerup=${input.end} @pointercancel=${input.end}
      @lostpointercapture=${input.end} @keydown=${input.key}>
      <rect x=${center - 54} y="117" width="108" height="62" rx="5" class="magnet-focus" />
      <path d=${`M ${center - 48} 124 H ${center} V 172 H ${center - 48} Q ${center - 50} 172 ${center - 50} 170 V 126 Q ${center - 50} 124 ${center - 48} 124`}
        fill=${northNear ? "url(#south-shading)" : "url(#north-shading)"} />
      <path d=${`M ${center} 124 H ${center + 48} Q ${center + 50} 124 ${center + 50} 126 V 170 Q ${center + 50} 172 ${center + 48} 172 H ${center} Z`}
        fill=${northNear ? "url(#north-shading)" : "url(#south-shading)"} />
      <rect x=${center - 50} y="124" width="100" height="48" rx="2" class="magnet-edge" />
      <text x=${center - 25} y="153" class="pole" text-anchor="middle">${northNear ? "S" : "N"}</text>
      <text x=${center + 25} y="153" class="pole" text-anchor="middle">${northNear ? "N" : "S"}</text>
    </g>
    <path d=${`M ${center} 115 V 89 H ${coilX} V 111`} class="measure" />
    <text x=${(center + coilX) / 2} y="82" class="svg-label" text-anchor="middle">d = ${distance} cm</text>
    ${
      fields
        ? svg`<g class="field-guides">
      <text x="45" y="252" class="scene-title">${t.external}</text>
      <line x1=${northNear ? 46 : 122} x2=${northNear ? 122 : 46} y1="272" y2="272" class="external-arrow" marker-end="url(#external-tip)" />
      <text x="216" y="252" class="scene-title">${t.induced}</text>
      ${
        sample.direction === "noCurrent"
          ? svg`<text x="254" y="276" class="svg-label" text-anchor="middle">0</text>`
          : svg`<line x1=${clockwise ? 216 : 292} x2=${clockwise ? 292 : 216} y1="272" y2="272" class="induced-arrow" marker-end="url(#current-arrow)" />`
      }
    </g>`
        : svg``
    }
    <g transform="translate(468 269)" class="current-inset" data-direction=${sample.direction}>
      <circle r="24" class="face-ring" />
      ${
        sample.direction === "noCurrent"
          ? svg`<text x="0" y="4" class="svg-label" text-anchor="middle">I = 0</text>`
          : svg`<path d=${`M 24 0 A 24 24 0 1 ${clockwise ? 1 : 0} -12 ${clockwise ? -20.785 : 20.785}`} class="current-arrow" marker-end="url(#current-arrow)" />`
      }
      <text x="0" y="45" text-anchor="middle" class="scene-note">${t.coilView}</text>
    </g>
  </svg>`;
}
