import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  limits,
  radians,
  type Parameters,
  type Sample,
} from "../model/physics";

const pivot = { x: 280, y: 160 };
const radius = 126;

function point(angle: number, distance = radius) {
  return {
    x: pivot.x + distance * Math.sin(angle),
    y: pivot.y + distance * Math.cos(angle),
  };
}

function arc(angle: number, distance = radius) {
  const start = point(-angle, distance);
  const end = point(angle, distance);
  return `M ${start.x} ${start.y} A ${distance} ${distance} 0 ${angle > Math.PI / 2 ? 1 : 0} 0 ${end.x} ${end.y}`;
}

interface Drag {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

export function dragAngle(event: PointerEvent) {
  const scene = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;
  const matrix = scene?.getScreenCTM();
  if (!matrix) return null;
  const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return Math.hypot(cursor.x - pivot.x, cursor.y - pivot.y) < 10
    ? null
    : Math.atan2(cursor.x - pivot.x, cursor.y - pivot.y) / radians;
}

export function scene(
  parameters: Parameters,
  state: Sample,
  comparison: boolean,
  drag: Drag,
  t: Messages,
) {
  const solid = point(state.angle);
  const ghost = point(state.angleLinear);
  const acceleration = state.tangentialAcceleration;
  const tangent = {
    x: Math.cos(state.angle) * Math.sign(acceleration),
    y: -Math.sin(state.angle) * Math.sign(acceleration),
  };
  const arrow = (50 * Math.abs(acceleration)) / limits.gravity.max;
  const arrowStart = {
    x: solid.x + tangent.x * 14,
    y: solid.y + tangent.y * 14,
  };
  const arrowEnd = {
    x: arrowStart.x + tangent.x * arrow,
    y: arrowStart.y + tangent.y * arrow,
  };
  return svg`<svg class="motion-scene" viewBox="0 0 560 340" aria-label=${t.scene}>
    <defs>
      <radialGradient id="bob-surface" cx="34%" cy="28%" r="72%">
        <stop offset="0" class="bob-highlight" />
        <stop offset="0.62" class="bob-color" />
        <stop offset="1" class="bob-shadow" />
      </radialGradient>
      <marker id="acceleration-tip" orient="auto" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" viewBox="0 0 5 5">
        <path d="M0 0 L5 2.5 L0 5 Z" class="acceleration-tip" />
      </marker>
    </defs>
    <text x="18" y="24" class="scene-note">${t.sceneHint}</text>
    <path d=${arc(170 * radians, radius + 22)} class="ruler" />
    <line x1=${pivot.x} y1=${pivot.y} x2=${pivot.x} y2=${pivot.y + radius + 21} class="vertical" />
    ${[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((angle) => {
      const inner = point(angle * radians, radius + 17);
      const outer = point(angle * radians, radius + 22);
      const label = point(angle * radians, radius + 35);
      return svg`<line class="tick" x1=${inner.x} y1=${inner.y} x2=${outer.x} y2=${outer.y} />
        <text x=${label.x} y=${label.y} class="svg-label" dominant-baseline="middle" text-anchor="middle">${angle}°</text>`;
    })}
    ${parameters.angle !== 0 ? svg`<path d=${arc(Math.abs(parameters.angle) * radians)} class="orbit" />` : svg``}
    ${
      comparison
        ? svg`<g class="linear-model" data-angle=${state.angleLinear}>
      <line x1=${pivot.x} y1=${pivot.y} x2=${ghost.x} y2=${ghost.y} />
      <circle cx=${ghost.x} cy=${ghost.y} r="16" />
    </g>`
        : svg``
    }
    <line class="rod" x1=${pivot.x} y1=${pivot.y} x2=${solid.x} y2=${solid.y} />
    <circle class="pivot" cx=${pivot.x} cy=${pivot.y} r="6" />
    ${
      arrow >= 1.5
        ? svg`<line class="acceleration" aria-hidden="true"
      x1=${arrowStart.x} x2=${arrowEnd.x} y1=${arrowStart.y} y2=${arrowEnd.y}
      marker-end="url(#acceleration-tip)" />`
        : svg``
    }
    <g class="bob-handle" role="slider" tabindex="0" aria-label=${t.bobControl}
      aria-description=${t.sceneKeyboard}
      aria-valuemin=${limits.angle.min} aria-valuemax=${limits.angle.max}
      aria-valuenow=${parameters.angle} aria-valuetext=${`${parameters.angle}°`}
      data-angle=${state.angle}
      @pointerdown=${drag.start} @pointermove=${drag.move} @pointerup=${drag.end}
      @pointercancel=${drag.end} @lostpointercapture=${drag.end} @keydown=${drag.key}>
      <circle class="bob-target" cx=${solid.x} cy=${solid.y} r="22" />
      <circle class="bob" cx=${solid.x} cy=${solid.y} r="12" fill="url(#bob-surface)" />
    </g>
    <text x="18" y="326" class="scene-note">${t.ruler}</text>
    <text x="542" y="326" text-anchor="end" class="svg-label">L = ${parameters.length.toFixed(2)} m</text>
  </svg>`;
}
