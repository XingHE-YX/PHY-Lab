import { nothing, svg } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import type { Messages } from "../locales/messages";
import {
  duration,
  field,
  type Mover,
  type Sample,
  type Trial,
} from "../model/physics";

const startX = 28;
const scale = 16;
const trackY = 150;
const position = (value: number) => startX + scale * value;

interface Scrub {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

export function trackCoordinate(event: PointerEvent) {
  const matrix = (
    event.currentTarget as SVGGraphicsElement
  ).ownerSVGElement?.getScreenCTM();
  return matrix
    ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
        matrix.inverse(),
      ).x / scale
    : null;
}

function object(
  kind: Mover,
  options: {
    x: number;
    velocity: number;
    time: number;
    phase: number;
    index: number;
  },
  scrub: Scrub,
  t: Messages,
) {
  const { x, velocity, time, phase, index } = options;
  const active = velocity !== 0;
  const pulse = kind === "observer" && phase < 0.22;
  const plus = Math.sign(velocity);
  return svg`
    <g class=${`object ${kind}${active ? " scrubbable" : ""}`} data-object=${kind} data-position=${x}
      data-last-arrival=${kind === "observer" ? index : nothing}
      transform=${`translate(${position(x)} ${trackY})`}
      tabindex=${ifDefined(active ? "0" : undefined)} role=${ifDefined(active ? "slider" : undefined)}
      aria-label=${ifDefined(active ? t.moverControl : undefined)}
      aria-description=${ifDefined(active ? t.moverKeys : undefined)}
      aria-valuemin=${ifDefined(active ? 0 : undefined)}
      aria-valuemax=${ifDefined(active ? duration * 1000 : undefined)}
      aria-valuenow=${ifDefined(active ? Math.round(time * 1e5) / 100 : undefined)}
      aria-valuetext=${ifDefined(active ? `${(time * 1000).toFixed(2)} ms` : undefined)}
      @pointerdown=${active ? scrub.start : nothing} @pointermove=${active ? scrub.move : nothing}
      @pointerup=${active ? scrub.end : nothing} @pointercancel=${active ? scrub.end : nothing}
      @lostpointercapture=${active ? scrub.end : nothing} @keydown=${active ? scrub.key : nothing}>
      ${pulse ? svg`<circle class="receive-pulse" r=${24 + 28 * phase} opacity=${0.8 * (1 - phase / 0.22)} />` : svg``}
      <circle r="22" class="object-hit" />
      <circle r="15" class="object-body" />
      ${
        kind === "source"
          ? svg`<path d="M-7 -4 H-3 L3 -8 V8 L-3 4 H-7 Z M6 -5 Q11 0 6 5" class="glyph" />`
          : svg`<circle r="6" class="glyph" /><path d="M-9 0 H9 M0 -9 V9" class="glyph" />`
      }
    </g>
    <text x=${position(x)} y="215" class=${`actor-label ${kind}`} text-anchor="middle">${t[kind]}</text>
    ${
      active
        ? svg`<path class=${`motion-arrow ${kind}`}
      d=${`M ${position(x) - plus * 13} 234 h ${plus * 26} l ${-plus * 5} -4 m ${plus * 5} 4 l ${-plus * 5} 4`} />`
        : svg``
    }
  `;
}

export function scene(
  trial: Trial,
  sample: Sample,
  time: number,
  waves: boolean,
  scrub: Scrub,
  t: Messages,
) {
  return svg`<svg class="wave-field" viewBox="0 0 600 324" aria-label=${t.waveView}>
    <defs><clipPath id="acoustic-field"><rect x=${startX} y=${trackY - field.halfHeight * scale}
      width=${field.width * scale} height=${2 * field.halfHeight * scale} /></clipPath></defs>
    <text x="28" y="25" class="scene-note">${t.frame}</text>
    <rect x=${startX} y="38" width="544" height="224" class="field-edge" />
    <g clip-path="url(#acoustic-field)">
      ${[0, 5, 10, 15, 20, 25, 30].map((metres) => svg`<line x1=${position(metres)} x2=${position(metres)} y1="38" y2="262" class="field-grid" />`)}
      ${
        waves
          ? svg`<g class="wavefronts">
        ${trial.fronts(time).map(
          (
            wave,
          ) => svg`<circle class=${sample.index === wave.index && sample.phase < 0.22 ? "wavefront hitting" : "wavefront"}
          data-wave=${wave.index} cx=${position(wave.center)} cy=${trackY} r=${wave.radius * scale} />`,
        )}
      </g>`
          : svg``
      }
      <line x1=${startX} x2=${position(field.width)} y1=${trackY} y2=${trackY} class="track-axis" />
    </g>
    ${(
      [
        ["source", sample.source],
        ["observer", sample.observer],
      ] as const
    ).map(([kind, x]) =>
      object(
        kind,
        {
          x,
          velocity: trial.velocity[kind],
          time,
          phase: sample.phase,
          index: sample.index,
        },
        scrub,
        t,
      ),
    )}
    ${[0, 5, 10, 15, 20, 25, 30].map(
      (metres) => svg`
      <line x1=${position(metres)} x2=${position(metres)} y1="262" y2="269" class="track-tick" />
      <text x=${position(metres)} y="287" text-anchor="middle" class="svg-label">${metres}</text>`,
    )}
    <text x="572" y="287" text-anchor="end" class="svg-label">x (m)</text>
    ${trial.velocity.source || trial.velocity.observer ? svg`<text x="28" y="312" class="scene-note">${t.drag}</text>` : svg``}
  </svg>`;
}
