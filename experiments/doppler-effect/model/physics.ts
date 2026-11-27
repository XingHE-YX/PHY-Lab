export const soundSpeed = 340;
export const duration = 0.08;
export const playbackScale = 0.02;
export const field = { width: 34, halfHeight: 7 };

export type Mover = "source" | "observer";
export const motions = ["approach", "rest", "retreat"] as const;
export type Motion = (typeof motions)[number];

export interface Parameters {
  mover: Mover;
  motion: Motion;
  speed: number;
  frequency: number;
}

export const limits = {
  speed: { min: 0, max: 170, step: 5, unit: "m/s" },
  frequency: { min: 200, max: 700, step: 25, unit: "Hz" },
} as const;
export type Parameter = keyof typeof limits;
export const defaults: Parameters = {
  mover: "source",
  motion: "approach",
  speed: 85,
  frequency: 400,
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function parameterValue(key: Parameter, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value))
    return defaults[key];
  const { min, max, step } = limits[key];
  return min + Math.round((clamp(value, min, max) - min) / step) * step;
}

export function velocities(parameters: Parameters) {
  const speed = parameters.speed;
  const signed =
    parameters.motion === "rest" || speed === 0
      ? 0
      : parameters.motion === "approach"
        ? speed
        : -speed;
  return {
    source: parameters.mover === "source" ? signed : 0,
    observer: parameters.mover === "observer" && signed !== 0 ? -signed : 0,
  };
}

export function compare(parameters: Parameters) {
  const velocity = velocities(parameters);
  const emitted = parameters.frequency;
  const toward = (soundSpeed - velocity.source) / emitted;
  const behind = (soundSpeed + velocity.source) / emitted;
  const received =
    emitted *
    ((soundSpeed - velocity.observer) / (soundSpeed - velocity.source));
  return { emitted, received, toward, behind, shift: received - emitted };
}

export function makeTrial(parameters: Parameters) {
  const motion = parameters.speed === 0 ? "rest" : parameters.motion;
  const velocity = velocities(parameters);
  const sourceStart =
    motion === "rest"
      ? 8
      : parameters.mover === "source" && motion === "retreat"
        ? 15
        : 4;
  const observerStart =
    motion === "rest"
      ? 26
      : parameters.mover === "observer" && motion === "retreat"
        ? 19
        : 30;
  const initialGap = observerStart - sourceStart;
  const readings = compare(parameters);
  const emission = (index: number) => index / readings.emitted;
  const arrival = (index: number) =>
    (initialGap + (soundSpeed - velocity.source) * emission(index)) /
    (soundSpeed - velocity.observer);

  function at(time: number) {
    const source = sourceStart + velocity.source * time;
    const observer = observerStart + velocity.observer * time;
    const retarded =
      ((soundSpeed - velocity.observer) * time - initialGap) /
      (soundSpeed - velocity.source);
    const index = Math.floor(retarded * readings.emitted + 1e-9);
    const phase = Math.max(0, (time - arrival(index)) * readings.received);
    return { source, observer, retarded, index, phase };
  }

  function front(index: number, time: number) {
    const emittedAt = emission(index);
    return {
      index,
      center: sourceStart + velocity.source * emittedAt,
      radius: soundSpeed * Math.max(0, time - emittedAt),
    };
  }

  function fronts(time: number) {
    const longest =
      Math.hypot(field.width, field.halfHeight) /
      (soundSpeed - Math.abs(velocity.source));
    const first = Math.ceil((time - longest) * readings.emitted);
    const last = Math.floor(time * readings.emitted + 1e-9);
    const visible = [];
    for (let index = first; index <= last; index++) {
      const wave = front(index, time);
      const near = Math.max(0, -wave.center, wave.center - field.width);
      const far = Math.hypot(
        Math.max(Math.abs(wave.center), Math.abs(field.width - wave.center)),
        field.halfHeight,
      );
      if (wave.radius >= near && wave.radius <= far) visible.push(wave);
    }
    return visible;
  }

  function nextArrival(time: number) {
    const next = arrival(at(time).index + 1);
    return next <= duration ? next : arrival(at(0).index + 1);
  }

  return {
    ...readings,
    motion,
    velocity,
    emission,
    arrival,
    at,
    front,
    fronts,
    nextArrival,
  };
}

export type Trial = ReturnType<typeof makeTrial>;
export type Sample = ReturnType<Trial["at"]>;
