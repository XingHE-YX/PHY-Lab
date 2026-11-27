export interface Point {
  x: number;
  y: number;
}

export interface Charge extends Point {
  nanoCoulombs: number;
}

export type Charges = readonly [Charge, Charge];
export type Item = "first" | "second" | "probe";
export type Preset = "dipole" | "like" | "unequal";

export const board = { x: 4.8, y: 2.7 };
export const chargeBounds = { x: 4.4, y: 2.3 };
export const excludedRadius = 0.22;
export const minimumSeparation = 0.6;
export const valueRange = { min: -8, max: 8, step: 0.5 };
export const coulombInNano = 8.9875517923;
export const zeroTolerance = 1e-9;

export const presets: Record<Preset, Charges> = {
  dipole: [
    { x: -1.4, y: 0, nanoCoulombs: 4 },
    { x: 1.4, y: 0, nanoCoulombs: -4 },
  ],
  like: [
    { x: -1.4, y: 0, nanoCoulombs: 4 },
    { x: 1.4, y: 0, nanoCoulombs: 4 },
  ],
  unequal: [
    { x: -1.4, y: 0, nanoCoulombs: 4 },
    { x: 1.4, y: 0, nanoCoulombs: -2 },
  ],
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export const distance = (first: Point, second: Point) =>
  Math.hypot(first.x - second.x, first.y - second.y);
export const midpoint = (charges: Charges): Point => ({
  x: (charges[0].x + charges[1].x) / 2,
  y: (charges[0].y + charges[1].y) / 2,
});
export const balanced = (charges: Charges) =>
  charges[0].nanoCoulombs !== 0 &&
  charges[0].nanoCoulombs === -charges[1].nanoCoulombs;
export const separated = (first: Point, second: Point) =>
  distance(first, second) >= minimumSeparation - 1e-12;

export function bounded(point: Point, bounds: Point, snap = false): Point {
  const coordinate = (value: number, edge: number) => {
    const limited = clamp(value, -edge, edge);
    return snap ? Math.round(limited * 20) / 20 : limited;
  };
  return { x: coordinate(point.x, bounds.x), y: coordinate(point.y, bounds.y) };
}

export function chargeValue(value: number) {
  return (
    Math.round(clamp(value, valueRange.min, valueRange.max) / valueRange.step) *
    valueRange.step
  );
}

export function replaceCharge(
  charges: Charges,
  index: 0 | 1,
  charge: Charge,
): Charges {
  return index === 0 ? [charge, charges[1]] : [charges[0], charge];
}

export function measure(point: Point, charges: Charges) {
  const parts = [];
  let potential = 0;
  let fieldX = 0;
  let fieldY = 0;
  for (const charge of charges) {
    const deltaX = point.x - charge.x;
    const deltaY = point.y - charge.y;
    const radius = Math.hypot(deltaX, deltaY);
    const strength = coulombInNano * charge.nanoCoulombs;
    if (strength !== 0 && radius <= excludedRadius) return null;
    const voltage = strength === 0 ? 0 : strength / radius;
    const fieldFactor = strength === 0 ? 0 : voltage / radius ** 2;
    const contribution = {
      potential: voltage,
      fieldX: fieldFactor * deltaX,
      fieldY: fieldFactor * deltaY,
    };
    parts.push(contribution);
    potential += contribution.potential;
    fieldX += contribution.fieldX;
    fieldY += contribution.fieldY;
  }
  return {
    potential,
    fieldX,
    fieldY,
    magnitude: Math.hypot(fieldX, fieldY),
    parts,
  };
}

export type Reading = NonNullable<ReturnType<typeof measure>>;

export function chargeAxis(charges: Charges): Point {
  const span = distance(...charges);
  return {
    x: (charges[1].x - charges[0].x) / span,
    y: (charges[1].y - charges[0].y) / span,
  };
}

export function along(origin: Point, direction: Point, offset: number): Point {
  return {
    x: origin.x + direction.x * offset,
    y: origin.y + direction.y * offset,
  };
}

export function lineWindow(origin: Point, direction: Point) {
  let start = -Infinity;
  let end = Infinity;
  for (const axis of ["x", "y"] as const) {
    if (Math.abs(direction[axis]) < 1e-12) continue;
    const near = (-board[axis] - origin[axis]) / direction[axis];
    const far = (board[axis] - origin[axis]) / direction[axis];
    start = Math.max(start, Math.min(near, far));
    end = Math.min(end, Math.max(near, far));
  }
  return { start, end };
}

export function bisector(charges: Charges) {
  const origin = midpoint(charges);
  const axis = chargeAxis(charges);
  const direction = { x: -axis.y, y: axis.x };
  const { start, end } = lineWindow(origin, direction);
  return {
    from: along(origin, direction, start),
    to: along(origin, direction, end),
  };
}
