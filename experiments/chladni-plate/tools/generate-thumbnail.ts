import { writeFile } from "node:fs/promises";
import { plate } from "../model/catalog";
import { frequency } from "../model/plate";
import { field, response } from "../model/response";
import { normalizeSnapshot } from "../model/snapshot";
import { SandSimulation } from "../model/sand";

// Use the experiment's actual mode and grain state, not hand-drawn nodal lines.
const state = normalizeSnapshot(null),
  p = state.params;
p.frequency = frequency(plate.modes[20], p);
const sand = new SandSimulation(
  field(plate, response(plate, p)),
  state.seed,
  2400,
  p.frequency,
);
sand.seek(72);
const dots: string[] = [];
for (let i = 0; i < sand.positions.length; i += 2) {
  const x = sand.positions[i],
    y = sand.positions[i + 1];
  if (Math.abs(x) <= 1 && Math.abs(y) <= 1)
    dots.push(`M${(x * 132).toFixed(2)},${(y * 132).toFixed(2)}h.1`);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <title>Chladni figures</title><desc>Mode 21, 72 cycles; particles computed by the experiment model.</desc>
  <rect width="640" height="360" fill="#121519"/>
  <g transform="translate(320 183) rotate(-10)">
    <rect x="-132" y="-132" width="264" height="264" rx="2" fill="#20262c" stroke="#56616c"/>
    <path d="${dots.join("")}" fill="none" stroke="#e7dfc6" stroke-width="1.25" stroke-linecap="round"/>
    <rect x="-12" y="-12" width="24" height="24" rx="2" fill="#64707c" stroke="#92a0ae"/><circle r="2.5" fill="#b9c3cc"/>
    <path d="M90 43l5 7-5 7-5-7z" fill="#397dff"/>
  </g>
  <text x="24" y="28" fill="#92a0ae" font-family="monospace" font-size="10" letter-spacing="2">CHLADNI / TWO-DIMENSIONAL WAVES</text>
</svg>`;
await writeFile(new URL("../assets/thumbnail.svg", import.meta.url), svg);
