import { svg } from "lit";
import type { Messages } from "../locales/messages";
import {
  at,
  envelope,
  parameterValue,
  relativePhase,
  type Parameters,
} from "../model/physics";

const originX = 152;
const originY = 162;
const trackX = 434;
const scale = 12.5;

type Point = { x: number; y: number };

interface PhaseInteractions {
  start(event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(event: KeyboardEvent): void;
}

function vector(
  start: Point,
  end: Point,
  kind: string,
  label?: string,
  atTip = false,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.01) return svg``;
  const alongX = dx / length;
  const alongY = dy / length;
  const headSize = Math.min(7, length * 0.45);
  const baseX = end.x - alongX * headSize;
  const baseY = end.y - alongY * headSize;
  const labelX = atTip
    ? end.x + alongX * 14
    : (start.x + end.x) / 2 - alongY * 11;
  const labelY = atTip
    ? end.y + alongY * 14
    : (start.y + end.y) / 2 + alongX * 11;
  return svg`<g class=${kind}>
    <line x1=${start.x} y1=${start.y} x2=${end.x} y2=${end.y} class="vector-line" />
    <path d=${`M ${end.x} ${end.y} L ${baseX - alongY * headSize * 0.52} ${baseY + alongX * headSize * 0.52} L ${baseX + alongY * headSize * 0.52} ${baseY - alongX * headSize * 0.52} Z`} fill="currentColor" />
    ${
      label && length >= 22
        ? svg`<text x=${labelX} y=${labelY + 3.5} text-anchor="middle" class="vector-label">${label}</text>`
        : svg``
    }
  </g>`;
}

export function phaseFromPointer(event: PointerEvent): number | null {
  const svgElement = (event.currentTarget as Element).closest("svg");
  const matrix = svgElement?.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  const degrees =
    (Math.atan2(originY - point.y, point.x - originX) * 180) / Math.PI;
  return parameterValue("phaseSecond", degrees);
}

export function scene(
  parameters: Parameters,
  state: ReturnType<typeof at>,
  time: number,
  options: { vectors: boolean; envelopeGuide: boolean },
  phaseInteractions: PhaseInteractions,
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
  const radius = envelope(parameters, time);
  const deltaDeg = relativePhase(parameters, time);
  const deltaRad = (deltaDeg * Math.PI) / 180;
  const active =
    parameters.amplitudeFirst > 0 && parameters.amplitudeSecond > 0;
  const arcRadius = Math.min(
    28,
    Math.min(parameters.amplitudeFirst, parameters.amplitudeSecond) *
      scale *
      0.62,
  );
  const showArc =
    options.vectors &&
    options.envelopeGuide &&
    active &&
    arcRadius >= 10 &&
    Math.abs(deltaRad) > 0.09;
  const arcStart = {
    x: originX + arcRadius * Math.cos(state.firstAngle),
    y: originY - arcRadius * Math.sin(state.firstAngle),
  };
  const arcEnd = {
    x: originX + arcRadius * Math.cos(state.firstAngle + deltaRad),
    y: originY - arcRadius * Math.sin(state.firstAngle + deltaRad),
  };
  const arcMidAngle = state.firstAngle + deltaRad / 2;
  const arcLabel = {
    x: originX + (arcRadius + 13) * Math.cos(arcMidAngle),
    y: originY - (arcRadius + 13) * Math.sin(arcMidAngle) + 3.5,
  };
  const tracks = [
    { value: state.firstX, label: "x₁", kind: "first", y: 96 },
    { value: state.secondX, label: "x₂", kind: "second", y: 162 },
    { value: state.sumX, label: "x₁ + x₂", kind: "sum", y: 228 },
  ];

  return svg`<svg class="motion-scene" viewBox="0 0 580 320" role="group" aria-label=${t.scene}>
    <defs>
      <radialGradient id="beats-bead" cx="30%" cy="25%" r="78%">
        <stop offset="0" stop-color="#b4d3ff" />
        <stop offset="0.24" stop-color="#5a98ff" />
        <stop offset="0.6" stop-color="#286eed" />
        <stop offset="0.88" stop-color="#124bc0" />
        <stop offset="1" stop-color="#103778" />
      </radialGradient>
      <filter id="beats-glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </defs>
    <text x=${originX} y="30" class="scene-title" text-anchor="middle">${t.plane}</text>
    <text x=${trackX} y="30" class="scene-title" text-anchor="middle">${t.tracks}</text>
    <line class="guide" x1="290" y1="48" x2="290" y2="276" />
    ${[4, 8].map((r) => svg`<circle cx=${originX} cy=${originY} r=${r * scale} class="guide grid-ring" />`)}
    ${
      options.vectors && options.envelopeGuide && radius > 0.05
        ? svg`<circle cx=${originX} cy=${originY} r=${radius * scale} class="envelope-ring" />`
        : svg``
    }
    <path class="axis" d="M 42 162 H 264 M 152 52 V 272" />
    <text x="257" y="152" class="svg-label">x</text>
    <text x="160" y="61" class="svg-label">y</text>
    <circle cx=${originX} cy=${originY} r="2.5" class="origin" />
    ${
      showArc
        ? svg`<g class="phase-arc-group">
            <path
              class="phase-arc"
              d=${`M ${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A ${arcRadius.toFixed(2)} ${arcRadius.toFixed(2)} 0 0 ${deltaRad > 0 ? 0 : 1} ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)}`}
            />
            <text x=${arcLabel.x.toFixed(2)} y=${arcLabel.y.toFixed(2)} text-anchor="middle" class="phase-arc-label">Δφ</text>
          </g>`
        : svg``
    }
    ${
      options.vectors
        ? svg`<g class="phasors">
            ${[first, second, sum].map((point) => svg`<line x1=${point.x} y1=${point.y} x2=${point.x} y2=${originY} class="projection" />`)}
            <line x1=${originX} y1=${originY} x2=${second.x} y2=${second.y} class="second ghost" />
            ${vector(origin, first, "first", "Z₁")}
            ${vector(first, sum, "second", "Z₂")}
            ${vector(origin, sum, "sum", "Z", true)}
            ${
              radius > 0.05
                ? svg`<circle cx=${sum.x} cy=${sum.y} r="7" fill="#286eed" opacity="0.16" filter="url(#beats-glow)" />
                    <circle cx=${sum.x} cy=${sum.y} r="4.2" fill="url(#beats-bead)" stroke="#6da0ff" stroke-width="0.7" />`
                : svg``
            }
            ${
              parameters.amplitudeSecond > 0
                ? svg`<g class="second">
                    <circle cx=${second.x} cy=${second.y} r="3.5" class="phase-marker" />
                    <circle
                      class="phase-handle"
                      cx=${second.x}
                      cy=${second.y}
                      r="15"
                      fill="transparent"
                      tabindex="0"
                      role="slider"
                      aria-label=${t.dragPhaseLabel}
                      aria-valuemin="-180"
                      aria-valuemax="180"
                      aria-valuenow=${parameters.phaseSecond}
                      aria-valuetext=${`${parameters.phaseSecond}°. ${t.dragPhaseKeyHelp}`}
                      @pointerdown=${phaseInteractions.start}
                      @pointermove=${phaseInteractions.move}
                      @pointerup=${phaseInteractions.end}
                      @pointercancel=${phaseInteractions.end}
                      @lostpointercapture=${phaseInteractions.end}
                      @keydown=${phaseInteractions.key}
                    >
                      <title>${t.dragPhaseHint}</title>
                    </circle>
                  </g>`
                : svg``
            }
          </g>`
        : svg`<g class="axis-projections">
            <circle cx=${first.x} cy=${originY} r="3.2" class="point first" />
            <circle cx=${second.x} cy=${originY} r="3.2" class="point second" />
            <circle cx=${sum.x} cy=${originY} r="4.5" fill="url(#beats-bead)" stroke="#6da0ff" stroke-width="0.7" />
          </g>`
    }
    <line class="guide grid-ring" x1=${trackX} y1="74" x2=${trackX} y2="246" />
    ${
      options.envelopeGuide && radius > 0.02
        ? svg`<g class="track-envelope">
            <rect
              x=${trackX - radius * scale}
              y=${228 - 7}
              width=${2 * radius * scale}
              height="14"
              rx="2"
              class="envelope-band"
            />
            <line x1=${trackX - radius * scale} y1=${228 - 9} x2=${trackX - radius * scale} y2=${228 + 9} class="envelope-tick" />
            <line x1=${trackX + radius * scale} y1=${228 - 9} x2=${trackX + radius * scale} y2=${228 + 9} class="envelope-tick" />
          </g>`
        : svg``
    }
    ${tracks.map(({ value, label, kind, y }) => {
      const x = trackX + value * scale;
      return svg`<g class=${kind}>
        <text x="316" y=${y - 15} class="track-label">${label}</text>
        <line x1="334" y1=${y} x2="534" y2=${y} class="axis" />
        ${[-8, -4, 0, 4, 8].map((tick) => svg`<line x1=${trackX + tick * scale} y1=${y - 4} x2=${trackX + tick * scale} y2=${y + 4} class="axis" />`)}
        <line x1=${trackX} y1=${y} x2=${x} y2=${y} class="vector-line" />
        ${
          kind === "sum"
            ? svg`<circle cx=${x} cy=${y} r="10" fill="#286eed" opacity="0.16" filter="url(#beats-glow)" />
                <circle data-track=${kind} data-value=${value} cx=${x} cy=${y} r="6.5" fill="url(#beats-bead)" stroke="#6da0ff" stroke-width="0.8" />`
            : svg`<circle data-track=${kind} data-value=${value} cx=${x} cy=${y} r="4.8" class="point" />`
        }
      </g>`;
    })}
    ${[-8, -4, 0, 4, 8].map((tick) => svg`<text text-anchor="middle" x=${trackX + tick * scale} y="256" class="svg-label">${tick}</text>`)}
    <text x="556" y="256" class="svg-label" text-anchor="end">cm</text>
    <text x=${originX} y="294" class="svg-label" text-anchor="middle">x₁ + x₂ = x (cm)</text>
  </svg>`;
}
