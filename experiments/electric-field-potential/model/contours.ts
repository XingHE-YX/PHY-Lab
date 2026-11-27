import {
  balanced,
  bisector,
  board,
  measure,
  type Charges,
  type Point,
} from "./electrostatics";

export interface Segment {
  from: Point;
  to: Point;
}

function pointKey(point: Point) {
  return `${Math.round(point.x * 1e8)},${Math.round(point.y * 1e8)}`;
}

export function polylines(segments: readonly Segment[]) {
  const incident = new Map<string, number[]>();
  const unused = new Set<number>();
  segments.forEach(({ from, to }, index) => {
    const first = pointKey(from);
    const last = pointKey(to);
    if (first === last) return;
    unused.add(index);
    for (const key of [first, last]) {
      const neighbors = incident.get(key);
      if (neighbors) neighbors.push(index);
      else incident.set(key, [index]);
    }
  });

  function follow(start: Point) {
    const points: Point[] = [];
    let point = start;
    while (true) {
      const key = pointKey(point);
      const next = incident.get(key)?.find((index) => unused.has(index));
      if (next === undefined) return points;
      unused.delete(next);
      const { from, to } = segments[next];
      point = pointKey(from) === key ? to : from;
      points.push(point);
    }
  }

  const paths: Point[][] = [];
  for (const index of unused) {
    unused.delete(index);
    const { from, to } = segments[index];
    paths.push([...follow(from).reverse(), from, to, ...follow(to)]);
  }
  return paths;
}

export const levels = [-80, -40, -20, -10, -5, 0, 5, 10, 20, 40, 80];
const columns = 128;
const rows = 72;

function crossings(
  points: Point[],
  values: number[],
  level: number,
): Segment[] {
  const edges = points.map((point, index) => {
    const next = (index + 1) % points.length;
    if (values[index] >= level === values[next] >= level) return null;
    const fraction = (level - values[index]) / (values[next] - values[index]);
    return {
      x: point.x + fraction * (points[next].x - point.x),
      y: point.y + fraction * (points[next].y - point.y),
    };
  });
  const cuts = edges.filter((point) => point !== null);
  if (cuts.length === 2) return [{ from: cuts[0], to: cuts[1] }];
  if (cuts.length !== 4) return [];
  const center = values.reduce((sum, value) => sum + value, 0) / 4;
  return values[0] >= level === center >= level
    ? [
        { from: cuts[0], to: cuts[1] },
        { from: cuts[2], to: cuts[3] },
      ]
    : [
        { from: cuts[0], to: cuts[3] },
        { from: cuts[1], to: cuts[2] },
      ];
}

export function contours(charges: Charges) {
  const groups = levels.map((level) => ({ level, segments: [] as Segment[] }));
  if (charges.every((charge) => charge.nanoCoulombs === 0)) return groups;
  const exactZero = balanced(charges);
  if (exactZero)
    groups.find(({ level }) => level === 0)!.segments.push(bisector(charges));
  const numeric = groups.filter(({ level }) => level !== 0 || !exactZero);
  const grid = Array.from({ length: rows + 1 }, (_, row) =>
    Array.from({ length: columns + 1 }, (_, column) => {
      const point = {
        x: -board.x + (2 * board.x * column) / columns,
        y: -board.y + (2 * board.y * row) / rows,
      };
      return { point, potential: measure(point, charges)?.potential ?? null };
    }),
  );
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const corners = [
        grid[row][column],
        grid[row][column + 1],
        grid[row + 1][column + 1],
        grid[row + 1][column],
      ];
      const values = corners.map((corner) => corner.potential);
      if (!values.every((value) => value !== null)) continue;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const points = corners.map((corner) => corner.point);
      for (const { level, segments } of numeric) {
        if (min < level && level <= max)
          segments.push(...crossings(points, values, level));
      }
    }
  }
  return groups;
}
