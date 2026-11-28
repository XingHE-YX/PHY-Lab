import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  aperture,
  limits,
  objectHeight,
  type Optics,
  type Parameters,
} from "../model/optics";
import {
  extension,
  frame,
  imageInView,
  outgoing,
  type Point,
} from "../model/ray-geometry";

const scaleX = 3.42;
const scaleY = 9.35;
const origin = { x: 300, y: 154 };
const viewX = (x: number) => origin.x + x * scaleX;
const viewY = (y: number) => origin.y - y * scaleY;
const ticks = [-80, -60, -40, -20, 0, 20, 40, 60, 80];

interface Drag {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

export function coordinate(event: PointerEvent) {
  const matrix = (
    event.currentTarget as SVGGraphicsElement
  ).ownerSVGElement?.getScreenCTM();
  return matrix
    ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      ).x / scaleX
    : null;
}

function segment(from: Point, to: Point) {
  return `M ${viewX(from.x)} ${viewY(from.y)} L ${viewX(to.x)} ${viewY(to.y)}`;
}

function directionMark(from: Point, to: Point) {
  const deltaX = viewX(to.x) - viewX(from.x);
  const deltaY = viewY(to.y) - viewY(from.y);
  const length = Math.hypot(deltaX, deltaY);
  if (length < 22) return "";
  const tip = {
    x: viewX(from.x) + 0.7 * deltaX,
    y: viewY(from.y) + 0.7 * deltaY,
  };
  const along = { x: deltaX / length, y: deltaY / length };
  const base = { x: tip.x - 5 * along.x, y: tip.y - 5 * along.y };
  return `M ${base.x - 3 * along.y} ${base.y + 3 * along.x} L ${tip.x} ${tip.y} L ${base.x + 3 * along.y} ${base.y - 3 * along.x}`;
}

function arrow(x: number, height: number) {
  const screenX = viewX(x);
  const tip = viewY(height);
  const displacement = origin.y - tip;
  const head =
    Math.sign(displacement) * Math.min(7, Math.abs(displacement) * 0.53);
  return `M ${screenX} ${origin.y} V ${tip} M ${screenX - Math.abs(head) * 0.8} ${tip + head} L ${screenX} ${tip} L ${screenX + Math.abs(head) * 0.8} ${tip + head}`;
}

function ruler(x1: number, x2: number, y: number, label: string, cls: string) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  if (right - left < 10) return svg``;
  const mid = (left + right) / 2;
  return svg`<g class=${`ruler ${cls}`} aria-hidden="true">
    <line x1=${left} x2=${left} y1=${y - 4} y2=${y + 4} class="ruler-tick" />
    <line x1=${right} x2=${right} y1=${y - 4} y2=${y + 4} class="ruler-tick" />
    <line x1=${left} x2=${right} y1=${y} y2=${y} class="ruler-line" />
    <text x=${mid} y=${y + 13} text-anchor="middle" class="ruler-label">${label}</text>
  </g>`;
}

export function scene(
  parameters: Parameters,
  optics: Optics,
  extensions: boolean,
  guides: boolean,
  drag: Drag,
  t: Messages,
) {
  const { focal, object } = parameters;
  const { rays, image } = optics;
  const board = {
    left: viewX(-frame.x),
    right: viewX(frame.x),
    top: viewY(frame.y),
    bottom: viewY(-frame.y),
  };
  const shapeTop = viewY(aperture);
  const shapeBottom = viewY(-aperture);
  const objectX = viewX(-object);
  const objectTip = viewY(objectHeight);
  const show2F = guides && 2 * focal <= frame.x;

  return svg`<svg class="ray-scene" viewBox="0 0 600 314" aria-label=${t.scene}>
    <rect class="optical-board" x=${board.left} y=${board.top} width=${board.right - board.left} height=${board.bottom - board.top} rx="3" />
    <text x="28" y="25" class="scene-note">${t.scaleNote}</text>
    <defs>
      <linearGradient id="lens-glass"><stop class="glass-edge" /><stop offset="52%" class="glass-light" /><stop offset="100%" class="glass-edge" /></linearGradient>
    </defs>
    ${ticks.map(
      (
        tick,
      ) => svg`<line x1=${viewX(tick)} x2=${viewX(tick)} y1=${board.top} y2=${board.bottom} class="grid-line" />
      <text x=${viewX(tick)} y="284" class="axis-label" text-anchor="middle">${tick}</text>`,
    )}
    ${[-8, -4, 4, 8].map((tick) => svg`<line x1=${board.left} x2=${board.right} y1=${viewY(tick)} y2=${viewY(tick)} class="grid-line" />`)}
    <line x1=${board.left} x2=${board.right} y1=${origin.y} y2=${origin.y} class="optical-axis" />
    <text x=${viewX(frame.x)} y="302" text-anchor="end" class="axis-label">x (cm)</text>
    <path d=${`M 300 ${shapeTop} Q 320 ${origin.y} 300 ${shapeBottom} Q 280 ${origin.y} 300 ${shapeTop} Z`} class="lens-glass" />
    <line x1="300" x2="300" y1=${shapeTop} y2=${shapeBottom} class="lens-plane" />
    ${(
      [
        [-focal, "F₁"],
        [focal, "F₂"],
      ] as const
    ).map(
      ([position, title]) => svg`
      <circle cx=${viewX(position)} cy=${origin.y} r="3.2" class="focus-dot" />
      <text x=${viewX(position)} y=${origin.y + 18} class="focus-label" text-anchor="middle">${title}</text>`,
    )}
    ${
      show2F
        ? (
            [
              [-2 * focal, "2F₁"],
              [2 * focal, "2F₂"],
            ] as const
          ).map(
            ([position, title]) => svg`<g class="marker-2f">
              <circle cx=${viewX(position)} cy=${origin.y} r="3.2" class="double-focus-dot" />
              <text x=${viewX(position)} y=${origin.y + 18} class="focus-label secondary" text-anchor="middle">${title}</text>
            </g>`,
          )
        : svg``
    }
    ${
      guides
        ? svg`<g class="distance-rulers">
            ${ruler(objectX, origin.x, origin.y + 62, `u = ${object.toFixed(1)} cm`, "object-ruler")}
            ${
              imageInView(image) && image.distance !== null
                ? ruler(
                    origin.x,
                    viewX(image.distance),
                    image.distance < 0 ? origin.y + 84 : origin.y + 62,
                    `v = ${image.distance > 0 ? "+" : ""}${image.distance.toFixed(1)} cm`,
                    "image-ruler",
                  )
                : svg``
            }
          </g>`
        : svg``
    }
    ${
      extensions
        ? rays.map((ray) => {
            const guide = extension(ray, image);
            return guide
              ? svg`<path class=${`backward ${ray.kind}`} data-ray=${ray.kind} d=${segment(guide.from, guide.to)} />`
              : svg``;
          })
        : svg``
    }
    ${rays.map((ray) => {
      const result = outgoing(ray);
      const mark = directionMark(result.from, result.to);
      return svg`<g class=${ray.kind}>
        <path class="incident" d=${segment({ x: -object, y: objectHeight }, result.from)} />
        <path class="outgoing" data-ray=${ray.kind} data-slope=${ray.slope} d=${segment(result.from, result.to)} />
        ${mark ? svg`<path class="direction" d=${mark} />` : svg``}
      </g>`;
    })}
    ${
      imageInView(image) && image.distance !== null
        ? svg`
      <g class=${`image ${image.kind}`} data-image=${image.kind} data-distance=${image.distance} data-height=${image.height}>
        <path d=${arrow(image.distance, image.height)} class="image-arrow" />
        <text x=${viewX(image.distance)} y=${viewY(image.height) + (image.height > 0 ? -9 : 16)}
          class="object-label" text-anchor="middle">${t.imageTag}</text>
      </g>`
        : svg``
    }
    <g class="object" role="slider" tabindex="0" aria-label=${t.objectHandle} aria-description=${t.objectKeys}
      aria-valuemin=${limits.object.min} aria-valuemax=${limits.object.max}
      aria-valuenow=${object} aria-valuetext=${`${object.toFixed(1)} cm`}
      @pointerdown=${drag.start} @pointermove=${drag.move} @pointerup=${drag.end}
      @pointercancel=${drag.end} @lostpointercapture=${drag.end} @keydown=${drag.key}>
      <rect x=${objectX - 12} y=${objectTip - 9} width="24" height=${origin.y - objectTip + 16} rx="3" class="object-hit" />
      <path d=${arrow(-object, objectHeight)} class="object-arrow" />
      <circle cx=${objectX} cy=${origin.y} r="3.4" class="object-grip" />
      <text x=${objectX} y=${objectTip - 12} class="object-label" text-anchor="middle">${t.objectTag}</text>
    </g>
  </svg>`;
}
