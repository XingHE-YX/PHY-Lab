import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  limits,
  radians,
  type Parameters,
  type Sample,
} from "../model/physics";

const pivot = { x: 280, y: 158 };
const rulerRadius = 136;

function rodRadius(length: number) {
  const ratio =
    (length - limits.length.min) / (limits.length.max - limits.length.min);
  return 84 + Math.max(0, Math.min(1, ratio)) * 32;
}

function point(angle: number, distance: number) {
  return {
    x: pivot.x + distance * Math.sin(angle),
    y: pivot.y + distance * Math.cos(angle),
  };
}

function arc(angle: number, distance: number) {
  const start = point(-angle, distance);
  const end = point(angle, distance);
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${distance} ${distance} 0 ${angle > Math.PI / 2 ? 1 : 0} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

interface Drag {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

interface LayerOptions {
  comparison: boolean;
  velocity: boolean;
  acceleration: boolean;
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
  layers: LayerOptions,
  drag: Drag,
  t: Messages,
) {
  const radius = rodRadius(parameters.length);
  const solid = point(state.angle, radius);
  const ghost = point(state.angleLinear, radius);
  const radial = {
    x: Math.sin(state.angle),
    y: Math.cos(state.angle),
  };
  const tangentBase = {
    x: Math.cos(state.angle),
    y: -Math.sin(state.angle),
  };

  const maxSpeed = Math.max(0.5, Math.sqrt(2 * state.total));
  const velLength =
    layers.velocity && Math.abs(state.speed) > 1e-4
      ? (48 * Math.abs(state.speed)) / maxSpeed
      : 0;
  const accLength =
    layers.acceleration && Math.abs(state.tangentialAcceleration) > 1e-4
      ? (48 * Math.abs(state.tangentialAcceleration)) / limits.gravity.max
      : 0;
  const velDir = Math.sign(state.speed);
  const accDir = Math.sign(state.tangentialAcceleration);
  const overlap = velLength >= 2 && accLength >= 2 && velDir === accDir;

  const vectorCoords = (
    dir: number,
    length: number,
    radialOffset: number,
    labelSide: number,
  ) => {
    const start = {
      x: solid.x + radial.x * radialOffset + tangentBase.x * dir * 15,
      y: solid.y + radial.y * radialOffset + tangentBase.y * dir * 15,
    };
    const end = {
      x: start.x + tangentBase.x * dir * length,
      y: start.y + tangentBase.y * dir * length,
    };
    const label = {
      x: (start.x + end.x) / 2 + radial.x * labelSide,
      y: (start.y + end.y) / 2 + radial.y * labelSide + 3.5,
    };
    return { start, end, label };
  };

  const velVec = vectorCoords(velDir, velLength, overlap ? -4 : 0, -13);
  const accVec = vectorCoords(accDir, accLength, overlap ? 5 : 0, 14);

  const thetaArcR = Math.min(34, radius * 0.36);
  const showThetaArc = Math.abs(state.angle) > 0.14;
  const thetaArcStart = point(0, thetaArcR);
  const thetaArcEnd = point(state.angle, thetaArcR);
  const thetaLabel = point(state.angle / 2, thetaArcR + 12);

  return svg`<svg class="motion-scene" viewBox="0 0 560 326" role="group" aria-label=${t.scene}>
    <defs>
      <radialGradient id="bob-surface" cx="32%" cy="26%" r="74%">
        <stop offset="0" class="bob-highlight" />
        <stop offset="0.58" class="bob-color" />
        <stop offset="1" class="bob-shadow" />
      </radialGradient>
      <filter id="bob-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <marker id="velocity-tip" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3" viewBox="0 0 6 6">
        <path d="M0 0 L6 3 L0 6 Z" class="velocity-tip" />
      </marker>
      <marker id="acceleration-tip" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3" viewBox="0 0 6 6">
        <path d="M0 0 L6 3 L0 6 Z" class="acceleration-tip" />
      </marker>
    </defs>
    <path d=${arc(170 * radians, rulerRadius)} class="ruler" />
    <line x1=${pivot.x} y1=${pivot.y} x2=${pivot.x} y2=${pivot.y + rulerRadius - 1} class="vertical" />
    ${[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((angle) => {
      const inner = point(angle * radians, rulerRadius - 5);
      const outer = point(angle * radians, rulerRadius);
      const label = point(angle * radians, rulerRadius + 13);
      return svg`<line class="tick" x1=${inner.x} y1=${inner.y} x2=${outer.x} y2=${outer.y} />
        <text x=${label.x} y=${label.y} class="svg-label" dominant-baseline="middle" text-anchor="middle">${angle}°</text>`;
    })}
    ${parameters.angle !== 0 ? svg`<path d=${arc(Math.abs(parameters.angle) * radians, radius)} class="orbit" />` : svg``}
    ${
      showThetaArc
        ? svg`<g class="theta-arc-group">
            <path
              class="theta-arc"
              d=${`M ${thetaArcStart.x.toFixed(2)} ${thetaArcStart.y.toFixed(2)} A ${thetaArcR} ${thetaArcR} 0 0 ${state.angle > 0 ? 0 : 1} ${thetaArcEnd.x.toFixed(2)} ${thetaArcEnd.y.toFixed(2)}`}
            />
            <text x=${thetaLabel.x.toFixed(2)} y=${thetaLabel.y.toFixed(2)} text-anchor="middle" dominant-baseline="middle" class="theta-label">θ</text>
          </g>`
        : svg``
    }
    ${
      layers.comparison
        ? svg`<g class="linear-model" data-angle=${state.angleLinear}>
            <line x1=${pivot.x} y1=${pivot.y} x2=${ghost.x} y2=${ghost.y} />
            <circle cx=${ghost.x} cy=${ghost.y} r="12" />
          </g>`
        : svg``
    }
    <line class="rod" x1=${pivot.x} y1=${pivot.y} x2=${solid.x} y2=${solid.y} />
    <circle class="pivot-housing" cx=${pivot.x} cy=${pivot.y} r="9" />
    <circle class="pivot" cx=${pivot.x} cy=${pivot.y} r="5" />
    ${
      velLength >= 2
        ? svg`<g class="velocity-vector" aria-hidden="true">
            <line
              class="velocity"
              x1=${velVec.start.x}
              x2=${velVec.end.x}
              y1=${velVec.start.y}
              y2=${velVec.end.y}
              marker-end="url(#velocity-tip)"
            />
            ${velLength >= 10 ? svg`<text x=${velVec.label.x} y=${velVec.label.y} text-anchor="middle" class="vector-label velocity-label">v</text>` : svg``}
          </g>`
        : svg``
    }
    ${
      accLength >= 2
        ? svg`<g class="acceleration-vector" aria-hidden="true">
            <line
              class="acceleration"
              x1=${accVec.start.x}
              x2=${accVec.end.x}
              y1=${accVec.start.y}
              y2=${accVec.end.y}
              marker-end="url(#acceleration-tip)"
            />
            ${accLength >= 10 ? svg`<text x=${accVec.label.x} y=${accVec.label.y} text-anchor="middle" class="vector-label acceleration-label">aₜ</text>` : svg``}
          </g>`
        : svg``
    }
    <g
      class="bob-handle"
      role="slider"
      tabindex="0"
      aria-label=${t.bobControl}
      aria-description=${t.sceneKeyboard}
      aria-valuemin=${limits.angle.min}
      aria-valuemax=${limits.angle.max}
      aria-valuenow=${parameters.angle}
      aria-valuetext=${`${parameters.angle}°`}
      data-angle=${state.angle}
      @pointerdown=${drag.start}
      @pointermove=${drag.move}
      @pointerup=${drag.end}
      @pointercancel=${drag.end}
      @lostpointercapture=${drag.end}
      @keydown=${drag.key}
    >
      <circle class="bob-target" cx=${solid.x} cy=${solid.y} r="22" />
      <circle cx=${solid.x} cy=${solid.y} r="15" fill="#286eed" opacity="0.14" filter="url(#bob-glow)" />
      <circle class="bob" cx=${solid.x} cy=${solid.y} r="12" fill="url(#bob-surface)" />
    </g>
  </svg>`;
}
