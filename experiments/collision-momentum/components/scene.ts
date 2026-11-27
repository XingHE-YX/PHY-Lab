import { nothing, svg } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import type { Messages } from "../locales/messages";
import {
  limits,
  width,
  type Cart,
  type Sample,
  type Trial,
} from "../model/physics";

const centerX = 300;
const arrowScale = 11;
const carts: Cart[] = ["left", "right"];

interface Adjust {
  start(cart: Cart, event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(cart: Cart, event: KeyboardEvent): void;
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
  const level = cart === "left" ? 89 : 128;
  const tip = center + arrowScale * velocity;
  const sign = Math.sign(velocity);
  const head = Math.min(Math.abs(tip - center), 6) * sign;
  const range = limits.leftVelocity;
  const label = cart === "left" ? t.dragLeft : t.dragRight;
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
    <line x1=${center} x2=${center} y1=${level + 8} y2="157" class="vector-guide" />
    ${velocity !== 0 ? svg`<path class="arrow" d=${`M ${center} ${level} H ${tip} l ${-head} -4 M ${tip} ${level} l ${-head} 4`} />` : svg``}
    <circle class="arrow-hit" cx=${tip} cy=${level} r="12" />
    ${editable || velocity === 0 ? svg`<circle class="arrow-grip" cx=${tip} cy=${level} r="4" />` : svg``}
  </g>`;
}

export function scene(
  trial: Trial,
  sample: Sample,
  vectors: boolean,
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
  return svg`<svg class="cart-scene" viewBox="0 0 600 315" aria-label=${t.scene}>
    <defs>
      <linearGradient id="cart-a" x2="0%" y2="100%"><stop class="left-top" /><stop offset="100%" class="left-bottom" /></linearGradient>
      <linearGradient id="cart-b" x2="0%" y2="100%"><stop class="right-top" /><stop offset="100%" class="right-bottom" /></linearGradient>
    </defs>
    <text x="24" y="27" class="scene-note">${t.groundFrame}</text>
    <path d="M 34 208 H 566 V 219 H 34 Z" class="track-fill" />
    <line x1="34" x2="566" y1="208" y2="208" class="track-edge" />
    ${Array.from({ length: lastTick - firstTick + 1 }, (_, index) => {
      const position = (firstTick + index) * tickSize;
      const x = toScreen(position);
      return svg`<line x1=${x} x2=${x} y1="58" y2="208" class="grid-guide" />
        <line x1=${x} x2=${x} y1="218" y2="226" class="track-tick" />
        <text x=${x} y="243" class="scale-label" text-anchor="middle">${position}</text>`;
    })}
    <text x="570" y="262" text-anchor="end" class="scale-label">x (m) →</text>
    ${vectors ? carts.map((cart) => arrow(cart, toScreen(sample.position[cart]), sample.velocity[cart], editable, adjust, t)) : svg``}
    ${carts.map((cart) => {
      const center = toScreen(sample.position[cart]);
      return svg`<g class=${`cart ${cart}`} data-cart=${cart} data-position=${sample.position[cart]} data-velocity=${sample.velocity[cart]} transform=${`translate(${center} 0)`}>
        <rect x=${-cartWidth / 2} y="161" width=${cartWidth} height="37" rx="3" class="chassis"
          fill=${cart === "left" ? "url(#cart-a)" : "url(#cart-b)"} />
        <circle cx=${-cartWidth * 0.27} cy="201" r="6.5" class="wheel" />
        <circle cx=${cartWidth * 0.27} cy="201" r="6.5" class="wheel" />
        <text x="0" y="185" text-anchor="middle" class="cart-letter">${cart === "left" ? "A" : "B"}</text>
      </g>`;
    })}
    ${
      sample.coupled
        ? svg`<g class="coupling">
      <path d="M 290 152 H 310 M 294 148 V 156 M 306 148 V 156" class="coupler" />
      <text x="300" y="281" text-anchor="middle" class="scene-note">${t.coupled}</text>
    </g>`
        : svg``
    }
    ${vectors && editable ? svg`<text x="24" y="301" class="scene-note">${t.dragHint}</text>` : svg``}
  </svg>`;
}
