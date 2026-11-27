import { nothing, svg } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import type { Messages } from "../locales/messages";
import {
  clamp,
  duration,
  field,
  type Mover,
  type Sample,
  type Trial,
} from "../model/physics";

const startX = 28;
const scale = 16;
const trackY = 144;
const fieldTop = trackY - field.halfHeight * scale;
const fieldHeight = 2 * field.halfHeight * scale;
const fieldBottom = fieldTop + fieldHeight;
const position = (value: number) => startX + scale * value;

interface Scrub {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

export interface SceneLayers {
  wavefronts: boolean;
  wavelengthGuide: boolean;
  vectors: boolean;
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
    showVectors: boolean;
  },
  scrub: Scrub,
  t: Messages,
) {
  const { x, velocity, time, phase, index, showVectors } = options;
  const active = velocity !== 0;
  const pulse = kind === "observer" && phase < 0.22;
  const plus = Math.sign(velocity);
  const cx = position(x);
  const labelX = clamp(cx, 74, 526);
  const speedText = `${kind === "source" ? "vₛ" : "vₒ"} = ${velocity > 0 ? "+" : "−"}${Math.abs(velocity)} m/s`;
  return svg`
    <g class=${`object ${kind}${active ? " scrubbable" : ""}`} data-object=${kind} data-position=${x}
      data-last-arrival=${kind === "observer" ? index : nothing}
      transform=${`translate(${cx} ${trackY})`}
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
      ${pulse ? svg`<circle class="receive-pulse" r=${22 + 28 * phase} opacity=${0.82 * (1 - phase / 0.22)} />` : svg``}
      ${active ? svg`<circle r="19" class="scrub-ring" />` : svg``}
      <circle r="22" class="object-hit" />
      <circle r="15" class="object-body" />
      ${
        kind === "source"
          ? svg`<path d="M-7 -4 H-3 L3 -8 V8 L-3 4 H-7 Z M6 -5 Q11 0 6 5" class="glyph" />`
          : svg`<circle r="6" class="glyph" /><path d="M-9 0 H9 M0 -9 V9" class="glyph" />`
      }
    </g>
    <text x=${cx} y=${trackY + 34} class=${`actor-label ${kind}`} text-anchor="middle">${t[kind]}</text>
    ${
      active && showVectors
        ? svg`<g class=${`velocity-cue ${kind}`}>
            <path class="motion-arrow"
              d=${`M ${cx - plus * 16} ${trackY - 28} h ${plus * 32} l ${-plus * 6} -4.5 m ${plus * 6} 4.5 l ${-plus * 6} 4.5`} />
            <text x=${labelX} y=${trackY - 39} class="vector-label" text-anchor="middle">${speedText}</text>
          </g>`
        : svg``
    }
  `;
}

function wavelengthBracket(trial: Trial, sample: Sample, time: number) {
  const crests = trial
    .fronts(time)
    .map((wave) => wave.center + wave.radius)
    .filter(
      (edge) => edge > sample.source + 0.35 && edge < sample.observer - 0.35,
    )
    .sort((a, b) => a - b);
  if (crests.length < 2) return svg``;
  const mid = (sample.source + sample.observer) / 2;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < crests.length - 1; i++) {
    const center = (crests[i] + crests[i + 1]) / 2;
    const dist = Math.abs(center - mid);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  const x1 = position(crests[best]);
  const x2 = position(crests[best + 1]);
  const barY = trackY + 56;
  const labelX = clamp((x1 + x2) / 2, 74, 526);
  return svg`<g class="wavelength-guide" aria-hidden="true">
    <line x1=${x1} x2=${x1} y1=${trackY} y2=${barY + 4} class="wavelength-leader" />
    <line x1=${x2} x2=${x2} y1=${trackY} y2=${barY + 4} class="wavelength-leader" />
    <circle cx=${x1} cy=${trackY} r="2.6" class="wavelength-dot" />
    <circle cx=${x2} cy=${trackY} r="2.6" class="wavelength-dot" />
    <line x1=${x1} x2=${x2} y1=${barY} y2=${barY} class="wavelength-span" />
    <text x=${labelX} y=${barY + 17} text-anchor="middle" class="wavelength-label">λ₊ = ${trial.toward.toFixed(3)} m</text>
  </g>`;
}

export function scene(
  trial: Trial,
  sample: Sample,
  time: number,
  layers: SceneLayers,
  scrub: Scrub,
  t: Messages,
) {
  const visibleFronts = layers.wavefronts ? trial.fronts(time) : [];
  return svg`<svg class="wave-field" viewBox="0 0 600 292" aria-label=${t.waveView}>
    <defs><clipPath id="acoustic-field"><rect x=${startX} y=${fieldTop}
      width=${field.width * scale} height=${fieldHeight} /></clipPath></defs>
    <text x="28" y="21" class="scene-note">${t.frame}</text>
    <rect x=${startX} y=${fieldTop} width="544" height=${fieldHeight} rx="3" class="field-edge" />
    <g clip-path="url(#acoustic-field)">
      ${[0, 5, 10, 15, 20, 25, 30].map((metres) => svg`<line x1=${position(metres)} x2=${position(metres)} y1=${fieldTop} y2=${fieldBottom} class="field-grid" />`)}
      ${
        layers.wavefronts
          ? svg`<g class="wavefronts">
        ${visibleFronts.map((wave) => {
          const hitting = sample.index === wave.index && sample.phase < 0.22;
          const opacity = clamp(0.62 - (wave.radius / 26) * 0.44, 0.16, 0.62);
          return svg`<circle class=${hitting ? "wavefront hitting" : "wavefront"}
            data-wave=${wave.index} cx=${position(wave.center)} cy=${trackY} r=${wave.radius * scale}
            stroke-opacity=${hitting ? 1 : opacity.toFixed(2)} />`;
        })}
      </g>`
          : svg``
      }
      <line x1=${startX} x2=${position(field.width)} y1=${trackY} y2=${trackY} class="track-axis" />
      ${layers.wavelengthGuide ? wavelengthBracket(trial, sample, time) : svg``}
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
          showVectors: layers.vectors,
        },
        scrub,
        t,
      ),
    )}
    ${[0, 5, 10, 15, 20, 25, 30].map(
      (metres) => svg`
      <line x1=${position(metres)} x2=${position(metres)} y1=${fieldBottom} y2=${fieldBottom + 6} class="track-tick" />
      <text x=${position(metres)} y=${fieldBottom + 21} text-anchor="middle" class="svg-label">${metres}</text>`,
    )}
    <text x="572" y=${fieldBottom + 21} text-anchor="end" class="svg-label">x (m)</text>
  </svg>`;
}
