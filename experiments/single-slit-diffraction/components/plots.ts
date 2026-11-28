import { svg } from "lit";
import { guard } from "lit/directives/guard.js";
import type { Messages } from "../locales/messages";
import {
  clamp,
  profile,
  screenExtent,
  width,
  type Parameters,
} from "../model/diffraction";

type Lane = "current" | "reference";
interface Horizontal {
  left: number;
  right: number;
}
interface Box extends Horizontal {
  top: number;
  bottom: number;
}
interface Scrub {
  start(event: PointerEvent, position: number | null): void;
  move(event: PointerEvent, position: number | null): void;
  end(event: PointerEvent): void;
}

const screenRange = { left: 43, right: 573 };
export const chartWidth = 344;
const chartRange = { left: 46, right: 322 };
const ticks = [-40, -20, 0, 20, 40];

const xAt = (position: number, view: Horizontal) =>
  view.left +
  ((position + screenExtent) / (2 * screenExtent)) * (view.right - view.left);

function screenPosition(event: PointerEvent, view: Horizontal) {
  const matrix = (
    event.currentTarget as SVGGraphicsElement
  ).ownerSVGElement?.getScreenCTM();
  if (!matrix) return null;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return clamp(
    ((point.x - view.left) / (view.right - view.left)) * 2 * screenExtent -
      screenExtent,
    -screenExtent,
    screenExtent,
  );
}

function hit(box: Box, input: Scrub) {
  return svg`<rect class="position-hit" x=${box.left} y=${box.top} width=${box.right - box.left} height=${box.bottom - box.top}
    @pointerdown=${(event: PointerEvent) => input.start(event, screenPosition(event, box))}
    @pointermove=${(event: PointerEvent) => {
      if (
        (event.currentTarget as SVGElement).hasPointerCapture(event.pointerId)
      )
        input.move(event, screenPosition(event, box));
    }}
    @pointerup=${input.end} @pointercancel=${input.end} @lostpointercapture=${input.end} />`;
}

function tint(wavelength: number) {
  const stops = [
    { wavelength: 400, hue: 266 },
    { wavelength: 460, hue: 222 },
    { wavelength: 490, hue: 174 },
    { wavelength: 550, hue: 104 },
    { wavelength: 580, hue: 54 },
    { wavelength: 620, hue: 14 },
    { wavelength: 700, hue: 0 },
  ];
  const last = stops.findIndex((stop) => stop.wavelength >= wavelength);
  if (last === 0) return "hsl(266 91% 65%)";
  const lower = stops[last - 1];
  const higher = stops[last];
  const hue =
    lower.hue +
    ((higher.hue - lower.hue) * (wavelength - lower.wavelength)) /
      (higher.wavelength - lower.wavelength);
  return `hsl(${hue.toFixed(1)} 92% 64%)`;
}

export function pattern(parameters: Parameters, lane: Lane) {
  const points = profile(parameters);
  const centralWidth = width(parameters);
  const color = tint(parameters.wavelength);
  return {
    first: centralWidth / 2,
    centralWidth,
    slit: parameters.slit,
    path: points
      .map(
        ({ position, intensity }) =>
          `${xAt(position, chartRange).toFixed(3)},${intensity.toFixed(6)}`,
      )
      .join(" "),
    gradient: svg`<linearGradient id=${`fringe-${lane}`} x1="0%" x2="100%" y1="0%" y2="0%" data-wavelength=${parameters.wavelength}>
      ${points.map(
        ({
          position,
          intensity,
        }) => svg`<stop offset=${(position + screenExtent) / (2 * screenExtent)} stop-color=${color}
        stop-opacity=${Math.sqrt(intensity)} />`,
      )}
    </linearGradient>`,
  };
}

type Pattern = ReturnType<typeof pattern>;

function strip(
  lane: Lane,
  profile: Pattern,
  intensity: number,
  top: number,
  cursor: number,
  guides: boolean,
  t: Messages,
) {
  const bottom = top + 56;
  const leftMark = xAt(-profile.first, screenRange);
  const rightMark = xAt(profile.first, screenRange);
  return svg`<g class=${`strip ${lane}`} data-strip=${lane} data-probe-intensity=${intensity} data-width=${profile.centralWidth}>
    <text x=${screenRange.left} y=${top - 12} class="strip-label">${t[lane]} · ${profile.slit} μm</text>
    <rect x=${screenRange.left} y=${top} width=${screenRange.right - screenRange.left} height="56" rx="2" class="screen-base" />
    <rect x=${screenRange.left} y=${top} width=${screenRange.right - screenRange.left} height="56" rx="2" fill=${`url(#fringe-${lane})`} />
    ${
      guides
        ? svg`
      <path class="minima-on-screen" d=${`M ${leftMark} ${top + 42} V ${bottom} M ${rightMark} ${top + 42} V ${bottom}`} />
      <path class="width-bracket" d=${`M ${leftMark} ${bottom + 4} V ${bottom + 12} H ${rightMark} V ${bottom + 4}`} />
    `
        : svg``
    }
    <line class="probe-light" x1=${cursor} x2=${cursor} y1=${top} y2=${bottom} />
  </g>`;
}

export function screen(
  current: Pattern,
  reference: Pattern,
  probe: number,
  intensities: readonly [number, number],
  guides: boolean,
  input: Scrub,
  t: Messages,
) {
  const cursor = xAt(probe, screenRange);
  return svg`<svg class="fringe-screen" viewBox="0 0 600 324" role="img" aria-label=${t.screen} data-probe=${probe}>
    <defs>${guard([current], () => current.gradient)}${guard([reference], () => reference.gradient)}</defs>
    ${strip("current", current, intensities[0], 62, cursor, guides, t)}
    ${strip("reference", reference, intensities[1], 175, cursor, guides, t)}
    <line class="axis" x1=${screenRange.left} x2=${screenRange.right} y1="265" y2="265" />
    ${ticks.map(
      (position) => svg`
      <line class="axis" x1=${xAt(position, screenRange)} x2=${xAt(position, screenRange)} y1="265" y2="272" />
      <text class="axis-label" x=${xAt(position, screenRange)} y="290" text-anchor="middle">${position}</text>`,
    )}
    <path class="probe-indicator" d=${`M ${cursor - 5} 254 h 10 l -5 8 z`} />
    <text class="axis-label" x=${screenRange.right} y="309" text-anchor="end">x (mm)</text>
    ${hit({ ...screenRange, top: 62, bottom: 265 }, input)}
  </svg>`;
}

export function intensityChart(
  height: number,
  current: Pattern,
  reference: Pattern,
  probe: number,
  intensities: readonly [number, number],
  guides: boolean,
  input: Scrub,
  t: Messages,
) {
  const plot = { ...chartRange, top: 23, bottom: height - 42 };
  const plotHeight = plot.bottom - plot.top;
  const yAt = (intensity: number) => plot.bottom - intensity * plotHeight;
  const cursor = xAt(probe, plot);
  return svg`<svg class="intensity-chart" viewBox=${`0 0 ${chartWidth} ${height}`} role="img" aria-label=${t.analysis} data-probe=${probe}>
    <text class="axis-label" x=${plot.left} y="15">I/I₀</text>
    ${
      guides
        ? svg`<rect class="central-region" x=${xAt(-current.first, plot)} y=${plot.top}
      width=${xAt(current.first, plot) - xAt(-current.first, plot)} height=${plotHeight} />`
        : svg``
    }
    ${[0, 0.25, 0.5, 0.75, 1].map(
      (value) => svg`
      <line class=${value === 0 ? "axis" : "grid-line"} x1=${plot.left} x2=${plot.right} y1=${yAt(value)} y2=${yAt(value)} />
      <text class="axis-label" x="39" y=${yAt(value) + 4} text-anchor="end">${value.toFixed(2)}</text>`,
    )}
    ${ticks.map(
      (position) => svg`
      <line class="grid-line" x1=${xAt(position, plot)} x2=${xAt(position, plot)} y1=${plot.top} y2=${plot.bottom} />
      <text class="axis-label" x=${xAt(position, plot)} y=${plot.bottom + 18} text-anchor="middle">${position}</text>`,
    )}
    <g transform=${`translate(0 ${plot.bottom}) scale(1 ${-plotHeight})`}>
      <polyline class="trace reference" points=${reference.path} />
      <polyline class="trace current" points=${current.path} />
    </g>
    <line class="chart-probe" x1=${cursor} x2=${cursor} y1=${plot.top} y2=${plot.bottom} />
    <circle class="reading reference" data-curve="reference" data-intensity=${intensities[1]} cx=${cursor} cy=${yAt(intensities[1])} r="5" />
    <circle class="reading current" data-curve="current" data-intensity=${intensities[0]} cx=${cursor} cy=${yAt(intensities[0])} r="3" />
    <text class="axis-label" x=${plot.right} y=${height - 5} text-anchor="end">x (mm)</text>
    ${hit(plot, input)}
  </svg>`;
}
