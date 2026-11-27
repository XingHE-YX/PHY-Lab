export const limits = {
  leftMass: { min: 0.5, max: 4, step: 0.25, unit: "kg" },
  rightMass: { min: 0.5, max: 4, step: 0.25, unit: "kg" },
  leftVelocity: { min: -3, max: 3, step: 0.25, unit: "m/s" },
  rightVelocity: { min: -3, max: 3, step: 0.25, unit: "m/s" },
} as const;
export type Parameter = keyof typeof limits;
export type Mode = "elastic" | "inelastic";
export type Parameters = Record<Parameter, number> & { mode: Mode };
export type Cart = "left" | "right";
export type Pair = Record<Cart, number>;
export type Metric = "momentum" | "kinetic";

export const defaults: Parameters = {
  leftMass: 1.5,
  rightMass: 1,
  leftVelocity: 2.5,
  rightVelocity: -1,
  mode: "elastic",
};

export const presets = {
  headOn: defaults,
  exchange: { ...defaults, leftMass: 1, rightMass: 1, rightVelocity: 0 },
  tandem: { ...defaults, leftVelocity: 1.5, rightVelocity: 1.5 },
} as const;
export type Preset = keyof typeof presets;

export const width = 1;
const initial: Pair = { left: -1.8, right: 1.8 };
const gap = initial.right - initial.left - width;
const postWindow = 2.05;
const noContactWindow = 2.75;

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function parameterValue(key: Parameter, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value))
    return defaults[key];
  const { min, max, step } = limits[key];
  return min + Math.round((clamp(value, min, max) - min) / step) * step;
}

function quantities(mass: Pair, velocity: Pair) {
  const inventory = (left: number, right: number) => ({
    left,
    right,
    total: left + right,
  });
  return {
    velocity,
    momentum: inventory(mass.left * velocity.left, mass.right * velocity.right),
    kinetic: inventory(
      (mass.left * velocity.left ** 2) / 2,
      (mass.right * velocity.right ** 2) / 2,
    ),
  };
}

export function makeTrial(parameters: Parameters) {
  const mass = { left: parameters.leftMass, right: parameters.rightMass };
  const incoming = {
    left: parameters.leftVelocity,
    right: parameters.rightVelocity,
  };
  const closing = incoming.left - incoming.right;
  const contact = closing > 0 ? gap / closing : null;
  const duration = contact === null ? noContactWindow : contact + postWindow;
  const before = quantities(mass, incoming);
  const massSum = mass.left + mass.right;
  const centerVelocity = before.momentum.total / massSum;
  const elasticity = parameters.mode === "elastic" ? 1 : 0;
  const outgoing = {
    left: centerVelocity - (elasticity * closing * mass.right) / massSum,
    right: centerVelocity + (elasticity * closing * mass.left) / massSum,
  };
  const after = contact === null ? null : quantities(mass, outgoing);
  const contactLeft = initial.left + incoming.left * (contact ?? 0);
  const transfer =
    contact === null
      ? null
      : ((((1 - elasticity ** 2) * mass.left * mass.right) / massSum) *
          closing ** 2) /
        2;

  function at(time: number) {
    if (contact === null || after === null || time < contact) {
      return {
        ...before,
        position: {
          left: initial.left + incoming.left * time,
          right: initial.right + incoming.right * time,
        },
        phase: contact === null ? ("noContact" as const) : ("before" as const),
        coupled: false,
      };
    }
    const since = time - contact;
    return {
      ...after,
      position: {
        left: contactLeft + outgoing.left * since,
        right: contactLeft + width + outgoing.right * since,
      },
      phase: "after" as const,
      coupled: elasticity === 0,
    };
  }

  const end = at(duration).position;
  return {
    mass,
    before,
    after,
    at,
    contact,
    duration,
    transfer,
    preContact: contact === null ? null : contact - Math.min(0.12, contact / 4),
    maximumGap: Math.max(initial.right - initial.left, end.right - end.left),
  };
}

export type Trial = ReturnType<typeof makeTrial>;
export type Sample = ReturnType<Trial["at"]>;
