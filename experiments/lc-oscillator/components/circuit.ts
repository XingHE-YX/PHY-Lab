import { svg } from "lit";
import {
  derived,
  format,
  type LCParameters,
  type LCState,
} from "../model/physics";
import type { LCTexts } from "../locales/messages";

function fieldChevron(x: number, y: number, dirY: number, scale = 1) {
  const tip = 3.2 * dirY * scale,
    base = -2.3 * dirY * scale,
    notch = -1 * dirY * scale,
    wing = 2.7 * scale;
  return svg`<path d=${`M${x} ${y + tip}L${x + wing} ${y + base}L${x} ${y + notch}L${x - wing} ${y + base}Z`} fill="var(--green)" stroke="none"/>`;
}

function chargeSign(x: number, y: number, positive: boolean) {
  return svg`<g class="charge-badge">
    <circle cx=${x} cy=${y} r="6.4" fill="var(--primary-soft)" stroke="var(--blue)" stroke-width="1"/>
    <path d=${positive ? `M${x - 3} ${y}H${x + 3}M${x} ${y - 3}V${y + 3}` : `M${x - 3} ${y}H${x + 3}`} stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/>
  </g>`;
}

export function circuit(
  p: LCParameters,
  s: LCState,
  closed: boolean,
  layers: { fields: boolean; current: boolean },
  t: LCTexts,
  connect: () => void,
  shock?: { voltage: number; power: number },
) {
  const d = derived(p),
    charge = d.charge === 0 ? 0 : s.q / Math.abs(d.charge),
    current = d.current === 0 ? 0 : s.current / d.current;
  const qSign = Math.sign(charge),
    iSign = Math.sign(current),
    qStrength = Math.abs(charge),
    iStrength = Math.abs(current);

  // 8-turn cylindrical helix centered at (500, 210).
  // Front turns advance left-to-right (x: 466 -> 534) as y increases,
  // so I > 0 (top-to-bottom) gives B pointing upward (-y) by the right-hand grip rule.
  const turns = 8,
    pitch = 16,
    yStart = 150;
  const backWindings =
    `M500 140C500 144 466 145 466 ${yStart}` +
    Array.from({ length: turns - 1 }, (_, i) => {
      const y = yStart + i * pitch;
      return `M534 ${y + 8}C534 ${y + 10.8} 466 ${y + 13.2} 466 ${y + 16}`;
    }).join("") +
    `M534 ${yStart + (turns - 1) * pitch + 8}C534 275 500 276 500 280`;

  const frontWindings = Array.from({ length: turns }, (_, i) => {
    const y = yStart + i * pitch;
    return `M466 ${y}C466 ${y + 2.8} 534 ${y + 5.2} 534 ${y + 8}`;
  }).join("");

  const frontShine = Array.from({ length: turns }, (_, i) => {
    const y = yStart + i * pitch;
    return `M473 ${y + 0.7}C487 ${y + 2.2} 513 ${y + 4.4} 527 ${y + 5.9}`;
  }).join("");

  const wirePath =
    "M186 173V94Q186 82 198 82H306M378 82H488Q500 82 500 94V133M500 287V326Q500 338 488 338H198Q186 338 186 326V247";

  const arrow = (
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: string,
    marker: string,
    width = 2.1,
  ) =>
    svg`<path d=${`M${x} ${y}l${dx} ${dy}`} fill="none" stroke=${color} stroke-width=${width} stroke-linecap="round" marker-end=${`url(#${marker})`}/>`;

  const eHalf = 5.5 + 15 * qStrength;
  const iHalf = 13 + 21 * iStrength;

  return svg`<svg class="circuit-scene" viewBox="0 0 700 410" role="group" aria-label=${t.circuit} data-q=${s.q} data-current=${s.current} data-voltage=${s.voltage}>
    <defs>
      <pattern id="lc-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="var(--border)" stroke-width="0.65"/>
      </pattern>
      <linearGradient id="lc-plate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--plate-hi)"/>
        <stop offset="0.45" stop-color="var(--plate-mid)"/>
        <stop offset="1" stop-color="var(--plate-lo)"/>
      </linearGradient>
      <linearGradient id="lc-plate-idle" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--surface)"/>
        <stop offset="1" stop-color="var(--border)"/>
      </linearGradient>
      <linearGradient id="lc-e-glow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--blue)" stop-opacity="0.32"/>
        <stop offset="0.5" stop-color="var(--blue)" stop-opacity="0.12"/>
        <stop offset="1" stop-color="var(--blue)" stop-opacity="0.32"/>
      </linearGradient>
      <radialGradient id="lc-b-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="var(--green)" stop-opacity="0.34"/>
        <stop offset="0.65" stop-color="var(--green)" stop-opacity="0.09"/>
        <stop offset="1" stop-color="var(--green)" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="lc-core" gradientUnits="userSpaceOnUse" x1="476" y1="0" x2="524" y2="0">
        <stop offset="0" stop-color="var(--core-lo)"/>
        <stop offset="0.32" stop-color="var(--core-hi)"/>
        <stop offset="0.72" stop-color="var(--core-mid)"/>
        <stop offset="1" stop-color="var(--core-lo)"/>
      </linearGradient>
      <linearGradient id="lc-flange" gradientUnits="userSpaceOnUse" x1="469" y1="0" x2="531" y2="0">
        <stop offset="0" stop-color="var(--flange-lo)"/>
        <stop offset="0.3" stop-color="var(--flange-hi)"/>
        <stop offset="1" stop-color="var(--flange-lo)"/>
      </linearGradient>
      <linearGradient id="lc-coil" gradientUnits="userSpaceOnUse" x1="466" y1="0" x2="534" y2="0">
        <stop offset="0" stop-color="var(--coil-lo)"/>
        <stop offset="0.28" stop-color="var(--coil-hi)"/>
        <stop offset="0.64" stop-color="var(--coil-mid)"/>
        <stop offset="0.88" stop-color="var(--coil-lo)"/>
        <stop offset="1" stop-color="var(--coil-edge)"/>
      </linearGradient>
      <linearGradient id="lc-coil-back" gradientUnits="userSpaceOnUse" x1="466" y1="0" x2="534" y2="0">
        <stop offset="0" stop-color="var(--coil-edge)"/>
        <stop offset="0.5" stop-color="var(--coil-back)"/>
        <stop offset="1" stop-color="var(--coil-edge)"/>
      </linearGradient>
      <marker id="lc-e-arrow" markerWidth="6.5" markerHeight="6.5" refX="5.2" refY="3.25" orient="auto">
        <path d="M0 0.5L6.2 3.25L0 6L1.4 3.25Z" fill="var(--blue)"/>
      </marker>
      <marker id="lc-i-arrow" markerWidth="6.5" markerHeight="6.5" refX="5.2" refY="3.25" orient="auto">
        <path d="M0 0.5L6.2 3.25L0 6L1.4 3.25Z" fill="var(--green)"/>
      </marker>
    </defs>

    <g class="circuit-grid">
      <rect x="24" y="38" width="652" height="334" rx="6" fill="url(#lc-grid)" opacity="0.62"/>
      <rect x="24" y="38" width="652" height="334" rx="6" fill="none" stroke="var(--border)" stroke-width="1" opacity="0.8"/>
    </g>

    ${
      iStrength > 1e-5
        ? svg`<path d=${wirePath} fill="none" stroke="var(--green)" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" opacity=${0.06 + 0.16 * iStrength}/>`
        : ""
    }
    <path class="wire" d=${wirePath} fill="none" stroke="var(--muted)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>

    <g class="circuit-switch" role="button" tabindex="0" aria-label=${closed ? t.openSwitch : t.close} aria-pressed=${closed} @click=${connect} @keydown=${(
      e: KeyboardEvent,
    ) => {
      if (["Enter", " "].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat) connect();
      }
    }}>
      <rect class="switch-hitbox" x="284" y="42" width="116" height="68" rx="6" fill="none"/>
      ${!closed && shock && shock.power > 1e-8 ? svg`<path class="switch-arc" data-power=${shock.power} d="M372 49L367 57L379 64L371 70L379 82" fill="none" stroke="var(--red)" stroke-width=${1 + 2 * Math.min(1, Math.sqrt(shock.power / 200))} opacity=${0.3 + 0.7 * Math.min(1, Math.sqrt(shock.power / 200))}/>` : ""}
      ${
        !closed
          ? svg`<path d="M366 52A68 68 0 0 1 378 80" fill="none" stroke="var(--border)" stroke-width="1.3" stroke-dasharray="3 3"/>`
          : svg`<line x1="306" y1="82" x2="378" y2="82" stroke="var(--green)" stroke-width="6.5" stroke-linecap="round" opacity="0.16"/>`
      }
      <path class="switch-contact" d=${closed ? "M306 82L384 82" : "M306 82L371 49"} stroke="var(--text)" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx=${closed ? 385 : 372.5} cy=${closed ? 82 : 48.2} r="3.2" fill=${closed ? "var(--green)" : "var(--primary)"}/>
      <circle cx="306" cy="82" r="5" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/>
      <circle cx="306" cy="82" r="1.8" fill="var(--text)"/>
      <circle cx="378" cy="82" r="5" fill="var(--surface)" stroke=${closed ? "var(--green)" : "var(--text)"} stroke-width="2"/>
      <circle cx="378" cy="82" r="1.8" fill=${closed ? "var(--green)" : "var(--muted)"}/>
      <text x="342" y="104" text-anchor="middle" class="axis-text switch-label">S</text>
      ${shock ? svg`<text x="342" y="126" text-anchor="middle" class="axis-text switch-voltage-label">Uₛ ${format(shock.voltage, 1)} V</text>` : ""}
      <title>${t.switchHint}</title>
    </g>

    <g class="capacitor" data-polarity=${qStrength < 1e-8 ? 0 : qSign}>
      ${
        qStrength > 1e-8
          ? svg`<rect x="134" y="182" width="104" height="56" rx="3" fill="url(#lc-e-glow)" opacity=${0.18 + 0.82 * qStrength}/>`
          : ""
      }
      <rect x="179" y="168" width="14" height="6" rx="1.5" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.4"/>
      <rect x="179" y="246" width="14" height="6" rx="1.5" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.4"/>
      <rect x="130" y="173" width="112" height="9" rx="2.5" fill=${qStrength > 1e-8 ? "url(#lc-plate)" : "url(#lc-plate-idle)"} stroke=${qStrength > 1e-8 ? "var(--blue)" : "var(--muted)"} stroke-width="1.4"/>
      <line x1="133" y1="175.3" x2="239" y2="175.3" stroke="var(--surface)" stroke-opacity="0.55" stroke-width="1" stroke-linecap="round"/>
      <rect x="130" y="238" width="112" height="9" rx="2.5" fill=${qStrength > 1e-8 ? "url(#lc-plate)" : "url(#lc-plate-idle)"} stroke=${qStrength > 1e-8 ? "var(--blue)" : "var(--muted)"} stroke-width="1.4"/>
      <line x1="133" y1="240.3" x2="239" y2="240.3" stroke="var(--surface)" stroke-opacity="0.55" stroke-width="1" stroke-linecap="round"/>
      ${
        qStrength > 1e-8
          ? svg`<g opacity=${0.38 + 0.62 * qStrength}>${[142, 164, 186, 208, 230].map((x) => svg`${chargeSign(x, 158, qSign > 0)}${chargeSign(x, 262, qSign < 0)}`)}</g>`
          : ""
      }
      <text x="110" y="201" text-anchor="end" class="component-label">C</text>
      <text x="110" y="221" text-anchor="end" class="axis-text">${format(p.capacitance * 1e6, 0)} μF</text>
      <rect x="142" y="279" width="88" height="24" rx="4" fill="var(--surface)" stroke="var(--border)"/>
      <text x="186" y="295" text-anchor="middle" class="voltage-label">${format(s.voltage)} V</text>
    </g>

    ${
      layers.fields && qStrength > 1e-5
        ? svg`<g class="electric-field" data-direction=${qSign} opacity=${0.28 + 0.72 * qStrength}>
      <path d=${`M132 ${210 - qSign * eHalf}Q121 210 132 ${210 + qSign * eHalf}M240 ${210 - qSign * eHalf}Q251 210 240 ${210 + qSign * eHalf}`} fill="none" stroke="var(--blue)" stroke-width="1.2" stroke-dasharray="2.5 2.5" opacity="0.55"/>
      ${[144, 165, 186, 207, 228].map((x) => arrow(x, 210 - qSign * eHalf, 0, 2 * qSign * eHalf, "var(--blue)", "lc-e-arrow", 1.85))}
      <text x="258" y="214" fill="var(--blue)" class="field-label">E</text>
    </g>`
        : ""
    }

    ${
      iStrength > 1e-5
        ? svg`<ellipse cx="500" cy="210" rx="68" ry="96" fill="url(#lc-b-glow)" opacity=${0.25 + 0.75 * iStrength}/>`
        : ""
    }

    <g class="inductor-assembly">
      <g class="inductor-back" fill="none" stroke-linecap="round">
        <path d=${backWindings} stroke="var(--coil-edge)" stroke-width="8.4"/>
        <path d=${backWindings} stroke="url(#lc-coil-back)" stroke-width="6.2"/>
      </g>

      <g class="inductor-core">
        <rect x="493" y="131" width="14" height="8" rx="1.8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.4"/>
        <rect x="493" y="281" width="14" height="8" rx="1.8" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.4"/>
        <rect x="476" y="144" width="48" height="132" fill="url(#lc-core)" stroke="var(--core-stroke)" stroke-width="1.1"/>
        ${
          iStrength > 1e-5
            ? svg`<rect x="479" y="145" width="42" height="130" fill="var(--green)" opacity=${0.06 + 0.18 * iStrength}/>`
            : ""
        }
        <line x1="487" y1="146" x2="487" y2="274" stroke="var(--surface)" stroke-opacity="0.45" stroke-width="1.4"/>
        <rect x="469" y="138" width="62" height="7" rx="2.5" fill="url(#lc-flange)" stroke="var(--core-stroke)" stroke-width="1.2"/>
        <rect x="469" y="275" width="62" height="7" rx="2.5" fill="url(#lc-flange)" stroke="var(--core-stroke)" stroke-width="1.2"/>
      </g>

      ${
        layers.fields && iStrength > 1e-5
          ? svg`<g class="magnetic-field" data-direction=${iSign} fill="none" stroke="var(--green)" opacity=${0.28 + 0.68 * iStrength}>
        <path d="M483 282V138C483 88 404 96 404 210C404 324 483 332 483 282Z" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.72"/>
        <path d="M517 282V138C517 88 596 96 596 210C596 324 517 332 517 282Z" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.72"/>
        <path d="M491 282V138C491 103 434 110 434 210C434 310 491 317 491 282Z" stroke-width="1.45"/>
        <path d="M509 282V138C509 103 566 110 566 210C566 310 509 317 509 282Z" stroke-width="1.45"/>
        <line x1="500" y1="138" x2="500" y2="282" stroke-width="1.6"/>
        ${fieldChevron(404, 210, iSign, 1.05)}
        ${fieldChevron(434, 210, iSign, 1.15)}
        ${fieldChevron(566, 210, iSign, 1.15)}
        ${fieldChevron(596, 210, iSign, 1.05)}
        ${fieldChevron(491, 210, -iSign, 0.92)}
        ${fieldChevron(500, 210, -iSign, 1)}
        ${fieldChevron(509, 210, -iSign, 0.92)}
        <text x="614" y="244" fill="var(--green)" stroke="none" class="field-label">B ∝ I</text>
      </g>`
          : ""
      }

      <g class="inductor" fill="none" stroke-linecap="round">
        <path d=${frontWindings} stroke="var(--coil-edge)" stroke-width="9"/>
        <path d=${frontWindings} stroke="url(#lc-coil)" stroke-width="6.8"/>
        <path d=${frontShine} stroke="var(--coil-shine)" stroke-width="1.35" opacity="0.7"/>
      </g>
    </g>

    <text x="614" y="201" class="component-label">L</text>
    <text x="614" y="221" class="axis-text">${format(p.inductance * 1e3, 0)} mH</text>

    ${
      closed && layers.current && iStrength > 1e-5
        ? svg`<g class="current-arrows" data-direction=${iSign} opacity=${0.42 + 0.58 * iStrength}>
      ${arrow(434 - iSign * iHalf, 63, 2 * iSign * iHalf, 0, "var(--green)", "lc-i-arrow", 2.2)}
      ${arrow(342 + iSign * iHalf, 357, -2 * iSign * iHalf, 0, "var(--green)", "lc-i-arrow", 2.2)}
      ${fieldChevron(186, 128, -iSign, 1.05)}
      ${fieldChevron(186, 292, -iSign, 1.05)}
      <text x="434" y="51" text-anchor="middle" fill="var(--green)" class="field-label">I</text>
    </g>`
        : ""
    }

    <text x="28" y="393" class="axis-text">${t.convention}</text>
  </svg>`;
}
