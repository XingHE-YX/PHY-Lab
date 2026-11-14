import { svg } from "lit";
import {
  derived,
  format,
  type LCParameters,
  type LCState,
} from "../model/physics";
import type { LCTexts } from "../locales/messages";

/** Dimensionless mechanical analogue: x/A = q/Qm, v/vm = -I/Im. */
export function spring(p: LCParameters, s: LCState, t: LCTexts) {
  const d = derived(p),
    position = s.q / Math.abs(d.charge),
    velocity = -s.current / d.current;
  const center = 180 + position * 70,
    start = 39,
    end = center - 15;
  const coils = Array.from(
    { length: 19 },
    (_, i) =>
      `L${start + ((end - start) * i) / 18} ${i === 0 || i === 18 ? 62 : i % 2 ? 54 : 70}`,
  ).join(" ");
  return svg`<svg class="spring-analogy" viewBox="0 0 332 118" role="img" aria-label=${`${t.spring}; ${t.springPosition} ${format(position)}; ${t.springVelocity} ${format(velocity)}`} data-position=${position} data-velocity=${velocity}>
    <defs>
      <radialGradient id="lc-mass" cx=".32" cy=".28" r=".8"><stop stop-color="var(--surface)"/><stop offset=".35" stop-color="var(--blue)"/><stop offset="1" stop-color="var(--primary)"/></radialGradient>
      <marker id="lc-v-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5L0 5Z" fill="var(--green)"/></marker>
    </defs>
    <text x="8" y="13" class="axis-text">${t.spring}</text>
    <text x="324" y="13" text-anchor="end" class="axis-text">x/A = ${format(position)} · v/vₘ = ${format(velocity)}</text>
    <path d="M30 39V81M30 40L21 49M30 52L21 61M30 64L21 73M30 76L21 85" fill="none" stroke="var(--muted)"/>
    <path d="M50 82H302M180 35V87" stroke="var(--border)" stroke-dasharray="3 4"/>
    <path d=${`M30 62H${start} ${coils}`} fill="none" stroke="var(--muted)" stroke-width="2" stroke-linejoin="round"/>
    <circle cx=${center} cy="62" r="14" fill="url(#lc-mass)" stroke="var(--blue)"/>
    <text x=${center} y="66" fill="var(--surface)" font-size="11" text-anchor="middle">m</text>
    ${Math.abs(velocity) > 1e-6 ? svg`<path class="spring-velocity" data-direction=${Math.sign(velocity)} d=${`M${center} 100l${velocity * 40} 0`} stroke="var(--green)" stroke-width="2" marker-end="url(#lc-v-arrow)"/>` : ""}
    ${[
      [110, "−A"],
      [180, "0"],
      [250, "+A"],
    ].map(
      ([x, label]) =>
        svg`<text x=${x} y="92" class="axis-text" text-anchor="middle">${label}</text>`,
    )}
  </svg>`;
}
