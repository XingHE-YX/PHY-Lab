import { svg } from "lit";
import type { Locale } from "../../../src/infra/platform/contract";
import { format, type Parameters, type PhysicsState } from "../model/physics";
import { texts } from "../locales/messages";
interface SceneOptions {
  params: Parameters;
  state: PhysicsState;
  locale: Locale;
  velocity: boolean;
  acceleration: boolean;
  pointerDown: (event: PointerEvent) => void;
  pointerMove: (event: PointerEvent) => void;
  release: () => void;
  cancel: () => void;
  keyboard: (event: KeyboardEvent) => void;
}
export function renderScene(options: SceneOptions) {
  const { params: p, state: s, locale, velocity, acceleration } = options;
  const t = texts(locale),
    x = 390 + s.x * 300,
    left = x - 25;
  const points = Array.from({ length: 29 }, (_, i) => {
    const px = 86 + ((left - 86) * i) / 28;
    return px + "," + (i === 0 || i === 28 ? 137 : 137 + (i % 2 ? 9 : -9));
  }).join(" ");
  const vLength = (s.v / (p.A * s.omega || 1)) * 100;
  const aLength = (s.a / (p.A * s.omega ** 2 || 1)) * 100;
  return svg`
    <svg class="scene" viewBox="0 0 800 285" role="group" aria-label=${t.title}>
      <defs>
        <marker id="v-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="var(--green)"/></marker>
        <marker id="a-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7" fill="var(--red)"/></marker>
      </defs>
      <path d="M48 91h26v92H48z" fill="var(--subtle)" stroke="var(--border)"/>
      <path d="M48 92 36 104m12 3-12 12m12 3-12 12m12 3-12 12m12 3-12 12m12 3-12 12M74 137h12" stroke="var(--muted)" fill="none" stroke-width="1.5"/>
      <path d="M390 42v163" stroke="var(--border)" stroke-dasharray="4 5"/>
      <path d="M90 185h640" stroke="var(--border)"/>
      <polyline points=${points} fill="none" stroke="var(--text)" stroke-width="2" stroke-linejoin="round"/>
      <circle cx=${x} cy="137" r="25" fill="var(--blue)" opacity=".12"/>
      <circle cx=${x} cy="137" r="22" fill="var(--blue)"/>
      <circle class="mass" cx=${x} cy="137" r="46" fill="transparent" tabindex="0" role="slider"
        aria-label=${t.drag} aria-valuemin="-0.8" aria-valuemax="0.8" aria-valuenow=${Number(format(s.x, 3))}
        aria-valuetext=${format(s.x, 3) + " m. " + t.keyHelp}
        @pointerdown=${options.pointerDown} @pointermove=${options.pointerMove}
        @pointerup=${options.release} @pointercancel=${options.cancel} @keydown=${options.keyboard}/>
      <text x=${x} y="142" text-anchor="middle" fill="var(--surface)" font-family="var(--mono)" font-size="15" pointer-events="none">m</text>
      ${
        velocity && Math.abs(s.v) > 1e-7
          ? svg`
        <path d=${"M" + x + " 65h" + vLength} stroke="var(--green)" stroke-width="2" marker-end="url(#v-arrow)"/>
        <text x=${x + vLength / 2} y="52" text-anchor="middle" font-size="11" fill="var(--green)" font-family="var(--mono)">v</text>
      `
          : ""
      }
      ${
        acceleration && Math.abs(s.a) > 1e-7
          ? svg`
        <path d=${"M" + x + " 96h" + aLength} stroke="var(--red)" stroke-width="2" marker-end="url(#a-arrow)"/>
        <text x=${x + aLength / 2} y="83" text-anchor="middle" font-size="11" fill="var(--red)" font-family="var(--mono)">a</text>
      `
          : ""
      }
      <path d=${"M" + (390 - p.A * 300) + " 178v14M390 178v14M" + (390 + p.A * 300) + " 178v14"} stroke="var(--muted)"/>
      ${
        p.A > 0.025
          ? svg`
        <text x=${390 - p.A * 300} y="209" text-anchor="middle" fill="var(--muted)" font-size="11" font-family="var(--mono)">−A</text>
        <text x=${390 + p.A * 300} y="209" text-anchor="middle" fill="var(--muted)" font-size="11" font-family="var(--mono)">+A</text>
      `
          : ""
      }
      <text x="390" y="209" text-anchor="middle" fill="var(--muted)" font-size="11" font-family="var(--mono)">0</text>
      ${
        Math.abs(s.x) > 0.005
          ? svg`
        <path d=${"M390 231H" + x + "M390 227v8M" + x + " 227v8"} stroke="var(--blue)"/>
        <text x=${(390 + x) / 2} y="250" text-anchor="middle" fill="var(--blue)" font-family="var(--mono)" font-size="11">x = ${format(s.x, 3)} m</text>
      `
          : svg`<text x="390" y="246" text-anchor="middle" fill="var(--muted)" font-size="11">${t.equilibrium}</text>`
      }
    </svg>
  `;
}
