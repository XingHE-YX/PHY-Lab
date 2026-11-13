import table from "./modes.json" with { type: "json" };
import type { PlateModes } from "./plate";
// Geometry and Poisson ratio are fixed; dimensional changes scale these modes.
// The expensive eigensolve is reproducible offline, never part of animation.
export const plate: PlateModes = {
  ...table,
  modes: table.modes.map((m) => ({
    ...m,
    coefficients: new Float64Array(m.coefficients),
  })),
};
export const PRESETS = [4, 7, 8, 11, 12, 18, 20, 21];
