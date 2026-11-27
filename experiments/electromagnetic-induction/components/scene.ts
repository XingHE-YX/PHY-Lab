import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  boundDistance,
  distances,
  limits,
  type Parameters,
  type Sample,
} from "../model/physics";

const coilX = 468;
const pixelsPerMeter = 1420;
const axisY = 142;
const magnetX = (distance: number) => coilX - distance * pixelsPerMeter;

interface Input {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

interface Layers {
  fields: boolean;
  coilView: boolean;
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

function coilOffsets(turns: number) {
  const ratio =
    (turns - limits.turns.min) / (limits.turns.max - limits.turns.min);
  const count = Math.round(4 + Math.max(0, Math.min(1, ratio)) * 6);
  const start = 448;
  const end = 506;
  return Array.from(
    { length: count },
    (_, i) => start + ((end - start) * i) / (count - 1),
  );
}

export function scene(
  parameters: Parameters,
  sample: Sample,
  layers: Layers,
  input: Input,
  t: Messages,
) {
  const center = magnetX(sample.distance);
  const northNear = parameters.polarity === 1;
  const distance = (sample.distance * 100).toFixed(1);
  const clockwise = sample.direction === "clockwise";
  const activeCurrent = sample.direction !== "noCurrent";
  const currentGlow = activeCurrent
    ? 0.08 + 0.28 * Math.min(1, Math.abs(sample.current) / 0.015)
    : 0;
  const leftInducedPole = clockwise ? "S" : "N";
  const turns = coilOffsets(parameters.turns);
  const rightPoleX = center + 50;
  const leftPoleX = center - 50;

  return svg`<svg class="apparatus" viewBox="0 0 600 318" role="group" aria-label=${t.bench}>
    <defs>
      <linearGradient id="north-shading" x2="0%" y2="100%">
        <stop offset="0%" class="north-highlight" />
        <stop offset="100%" class="north-shadow" />
      </linearGradient>
      <linearGradient id="south-shading" x2="0%" y2="100%">
        <stop offset="0%" class="south-highlight" />
        <stop offset="100%" class="south-shadow" />
      </linearGradient>
      <filter id="coil-glow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" />
      </filter>
      <marker id="external-tip" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3" viewBox="0 0 6 6">
        <path d="M 0 0 L 6 3 L 0 6 Z" class="external-tip" />
      </marker>
      <marker id="current-arrow" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3" viewBox="0 0 6 6">
        <path d="M 0 0 L 6 3 L 0 6 Z" class="current-tip" />
      </marker>
      <marker id="motion-tip" orient="auto" markerWidth="6" markerHeight="6" refX="5" refY="3" viewBox="0 0 6 6">
        <path d="M 0 0 L 6 3 L 0 6 Z" class="motion-tip" />
      </marker>
    </defs>
    <line x1="36" x2="556" y1=${axisY} y2=${axisY} class="axis-line" />
    <path d="M 52 180 H 414 M 52 188 H 414" class="rail" />
    ${[distances.max, 0.2, 0.15, 0.1, distances.min].map(
      (mark) => svg`
      <line x1=${magnetX(mark)} x2=${magnetX(mark)} y1="179" y2="189" class="rail-tick" />
      <text x=${magnetX(mark)} y="203" text-anchor="middle" class="svg-label">${Math.round(mark * 100)}</text>
    `,
    )}
    <text x="44" y="203" class="svg-label">cm</text>
    <line x1=${coilX} x2=${coilX} y1="80" y2="218" class="coil-plane" />
    <text x="478" y="64" text-anchor="middle" class="scene-title">${t.coil}</text>
    ${
      layers.fields
        ? svg`<g class="field-guides">
            <g class="dipole-lines">
              ${[
                { dy: 44, reach: 96, yOff: 12 },
                { dy: 82, reach: 176, yOff: 20 },
              ].map(
                ({ dy, reach, yOff }) => svg`
                  <path class="field-loop" d=${`M ${rightPoleX} ${axisY - yOff} C ${rightPoleX + reach} ${axisY - dy}, ${leftPoleX - reach} ${axisY - dy}, ${leftPoleX} ${axisY - yOff}`} />
                  <path class="field-loop" d=${`M ${rightPoleX} ${axisY + yOff} C ${rightPoleX + reach} ${axisY + dy}, ${leftPoleX - reach} ${axisY + dy}, ${leftPoleX} ${axisY + yOff}`} />
                `,
              )}
              <line
                x1=${northNear ? rightPoleX + 8 : Math.min(542, rightPoleX + 160)}
                x2=${northNear ? Math.min(542, rightPoleX + 160) : rightPoleX + 8}
                y1=${axisY}
                y2=${axisY}
                class="field-axis-ray"
                marker-end="url(#external-tip)"
              />
            </g>
            <text x="45" y="246" class="scene-title">${t.external}</text>
            <line x1=${northNear ? 46 : 122} x2=${northNear ? 122 : 46} y1="266" y2="266" class="external-arrow" marker-end="url(#external-tip)" />
            <text x="206" y="246" class="scene-title">${t.induced}</text>
            ${
              !activeCurrent
                ? svg`<text x="244" y="270" class="svg-label" text-anchor="middle">0</text>`
                : svg`<line x1=${clockwise ? 206 : 282} x2=${clockwise ? 282 : 206} y1="266" y2="266" class="induced-arrow" marker-end="url(#current-arrow)" />`
            }
          </g>`
        : svg``
    }
    ${
      activeCurrent
        ? svg`<ellipse cx="477" cy=${axisY} rx="40" ry="48" class="coil-glow-halo" opacity=${currentGlow.toFixed(3)} filter="url(#coil-glow)" />`
        : svg``
    }
    <path d="M 448 185 V 209 H 506 V 185" class="coil-wire" />
    <path d="M 466 209 H 488" class="coil-bridge" />
    ${turns.map(
      (offset) => svg`
      <ellipse cx=${offset.toFixed(1)} cy=${axisY} rx="18" ry="42" class="coil-turn" />
    `,
    )}
    ${
      activeCurrent
        ? svg`<g class="induced-pole-badge" transform="translate(428 112)">
            <rect x="-11" y="-11" width="22" height="22" rx="3" />
            <text x="0" y="4" text-anchor="middle">${leftInducedPole}</text>
          </g>`
        : svg``
    }
    ${
      sample.motion !== "stationary"
        ? svg`<line
            class="motion-arrow"
            x1=${sample.motion === "approaching" ? center - 16 : center + 16}
            x2=${sample.motion === "approaching" ? center + 20 : center - 20}
            y1="106"
            y2="106"
            marker-end="url(#motion-tip)"
          />`
        : svg``
    }
    <g
      class="magnet-handle"
      role="slider"
      tabindex="0"
      aria-label=${t.magnet}
      aria-description=${t.keyboard}
      aria-valuemin="7"
      aria-valuemax="26"
      aria-valuenow=${distance}
      aria-valuetext=${`${distance} cm`}
      data-position=${sample.distance}
      @pointerdown=${input.start}
      @pointermove=${input.move}
      @pointerup=${input.end}
      @pointercancel=${input.end}
      @lostpointercapture=${input.end}
      @keydown=${input.key}
    >
      <rect x=${center - 54} y="111" width="108" height="62" rx="5" class="magnet-focus" />
      <path d=${`M ${center - 48} 118 H ${center} V 166 H ${center - 48} Q ${center - 50} 166 ${center - 50} 164 V 120 Q ${center - 50} 118 ${center - 48} 118`}
        fill=${northNear ? "url(#south-shading)" : "url(#north-shading)"} />
      <path d=${`M ${center} 118 H ${center + 48} Q ${center + 50} 118 ${center + 50} 120 V 164 Q ${center + 50} 166 ${center + 48} 166 H ${center} Z`}
        fill=${northNear ? "url(#north-shading)" : "url(#south-shading)"} />
      <rect x=${center - 50} y="118" width="100" height="48" rx="2" class="magnet-edge" />
      <text x=${center - 25} y="147" class="pole" text-anchor="middle">${northNear ? "S" : "N"}</text>
      <text x=${center + 25} y="147" class="pole" text-anchor="middle">${northNear ? "N" : "S"}</text>
    </g>
    <path d=${`M ${center} 102 V 82 H ${coilX} V 102`} class="measure" />
    <text x=${(center + coilX) / 2} y="75" class="svg-label" text-anchor="middle">d = ${distance} cm</text>
    ${
      layers.coilView
        ? svg`<g transform="translate(476 262)" class="current-inset" data-direction=${sample.direction}>
            <circle r="23" class="face-ring" />
            ${
              !activeCurrent
                ? svg`<text x="0" y="4" class="svg-label" text-anchor="middle">I = 0</text>`
                : svg`<path d=${`M 23 0 A 23 23 0 1 ${clockwise ? 1 : 0} -11.5 ${clockwise ? -19.919 : 19.919}`} class="current-arrow" marker-end="url(#current-arrow)" />`
            }
            <text x="0" y="42" text-anchor="middle" class="scene-note">${t.coilView}</text>
          </g>`
        : svg``
    }
  </svg>`;
}
