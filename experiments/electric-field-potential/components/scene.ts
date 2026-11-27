import { svg } from "lit";
import type { Messages } from "../locales/messages";
import { contours, polylines } from "../model/contours";
import {
  along,
  board,
  chargeAxis,
  excludedRadius,
  lineWindow,
  measure,
  zeroTolerance,
  type Charges,
  type Item,
  type Point,
  type Reading,
} from "../model/electrostatics";

const pixels = 56;
const offset = { x: 300, y: 174 };
const screen = (point: Point) => ({
  x: offset.x + point.x * pixels,
  y: offset.y - point.y * pixels,
});
const lower = screen({ x: -board.x, y: board.y });

interface Interactions {
  start(item: Item, event: PointerEvent): void;
  move(event: PointerEvent): void;
  end(event: PointerEvent): void;
  key(item: Item, event: KeyboardEvent): void;
  place(event: PointerEvent): void;
}

export function worldCoordinate(event: PointerEvent) {
  const svg = (event.currentTarget as SVGGraphicsElement).ownerSVGElement;
  const matrix = svg?.getScreenCTM();
  if (!matrix) return null;
  const screen = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return {
    x: (screen.x - offset.x) / pixels,
    y: (offset.y - screen.y) / pixels,
  };
}

function arrow(point: Point, reading: Reading, length: number) {
  if (reading.magnitude < zeroTolerance) return "";
  const start = screen(point);
  const unitX = reading.fieldX / reading.magnitude;
  const unitY = -reading.fieldY / reading.magnitude;
  const end = { x: start.x + unitX * length, y: start.y + unitY * length };
  const back = {
    x: end.x - unitX * length * 0.32,
    y: end.y - unitY * length * 0.32,
  };
  const width = length * 0.17;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}
    M ${(back.x - unitY * width).toFixed(2)} ${(back.y + unitX * width).toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}
    L ${(back.x + unitY * width).toFixed(2)} ${(back.y - unitX * width).toFixed(2)}`;
}

export function staticLayers(
  charges: Charges,
  vectors: boolean,
  equipotential: boolean,
) {
  const arrowPaths: string[] = [];
  if (vectors) {
    for (let row = -5; row <= 5; row++) {
      for (let column = -10; column <= 10; column++) {
        const point = { x: column * 0.43, y: row * 0.46 };
        const reading = measure(point, charges);
        if (reading) arrowPaths.push(arrow(point, reading, 9.5));
      }
    }
  }
  const curves = equipotential
    ? contours(charges)
        .filter(({ segments }) => segments.length)
        .map(({ level, segments }) => ({
          level,
          path: polylines(segments)
            .map(
              (points) =>
                `M ${points
                  .map(screen)
                  .map(({ x, y }) => `${x.toFixed(2)} ${y.toFixed(2)}`)
                  .join(" L ")}`,
            )
            .join(" "),
        }))
    : [];
  return { curves, vectorPath: arrowPaths.join(" ") };
}

function handle(
  item: Item,
  title: string,
  point: Point,
  appearance: string,
  label: string,
  input: Interactions,
  t: Messages,
) {
  const where = screen(point);
  return svg`<g class=${`handle ${appearance}`} data-item=${item} data-world-x=${point.x} data-world-y=${point.y}
    transform=${`translate(${where.x} ${where.y})`}
    role="group" tabindex="0" aria-label=${title} aria-description=${`${point.x.toFixed(2)}, ${point.y.toFixed(2)} m. ${t.drag}`}
    @pointerdown=${(event: PointerEvent) => input.start(item, event)} @pointermove=${input.move}
    @pointerup=${input.end} @pointercancel=${input.end} @lostpointercapture=${input.end}
    @keydown=${(event: KeyboardEvent) => input.key(item, event)}>
    <circle r="14" class="handle-hit" />
    <circle r=${item === "probe" ? 7 : 10} class="handle-core" />
    ${item === "probe" ? svg`<circle r="2" class="probe-dot" />` : svg`<text y="4" text-anchor="middle" class="sign">${label}</text>`}
    <text x=${item === "probe" && point.x > 4.1 ? -11 : 12} y="-12" text-anchor=${item === "probe" && point.x > 4.1 ? "end" : "start"} class="handle-label">${item === "first" ? "A" : item === "second" ? "B" : "P"}</text>
  </g>`;
}

export function scene(
  layers: ReturnType<typeof staticLayers>,
  charges: Charges,
  probe: Point,
  reading: Reading | null,
  profile: boolean,
  input: Interactions,
  t: Messages,
) {
  const axis = chargeAxis(charges);
  const { start, end } = lineWindow(probe, axis);
  const sliceStart = screen(along(probe, axis, start));
  const sliceEnd = screen(along(probe, axis, end));
  return svg`<svg class="field-scene" viewBox="0 0 600 363" aria-label=${t.map}>
    <defs><clipPath id="field-window"><rect x=${lower.x} y=${lower.y} width=${2 * board.x * pixels} height=${2 * board.y * pixels} /></clipPath></defs>
    <rect class="field-board" x=${lower.x} y=${lower.y} width=${2 * board.x * pixels} height=${2 * board.y * pixels}
      @pointerdown=${input.place} />
    <g class="field-layers" clip-path="url(#field-window)">
      ${[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((value) => {
        const x = screen({ x: value, y: 0 }).x;
        return svg`<line x1=${x} x2=${x} y1=${lower.y} y2=${2 * offset.y - lower.y} class=${value === 0 ? "world-axis" : "grid-line"} />`;
      })}
      ${[-2, -1, 0, 1, 2].map((value) => {
        const y = screen({ x: 0, y: value }).y;
        return svg`<line x1=${lower.x} x2=${2 * offset.x - lower.x} y1=${y} y2=${y} class=${value === 0 ? "world-axis" : "grid-line"} />`;
      })}
      ${layers.curves.map(({ level, path }) => svg`<path class=${`contour ${level > 0 ? "positive" : level < 0 ? "negative" : "zero"}`} data-level=${level} d=${path} />`)}
      ${layers.vectorPath ? svg`<path class="field-arrows" d=${layers.vectorPath} />` : svg``}
      ${profile ? svg`<line class="slice-guide" x1=${sliceStart.x} x2=${sliceEnd.x} y1=${sliceStart.y} y2=${sliceEnd.y} />` : svg``}
      ${charges
        .filter(({ nanoCoulombs }) => nanoCoulombs !== 0)
        .map((charge) => {
          const center = screen(charge);
          return svg`<circle class="excluded-zone" cx=${center.x} cy=${center.y} r=${excludedRadius * pixels} />`;
        })}
    </g>
    <g class="field-layers">
      ${reading && reading.magnitude >= zeroTolerance ? svg`<path class="probe-arrow" data-field-x=${reading.fieldX} data-field-y=${reading.fieldY} d=${arrow(probe, reading, 34)} />` : svg``}
      ${[-4, -2, 0, 2, 4].map((value) => svg`<text x=${screen({ x: value, y: 0 }).x} y="344" text-anchor="middle" class="axis-label">${value}</text>`)}
      ${[-2, 0, 2].map((value) => svg`<text x="24" y=${screen({ x: 0, y: value }).y + 4} text-anchor="end" class="axis-label">${value}</text>`)}
      <text x="568" y="344" text-anchor="end" class="axis-label">x (m)</text>
      <text x="32" y="14" class="axis-label">y (m)</text>
    </g>
    ${charges.map((charge, index) =>
      handle(
        index === 0 ? "first" : "second",
        index === 0 ? t.first : t.second,
        charge,
        charge.nanoCoulombs > 0
          ? "positive"
          : charge.nanoCoulombs < 0
            ? "negative"
            : "neutral",
        charge.nanoCoulombs > 0 ? "+" : charge.nanoCoulombs < 0 ? "−" : "0",
        input,
        t,
      ),
    )}
    ${handle("probe", t.probe, probe, reading ? "probe valid" : "probe masked", "", input, t)}
  </svg>`;
}
