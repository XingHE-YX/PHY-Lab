import { solvePlate } from "../model/plate";
import { format } from "prettier";
const start = performance.now(),
  plate = solvePlate(18, 24);
await Bun.write(
  new URL("../model/modes.json", import.meta.url),
  await format(
    JSON.stringify({
      degree: plate.degree,
      residual: plate.residual,
      modes: plate.modes.map((m) => ({
        eigenvalue: m.eigenvalue,
        coefficients: Array.from(m.coefficients),
      })),
    }),
    { parser: "json" },
  ),
);
console.log(
  `Generated ${plate.modes.length} thin-plate modes in ${Math.round(performance.now() - start)} ms; projected relative residual ${plate.residual}`,
);
