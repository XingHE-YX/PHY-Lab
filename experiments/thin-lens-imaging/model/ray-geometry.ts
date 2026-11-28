import type { Image, Ray } from "./optics";

export interface Point {
  x: number;
  y: number;
}

export const frame = { x: 80, y: 12 };

export function imageInView(image: Image) {
  return (
    image.distance !== null &&
    Math.abs(image.distance) <= frame.x &&
    Math.abs(image.height) <= frame.y
  );
}

function clip(origin: Point, direction: Point, limit: number) {
  let start = 0;
  let end = limit;
  for (const axis of ["x", "y"] as const) {
    if (direction[axis] === 0) {
      if (Math.abs(origin[axis]) > frame[axis]) return null;
      continue;
    }
    const first = (-frame[axis] - origin[axis]) / direction[axis];
    const last = (frame[axis] - origin[axis]) / direction[axis];
    start = Math.max(start, Math.min(first, last));
    end = Math.min(end, Math.max(first, last));
  }
  if (end < start) return null;
  const along = (distance: number) => ({
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
  });
  return { from: along(start), to: along(end) };
}

export function outgoing(ray: Ray) {
  return clip({ x: 0, y: ray.lensHeight }, { x: 1, y: ray.slope }, Infinity)!;
}

export function extension(ray: Ray, image: Image) {
  if (image.kind !== "virtual") return null;
  return clip(
    { x: 0, y: ray.lensHeight },
    { x: -1, y: -ray.slope },
    -image.distance,
  );
}
