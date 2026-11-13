import { svg } from "lit";
import {
  derived,
  format,
  type LCParameters,
  type LCState,
} from "../model/physics";
import type { LCTexts } from "../locales/messages";
export function circuit(
  p: LCParameters,
  s: LCState,
  closed: boolean,
  layers: { fields: boolean; current: boolean },
  t: LCTexts,
  connect: () => void,
) {
  const d = derived(p),
    charge = d.charge === 0 ? 0 : s.q / Math.abs(d.charge),
    current = d.current === 0 ? 0 : s.current / d.current;
  const qSign = Math.sign(charge),
    iSign = Math.sign(current),
    qStrength = Math.abs(charge),
    iStrength = Math.abs(current);
  const coils = Array.from({ length: 7 }, (_, i) => {
    const y = 143 + i * 20;
    return `M500 ${y}c-44 -20 -44 31 0 20c44 -11 44 -31 0 -20`;
  }).join("");
  const arrow = (
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: string,
    marker: string,
  ) =>
    svg`<path d=${`M${x} ${y}l${dx} ${dy}`} stroke=${color} stroke-width="2.4" marker-end=${`url(#${marker})`}/>`;
  return svg`<svg class="circuit-scene" viewBox="0 0 700 410" role="group" aria-label=${t.circuit} data-q=${s.q} data-current=${s.current} data-voltage=${s.voltage}>
    <defs>
      <linearGradient id="lc-plate" x2="0" y2="1"><stop stop-color="var(--blue)"/><stop offset=".5" stop-color="var(--primary-soft)"/><stop offset="1" stop-color="var(--blue)"/></linearGradient>
      <linearGradient id="lc-coil"><stop stop-color="var(--muted)"/><stop offset=".4" stop-color="var(--text)"/><stop offset=".7" stop-color="var(--muted)"/><stop offset="1" stop-color="var(--text)"/></linearGradient>
      <marker id="lc-e-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="var(--blue)"/></marker>
      <marker id="lc-i-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="var(--green)"/></marker>
    </defs>
    <g class="circuit-grid" stroke="var(--border)" stroke-dasharray="2 7" opacity=".55">
      ${[100, 200, 300, 400, 500, 600].map((x) => svg`<path d=${`M${x} 25V385`}/>`)}
      ${[80, 160, 240, 320].map((y) => svg`<path d=${`M55 ${y}H645`}/>`)}
    </g>
    <text x="36" y="28" class="scene-caption">LC / ${closed ? "OSCILLATION" : "INITIAL STATE"}</text>
    <path class="wire" d="M180 177V80H280M350 80H500V143M500 283V340H180V243" fill="none" stroke="var(--muted)" stroke-width="3" stroke-linecap="round"/>
    <g class="circuit-switch" role="button" tabindex="0" aria-label=${closed ? t.charge : t.close} @click=${connect} @keydown=${(
      e: KeyboardEvent,
    ) => {
      if (["Enter", " "].includes(e.key)) {
        e.preventDefault();
        connect();
      }
    }}>
      <rect x="264" y="36" width="104" height="66" fill="transparent"/>
      <circle cx="280" cy="80" r="4" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/>
      <circle cx="350" cy="80" r="4" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/>
      <path class="switch-contact" d=${closed ? "M280 80L350 80" : "M280 80L339 48"} stroke="var(--text)" stroke-width="3" stroke-linecap="round"/>
      <text x="316" y="117" text-anchor="middle" class="axis-text">S</text>
      <title>${t.switchHint}</title>
    </g>
    <g class="capacitor" data-polarity=${qStrength < 1e-8 ? 0 : qSign}>
      <rect x="128" y="177" width="104" height="7" rx="2" fill="url(#lc-plate)" stroke="var(--blue)"/>
      <rect x="128" y="236" width="104" height="7" rx="2" fill="url(#lc-plate)" stroke="var(--blue)"/>
      ${qStrength > 1e-8 ? svg`<g fill="var(--blue)" opacity=${0.35 + 0.65 * qStrength} font-size="20" text-anchor="middle">${[140, 160, 180, 200, 220].map((x) => svg`<text x=${x} y="168">${qSign > 0 ? "+" : "−"}</text><text x=${x} y="268">${qSign > 0 ? "−" : "+"}</text>`)}</g>` : ""}
      <text x="102" y="204" text-anchor="end" class="component-label">C</text>
      <text x="102" y="225" text-anchor="end" class="axis-text">${format(p.capacitance * 1e6, 0)} μF</text>
      <text x="180" y="300" text-anchor="middle" class="voltage-label">${format(s.voltage)} V</text>
    </g>
    ${
      layers.fields && qStrength > 1e-5
        ? svg`<g class="electric-field" data-direction=${qSign} opacity=${0.2 + 0.8 * qStrength}>
      ${[143, 161, 180, 199, 217].map((x) => arrow(x, qSign > 0 ? 192 : 228, 0, qSign * (8 + 27 * qStrength), "var(--blue)", "lc-e-arrow"))}
      <text x="252" y="211" fill="var(--blue)" font-size="13">E</text>
    </g>`
        : ""
    }
    ${
      layers.fields && iStrength > 1e-5
        ? svg`<g class="magnetic-field" data-direction=${iSign} fill="none" stroke="var(--green)" opacity=${0.2 + 0.65 * iStrength}>
      ${[52, 75, 94].map((r) => svg`<path d=${`M500 128C${500 - r} 128 ${500 - r} 298 500 298C${500 + r} 298 ${500 + r} 128 500 128`} stroke-width="1"/>`)}
      ${arrow(500, 214 + 22 * iSign * iStrength, 0, -44 * iSign * iStrength, "var(--green)", "lc-i-arrow")}
      <text x="604" y="214" fill="var(--green)" stroke="none" font-size="13">B ∝ I</text>
    </g>`
        : ""
    }
    <path class="inductor" d=${coils} fill="none" stroke="url(#lc-coil)" stroke-width="4" stroke-linecap="round"/>
    <text x="551" y="188" class="component-label">L</text>
    <text x="551" y="209" class="axis-text">${format(p.inductance * 1e3, 0)} mH</text>
    ${
      closed && layers.current && iStrength > 1e-5
        ? svg`<g class="current-arrows" data-direction=${iSign}>
      ${arrow(398 - iSign * 25 * iStrength, 62, iSign * 50 * iStrength, 0, "var(--green)", "lc-i-arrow")}
      ${arrow(340 + iSign * 25 * iStrength, 358, -iSign * 50 * iStrength, 0, "var(--green)", "lc-i-arrow")}
      <text x="401" y="45" text-anchor="middle" fill="var(--green)" font-size="12">I</text>
    </g>`
        : ""
    }
    <text x="36" y="393" class="axis-text">${t.convention}</text>
  </svg>`;
}
