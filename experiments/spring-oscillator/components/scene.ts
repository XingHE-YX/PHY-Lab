import { svg } from "lit";
import type { Locale } from "../../../src/infra/platform/contract";
import {
  format,
  phaseAt,
  stateAt,
  type Parameters,
  type PhysicsState,
} from "../model/physics";
import { sceneFrame } from "../model/scene";
import { texts } from "../locales/messages";

interface SceneOptions {
  params: Parameters;
  state: PhysicsState;
  locale: Locale;
  velocity: boolean;
  acceleration: boolean;
  phasor: boolean;
  time: number;
  pointerDown: (event: PointerEvent) => void;
  pointerMove: (event: PointerEvent) => void;
  release: () => void;
  cancel: () => void;
  keyboard: (event: KeyboardEvent) => void;
  phasePointerDown: (event: PointerEvent) => void;
  phasePointerMove: (event: PointerEvent) => void;
  phaseRelease: () => void;
  phaseKeyboard: (event: KeyboardEvent) => void;
}

export function renderScene(options: SceneOptions) {
  const { params: p, state: s, locale, velocity, acceleration } = options;
  const t = texts(locale);
  const { originX: ox, originY: oy, scale, width, height } = sceneFrame;
  const x = ox + s.x * scale;
  const radius = p.A * scale;
  // v/ω = −A sin θ: use the same instantaneous state as the physical mass.
  const tipY = oy + (s.v / s.omega) * scale;
  const angle = phaseAt(p, options.time);
  const arc = Math.min(40, radius * 0.35);
  const points = Array.from({ length: 29 }, (_, i) => {
    const px = 86 + ((x - 25 - 86) * i) / 28;
    return px + "," + (i === 0 || i === 28 ? oy : oy + (i % 2 ? 9 : -9));
  }).join(" ");
  const vLength = (s.v / (p.A * s.omega || 1)) * 100;
  const aLength = (s.a / (p.A * s.omega ** 2 || 1)) * 100;
  const visible = options.phasor && radius > 0;

  return svg`
    <svg class="scene" viewBox=${`0 0 ${width} ${height}`} role="group" aria-label=${t.title}>
      <defs>
        <pattern id="lab-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="var(--border)" stroke-width=".5"/></pattern>
        <radialGradient id="mass-light" cx="32%" cy="25%" r="78%"><stop offset="0" stop-color="#b4d3ff"/><stop offset=".22" stop-color="#5a98ff"/><stop offset=".55" stop-color="#286eed"/><stop offset=".85" stop-color="#124bc0"/><stop offset="1" stop-color="#103778"/></radialGradient>
        <linearGradient id="spring-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--muted)"/><stop offset=".5" stop-color="var(--text)"/><stop offset="1" stop-color="var(--muted)"/></linearGradient>
        <linearGradient id="wall-metal"><stop stop-color="var(--subtle)"/><stop offset="1" stop-color="var(--border)"/></linearGradient>
        <filter id="ball-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
        <marker id="v-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="var(--green)"/></marker>
        <marker id="a-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="var(--red)"/></marker>
        <marker id="phase-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8" fill="var(--blue)"/></marker>
        <marker id="axis-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="var(--muted)"/></marker>
      </defs>
      <rect x="20" y="20" width="760" height="520" fill="url(#lab-grid)" opacity=".65"/>
      <path d=${`M110 ${oy}H754`} stroke="var(--border)" marker-end="url(#axis-arrow)"/>
      <path d=${`M${ox} ${oy - 50}v100`} stroke="var(--border)" stroke-dasharray="4 5"/>
      <circle cx=${ox} cy=${oy} r="2.5" fill="var(--muted)" pointer-events="none"/>
      <text x="766" y=${oy + 5} fill="var(--muted)" font-family="Georgia, serif" font-style="italic" font-size="17">x</text>

      <g id="phasor-layer" class="phasor-layer" aria-hidden=${String(!visible)}>
        <text x=${ox - 14} y=${oy + 23} fill="var(--muted)" font-family="Georgia, serif" font-style="italic" font-size="17">O</text>
        <path d=${`M${ox} 524V22`} stroke="var(--muted)" opacity=".6" stroke-width="1" marker-end="url(#axis-arrow)"/>
        <text x=${ox + 16} y="28" fill="var(--muted)" font-family="Georgia, serif" font-style="italic" font-size="17">y</text>
        <circle class="reference-circle" cx=${ox} cy=${oy} r=${radius} fill="none" stroke="var(--blue)" stroke-opacity=".55" stroke-width="1.2" stroke-dasharray="7 6"/>
        ${
          radius >= 45
            ? Array.from({ length: 8 }, (_, i) => {
                const theta = (i * Math.PI) / 4;
                return svg`<path d=${`M${ox + (radius - 4) * Math.cos(theta)} ${oy - (radius - 4) * Math.sin(theta)}L${ox + (radius + 4) * Math.cos(theta)} ${oy - (radius + 4) * Math.sin(theta)}`} stroke="var(--muted)" stroke-width="1"/>
            ${i % 2 === 0 ? svg`<text x=${ox + (radius + 19) * Math.cos(theta)} y=${oy - (radius + 19) * Math.sin(theta) + 4} text-anchor="middle" fill="var(--muted)" font-family="var(--mono)" font-size="11">${i * 45}°</text>` : ""}`;
              })
            : ""
        }
        ${radius > 55 ? svg`<path d=${`M${ox + radius * 0.74} ${oy - radius * 0.74}l24 -32h12`} fill="none" stroke="var(--muted)" stroke-opacity=".6" stroke-width=".8"/><text x=${ox + radius * 0.74 + 42} y=${oy - radius * 0.74 - 28} fill="var(--muted)" font-size="12">${t.referenceCircle}</text>` : ""}
        <circle cx=${ox} cy=${oy} r=${radius} fill="none" stroke="transparent" stroke-width="16" class="phase-handle"
          @pointerdown=${options.phasePointerDown} @pointermove=${options.phasePointerMove}
          @pointerup=${options.phaseRelease} @pointercancel=${options.phaseRelease} @lostpointercapture=${options.phaseRelease}/>
        <line class="phase-projection" x1=${x} y1=${tipY} x2=${x} y2=${oy} stroke="var(--blue)" stroke-opacity=".65" stroke-dasharray="5 5" stroke-width="1.5"/>
        <path class="phase-vector" d=${`M${ox} ${oy}L${x} ${tipY}`} fill="none" stroke="var(--blue)" stroke-width="2" marker-end="url(#phase-arrow)"/>
        ${
          radius > 55 && angle > 0.02
            ? svg`
          <path class="phase-arc" d=${`M${ox + arc} ${oy}A${arc} ${arc} 0 ${angle > Math.PI ? 1 : 0} 0 ${ox + arc * Math.cos(angle)} ${oy - arc * Math.sin(angle)}`} fill="none" stroke="var(--blue)" stroke-opacity=".8" stroke-width="1.3"/>
          <text x=${ox + (arc + 14) * Math.cos(angle / 2)} y=${oy - (arc + 14) * Math.sin(angle / 2) + 4} text-anchor="middle" fill="var(--blue)" font-size="13" font-family="Georgia, serif" font-style="italic">θ</text>
        `
            : ""
        }
        ${radius > 55 && Math.abs(tipY - oy) > 30 ? svg`<text x=${ox + (x - ox) * 0.7 - 16} y=${oy + (tipY - oy) * 0.7 - 14} fill="var(--blue)" font-family="Georgia, serif" font-style="italic" font-size="16">A</text>` : ""}
        <circle cx=${x} cy=${tipY} r="5" fill="var(--surface)" stroke="var(--blue)" stroke-width="2"/>
        ${Math.abs(tipY - oy) > 30 ? svg`<text x=${x + 12} y=${tipY - 9} fill="var(--blue)" font-family="Georgia, serif" font-style="italic" font-size="17">M</text>` : ""}
        <circle class="phase-handle phase-tip" cx=${x} cy=${tipY} r="16" fill="transparent"
          tabindex=${visible ? 0 : -1} role="slider" aria-label=${t.phaseDrag}
          aria-valuemin="0" aria-valuemax="360" aria-valuenow=${Number(format((angle * 180) / Math.PI, 1))}
          aria-valuetext=${format((angle * 180) / Math.PI, 1) + "°. " + t.phaseKeyHelp}
          @pointerdown=${options.phasePointerDown} @pointermove=${options.phasePointerMove}
          @pointerup=${options.phaseRelease} @pointercancel=${options.phaseRelease} @lostpointercapture=${options.phaseRelease}
          @keydown=${options.phaseKeyboard}><title>${t.phaseDrag}</title></circle>
      </g>

      <path d=${`M48 ${oy - 46}h26v92H48z`} fill="url(#wall-metal)" stroke="var(--border)"/>
      <circle cx="61" cy=${oy - 32} r="3" fill="var(--muted)"/><circle cx="61" cy=${oy + 32} r="3" fill="var(--muted)"/>
      <path d=${`M48 ${oy - 45}l-12 12m12 3-12 12m12 3-12 12m12 3-12 12m12 3-12 12m12 3-12 12M74 ${oy}h12`} stroke="var(--muted)" fill="none" stroke-width="1.5"/>
      ${options.time > 0.03 ? Array.from({ length: 8 }, (_, i) => svg`<circle cx=${ox + stateAt(p, Math.max(0, options.time - (8 - i) * 0.025)).x * scale} cy=${oy} r=${9 + i} fill="var(--blue)" opacity=${0.015 + i * 0.009}/>`) : ""}
      <polyline points=${points} fill="none" stroke="var(--border)" stroke-width="5" stroke-linejoin="round"/>
      <polyline points=${points} fill="none" stroke="url(#spring-metal)" stroke-width="2.5" stroke-linejoin="round"/>
      <ellipse cx=${x} cy=${oy + 29} rx="24" ry="3" fill="#286eed" opacity=".16" filter="url(#ball-glow)"/>
      <circle cx=${x} cy=${oy} r="26" fill="#286eed" opacity=".1" filter="url(#ball-glow)"/>
      <circle class="mass-surface" cx=${x} cy=${oy} r="24" fill="url(#mass-light)" stroke="#4d8bff" stroke-opacity=".8" stroke-width=".8"/>
      <circle class="mass" cx=${x} cy=${oy} r="36" fill="transparent" tabindex="0" role="slider"
        aria-label=${t.drag} aria-valuemin="-0.8" aria-valuemax="0.8" aria-valuenow=${Number(format(s.x, 3))}
        aria-valuetext=${format(s.x, 3) + " m. " + t.keyHelp}
        @pointerdown=${options.pointerDown} @pointermove=${options.pointerMove}
        @pointerup=${options.release} @pointercancel=${options.cancel} @keydown=${options.keyboard}/>
      <text x=${x} y=${oy + 5} text-anchor="middle" fill="white" font-family="Georgia, serif" font-style="italic" font-size="18" pointer-events="none">m</text>
      ${
        velocity && Math.abs(s.v) > 1e-7
          ? svg`
        <path d=${`M${x} ${oy - 72}h${vLength}`} stroke="var(--green)" stroke-width="2" marker-end="url(#v-arrow)"/>
        <text x=${x + vLength / 2} y=${oy - 85} text-anchor="middle" font-size="11" fill="var(--green)" font-family="var(--mono)">v</text>
      `
          : ""
      }
      ${
        acceleration && Math.abs(s.a) > 1e-7
          ? svg`
        <path d=${`M${x} ${oy - 41}h${aLength}`} stroke="var(--red)" stroke-width="2" marker-end="url(#a-arrow)"/>
        <text x=${x + aLength / 2} y=${oy - 54} text-anchor="middle" font-size="11" fill="var(--red)" font-family="var(--mono)">a</text>
      `
          : ""
      }
      <path d=${`M${ox - radius} ${oy + 40}H${ox + radius}M${ox - radius} ${oy + 34}v12M${ox} ${oy + 34}v12M${ox + radius} ${oy + 34}v12`} stroke="var(--muted)" stroke-opacity=".7"/>
      ${
        p.A > 0.08
          ? svg`
        <text x=${ox - radius} y=${oy + 63} text-anchor="middle" fill="var(--muted)" font-size="12" font-family="var(--mono)">−A</text>
        <text x=${ox + radius} y=${oy + 63} text-anchor="middle" fill="var(--muted)" font-size="12" font-family="var(--mono)">+A</text>
      `
          : ""
      }
      <text x=${ox} y=${oy + 63} text-anchor="middle" fill="var(--muted)" font-size="12" font-family="var(--mono)">0</text>
      ${
        Math.abs(s.x) > 0.005
          ? svg`
        <path d=${`M${ox} ${oy + 88}H${x}M${ox} ${oy + 84}v8M${x} ${oy + 84}v8`} stroke="var(--blue)"/>
        <text x=${(ox + x) / 2} y=${oy + 108} text-anchor="middle" fill="var(--blue)" font-family="var(--mono)" font-size="12">x = ${format(s.x, 3)} m</text>
      `
          : svg`<text x=${ox} y=${oy + 103} text-anchor="middle" fill="var(--muted)" font-size="12">${t.equilibrium}</text>`
      }
    </svg>
  `;
}
