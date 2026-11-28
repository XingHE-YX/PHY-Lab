import { nothing, svg } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import type { Messages } from "../locales/messages";
import {
  clamp,
  limits,
  width,
  type Cart,
  type Sample,
  type Trial,
} from "../model/physics";
import { number } from "./quantities";

const centerX = 300;
const arrowScale = 11;
const carts: Cart[] = ["left", "right"];

interface Adjust {
  start(cart: Cart, event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(cart: Cart, event: KeyboardEvent): void;
}

export interface SceneLayers {
  vectors: boolean;
  centerOfMass: boolean;
}

export function velocityCoordinate(event: PointerEvent) {
  const matrix = (
    event.currentTarget as SVGGraphicsElement
  ).ownerSVGElement?.getScreenCTM();
  return matrix
    ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      ).x / arrowScale
    : null;
}

function arrow(
  cart: Cart,
  center: number,
  velocity: number,
  editable: boolean,
  adjust: Adjust,
  t: Messages,
) {
  const level = cart === "left" ? 86 : 124;
  const tip = center + arrowScale * velocity;
  const sign = Math.sign(velocity);
  const head = Math.min(Math.abs(tip - center), 6) * sign;
  const range = limits.leftVelocity;
  const label = cart === "left" ? t.dragLeft : t.dragRight;
  const labelX = clamp((center + tip) / 2, 64, 536);
  const text = `${cart === "left" ? "vₐ" : "vᵦ"} = ${velocity > 0 ? "+" : ""}${number(velocity)} m/s`;
  return svg`<g class=${`vector ${cart}${editable ? " editable" : ""}`}
    data-vector=${cart} data-velocity=${velocity}
    role=${ifDefined(editable ? "slider" : undefined)} tabindex=${ifDefined(editable ? 0 : undefined)}
    aria-label=${ifDefined(editable ? label : undefined)} aria-description=${ifDefined(editable ? t.dragKeys : undefined)}
    aria-valuemin=${ifDefined(editable ? range.min : undefined)} aria-valuemax=${ifDefined(editable ? range.max : undefined)}
    aria-valuenow=${ifDefined(editable ? velocity : undefined)}
    @pointerdown=${editable ? (event: PointerEvent) => adjust.start(cart, event) : nothing}
    @pointermove=${editable ? adjust.move : nothing} @pointerup=${editable ? adjust.end : nothing}
    @pointercancel=${editable ? adjust.end : nothing} @lostpointercapture=${editable ? adjust.end : nothing}
    @keydown=${editable ? (event: KeyboardEvent) => adjust.key(cart, event) : nothing}>
    <line x1=${center} x2=${center} y1=${level + 6} y2="155" class="vector-guide" />
    ${velocity !== 0 ? svg`<path class="arrow" d=${`M ${center} ${level} H ${tip} l ${-head} -4.5 M ${tip} ${level} l ${-head} 4.5`} />` : svg``}
    <text x=${labelX} y=${level - 9} text-anchor="middle" class="vector-label">${text}</text>
    <circle class="arrow-hit" cx=${tip} cy=${level} r="13" />
    ${editable || velocity === 0 ? svg`<circle class="arrow-grip" cx=${tip} cy=${level} r="4.2" />` : svg``}
  </g>`;
}

export function scene(
  trial: Trial,
  sample: Sample,
  time: number,
  layers: SceneLayers,
  editable: boolean,
  adjust: Adjust,
  t: Messages,
) {
  const midpoint = (sample.position.left + sample.position.right) / 2;
  const scale = 420 / Math.max(6, trial.maximumGap + width);
  const toScreen = (position: number) =>
    centerX + (position - midpoint) * scale;
  const halfSpan = 258 / scale;
  const tickSize =
    [1, 2, 5, 10].find((step) => (2 * halfSpan) / step <= 11) ?? 10;
  const firstTick = Math.ceil((midpoint - halfSpan) / tickSize);
  const lastTick = Math.floor((midpoint + halfSpan) / tickSize);
  const cartWidth = scale * width;
  const cmX = toScreen(sample.centerOfMass.position);
  const impactFlash =
    trial.contact !== null && Math.abs(time - trial.contact) < 0.045;
  const contactX = toScreen(sample.position.left + width / 2);

  return svg`<svg class="cart-scene" viewBox="0 0 600 282" aria-label=${t.scene}>
    <defs>
      <linearGradient id="cart-a" x2="0%" y2="100%"><stop class="left-top" /><stop offset="100%" class="left-bottom" /></linearGradient>
      <linearGradient id="cart-b" x2="0%" y2="100%"><stop class="right-top" /><stop offset="100%" class="right-bottom" /></linearGradient>
    </defs>
    <text x="24" y="23" class="scene-note">${t.groundFrame}</text>
    <path d="M 34 206 H 566 V 217 H 34 Z" class="track-fill" />
    <line x1="34" x2="566" y1="206" y2="206" class="track-edge" />
    ${Array.from({ length: lastTick - firstTick + 1 }, (_, index) => {
      const position = (firstTick + index) * tickSize;
      const x = toScreen(position);
      return svg`<line x1=${x} x2=${x} y1="54" y2="206" class="grid-guide" />
        <line x1=${x} x2=${x} y1="216" y2="223" class="track-tick" />
        <text x=${x} y="238" class="scale-label" text-anchor="middle">${position}</text>`;
    })}
    <text x="570" y="256" text-anchor="end" class="scale-label">x (m) →</text>
    ${
      layers.centerOfMass
        ? svg`<g class="cm-layer" aria-hidden="true">
            <line x1=${cmX} x2=${cmX} y1="56" y2="206" class="cm-guide" />
            <polygon points=${`${cmX},200 ${cmX + 5.5},206 ${cmX},212 ${cmX - 5.5},206`} class="cm-marker" />
            <text x=${clamp(cmX, 82, 518)} y="49" text-anchor="middle" class="cm-label">CM · v = ${trial.centerVelocity > 0 ? "+" : ""}${number(trial.centerVelocity)} m/s</text>
          </g>`
        : svg``
    }
    ${layers.vectors ? carts.map((cart) => arrow(cart, toScreen(sample.position[cart]), sample.velocity[cart], editable, adjust, t)) : svg``}
    ${carts.map((cart) => {
      const center = toScreen(sample.position[cart]);
      const mass = trial.mass[cart];
      return svg`<g class=${`cart ${cart}`} data-cart=${cart} data-position=${sample.position[cart]} data-velocity=${sample.velocity[cart]} transform=${`translate(${center} 0)`}>
        <rect x=${-cartWidth / 2} y="156" width=${cartWidth} height="40" rx="3.5" class="chassis"
          fill=${cart === "left" ? "url(#cart-a)" : "url(#cart-b)"} />
        <circle cx=${-cartWidth * 0.27} cy="199" r="6" class="wheel" />
        <circle cx=${cartWidth * 0.27} cy="199" r="6" class="wheel" />
        <text x="0" y="175" text-anchor="middle" class="cart-letter">${cart === "left" ? "A" : "B"}</text>
        <text x="0" y="189" text-anchor="middle" class="cart-mass">${number(mass, 1)} kg</text>
      </g>`;
    })}
    ${
      impactFlash
        ? svg`<line x1=${contactX} x2=${contactX} y1="146" y2="202" class="impact-flash" />`
        : svg``
    }
    ${
      sample.coupled
        ? svg`<g class="coupling">
      <path d="M 290 148 H 310 M 294 144 V 152 M 306 144 V 152" class="coupler" />
      <text x="300" y="268" text-anchor="middle" class="coupled-note">${t.coupled}</text>
    </g>`
        : svg``
    }
  </svg>`;
}
