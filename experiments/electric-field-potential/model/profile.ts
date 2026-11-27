import {
  along,
  chargeAxis,
  excludedRadius,
  lineWindow,
  measure,
  type Charges,
  type Point,
} from "./electrostatics";

export function profile(charges: Charges, probe: Point) {
  const axis = chargeAxis(charges);
  const { start, end } = lineWindow(probe, axis);
  const samples = 240;
  const masks = charges.flatMap((charge) => {
    if (charge.nanoCoulombs === 0) return [];
    const dx = charge.x - probe.x;
    const dy = charge.y - probe.y;
    const center = dx * axis.x + dy * axis.y;
    const perpendicular = dx * axis.y - dy * axis.x;
    if (Math.abs(perpendicular) > excludedRadius) return [];
    const radius = Math.sqrt(
      Math.max(0, excludedRadius ** 2 - perpendicular ** 2),
    );
    return [{ start: center - radius, end: center + radius }];
  });
  const segments: { offset: number; value: number }[][] = [];
  let current: (typeof segments)[number] = [];
  for (let index = 0; index <= samples && end - start > 1e-9; index++) {
    const offset = start + ((end - start) * index) / samples;
    const value = measure(along(probe, axis, offset), charges)?.potential;
    const preceding = current.at(-1);
    const crosses =
      preceding &&
      masks.some(
        (mask) => mask.start <= offset && mask.end >= preceding.offset,
      );
    if ((value === undefined || crosses) && current.length) {
      segments.push(current);
      current = [];
    }
    if (value !== undefined) current.push({ offset, value });
  }
  if (current.length) segments.push(current);
  const peak = Math.max(
    1,
    ...segments.flat().map(({ value }) => Math.abs(value)),
  );
  const increment = 10 ** Math.floor(Math.log10(peak));
  return {
    start,
    end,
    segments,
    scale: Math.ceil((peak * 1.05) / increment) * increment,
  };
}
