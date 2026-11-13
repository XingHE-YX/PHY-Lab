import { svg } from "lit";
import type { Locale } from "../../../src/infra/platform/contract";
import {
  waveAt,
  spatialSamples,
  standingSites,
  harmonic,
  format,
  type WaveParameters,
} from "../model/physics";
import type { Snapshot } from "../model/snapshot";
import { texts } from "../locales/messages";
export interface SceneOptions {
  params: WaveParameters;
  time: number;
  probe: number;
  layers: Snapshot["layers"];
  locale: Locale;
  width: number;
  height: number;
  pointerDown: (event: PointerEvent) => void;
  pointerMove: (event: PointerEvent) => void;
  keyDown: (event: KeyboardEvent) => void;
  emit: () => void;
}
export function sceneGeometry(
  p: WaveParameters,
  width: number,
  height: number,
) {
  const left = 54,
    right = width - 40,
    top = 50,
    bottom = height - 60;
  const middle = (top + bottom) / 2;
  const extent = Math.max(
    0.1,
    p.amplitude * (p.mode === "travel" ? 1.25 : 2.5),
  );
  return {
    left,
    right,
    top,
    bottom,
    middle,
    extent,
    x: (x: number) => left + (x / p.length) * (right - left),
    y: (y: number) => middle - (y / extent) * (bottom - top) * 0.43,
  };
}
export function renderScene(o: SceneOptions) {
  const { params: p, time, width, height, layers } = o,
    t = texts(o.locale);
  const g = sceneGeometry(p, width, height),
    points = spatialSamples(p, time),
    probe = waveAt(p, o.probe * p.length, time);
  const path = (key: "y" | "incident" | "reflected") =>
    points
      .map(
        (v, i) =>
          `${i ? "L" : "M"}${g.x(v.x).toFixed(2)},${g.y(v[key]).toFixed(2)}`,
      )
      .join(" ");
  const px = g.x(probe.x),
    py = g.y(probe.y);
  const velocityBound = Math.max(
    0.01,
    (p.mode === "travel" ? 1 : 2) *
      p.amplitude *
      (!harmonic(p) ? Math.PI / p.duration : 2.5 * Math.PI * p.frequency),
  );
  const arrow = (-probe.v / velocityBound) * Math.min(60, height * 0.15);
  const arrowSide = o.probe > 0.9 ? -1 : 1;
  return svg`<svg class="wave-scene" viewBox=${`0 0 ${width} ${height}`} role="group" aria-label=${t.spaceTitle}>
    <defs>
      <radialGradient id="wave-bead" cx="30%" cy="25%" r="78%"><stop stop-color="#b4d3ff"/><stop offset=".25" stop-color="#5a98ff"/><stop offset=".65" stop-color="#286eed"/><stop offset="1" stop-color="#103778"/></radialGradient>
      <filter id="wave-glow" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="3"/></filter>
      <marker id="wave-v-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="var(--green)"/></marker>
    </defs>
    ${[0, 1, 2, 3, 4].map((i) => svg`<path d=${`M${g.x((i * p.length) / 4)} ${g.top}V${g.bottom}`} stroke="var(--border)" stroke-dasharray="2 5"/><text x=${g.x((i * p.length) / 4)} y=${g.bottom + 22} text-anchor="middle" class="axis-text">${format((i * p.length) / 4, 1)}</text>`)}
    ${[-g.extent, 0, g.extent].map((value) => svg`<path d=${`M${g.left} ${g.y(value)}H${g.right}`} stroke="var(--border)" stroke-dasharray=${value === 0 ? "" : "2 5"}/><text x=${g.left - 9} y=${g.y(value) + 4} text-anchor="end" class="axis-text">${format(value, 2)}</text>`)}
    <text x="12" y="28" class="axis-text">y (m)</text><text x=${g.right} y=${g.bottom + 44} text-anchor="end" class="axis-text">x (m)</text>
    <text x=${g.left + 8} y="28" class="scene-direction">${t.incident}  c = ${format(p.speed)} m/s</text>
    <path class="probe-guide" d=${`M${px} ${g.top - 5}V${g.bottom + 3}`} stroke="var(--blue)" opacity=".5" stroke-dasharray="4 5"/>
    ${layers.incident ? svg`<path class="wave-incident" d=${path("incident")} stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="8 5" fill="none"/>` : ""}
    ${layers.reflected && p.mode !== "travel" ? svg`<path class="wave-reflected" d=${path("reflected")} stroke="var(--text)" stroke-width="1.5" stroke-dasharray="2 4" fill="none"/>` : ""}
    ${layers.total ? svg`<path d=${path("y")} stroke="var(--blue)" stroke-width="9" fill="none" opacity=".1" filter="url(#wave-glow)"/><path class="wave-total" d=${path("y")} stroke="var(--blue)" stroke-width="2.3" fill="none"/>` : ""}
    ${Array.from({ length: 49 }, (_, i) => {
      const s = waveAt(p, (p.length * i) / 48, time);
      return svg`<circle cx=${g.x(s.x)} cy=${g.y(s.y)} r="2.7" fill="var(--blue)" opacity=".5"/>`;
    })}
    ${layers.sites && p.mode === "standing" ? svg`${standingSites(p, "node").map((x) => svg`<circle class="node-marker" data-x=${x} cx=${g.x(x)} cy=${g.middle} r="4" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.5"><title>${t.node} x = ${format(x)} m</title></circle>`)}${standingSites(p, "antinode").map((x) => svg`<path class="antinode-marker" data-x=${x} d=${`M${g.x(x)} ${g.y(2 * p.amplitude)}V${g.y(-2 * p.amplitude)}`} stroke="var(--blue)" stroke-opacity=".35" stroke-dasharray="3 5"><title>${t.antinode} x = ${format(x)} m</title></path>`)}` : ""}
    <g role=${p.mode === "standing" ? "img" : "button"} tabindex=${p.mode === "standing" ? -1 : 0} aria-label=${p.mode === "standing" ? t.openLabel : p.source === "pulse" ? t.emit : t.restartDrive} class="source-handle" @click=${() => {
      if (p.mode !== "standing") o.emit();
    }} @keydown=${(e: KeyboardEvent) => {
      if (p.mode !== "standing" && ["Enter", " "].includes(e.key)) {
        e.preventDefault();
        o.emit();
      }
    }}>
      <circle cx=${g.left} cy=${g.y(waveAt(p, 0, time).y)} r="16" fill="var(--surface)" stroke="var(--primary)"/>
      <circle cx=${g.left} cy=${g.y(waveAt(p, 0, time).y)} r="5" fill="var(--primary)"/>
      <title>${p.mode === "standing" ? t.openLabel : p.source === "pulse" ? t.emit : t.restartDrive}</title>
    </g>
    <text x=${g.left} y=${g.bottom + 44} text-anchor="middle" class="axis-text">${p.mode === "standing" ? t.openLabel : t.sourceLabel}</text>
    ${p.mode === "travel" ? svg`<path d=${`M${g.right + 7} ${g.top}V${g.bottom}`} stroke="var(--muted)" stroke-dasharray="3 5"/>` : p.boundary === "fixed" ? svg`<path class="fixed-boundary" d=${`M${g.right} ${g.middle - 27}h7v54h-7z`} fill="var(--subtle)" stroke="var(--muted)"/><path d=${`M${g.right + 7} ${g.middle - 26}l10 -8m-10 20 10 -8m-10 20 10 -8m-10 20 10 -8m-10 20 10 -8`} stroke="var(--muted)"/>` : svg`<path d=${`M${g.right} ${g.top}V${g.bottom}`} stroke="var(--muted)" stroke-width="2"/><circle class="boundary-ring" data-y=${waveAt(p, p.length, time).y} cx=${g.right} cy=${g.y(waveAt(p, p.length, time).y)} r="6" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/>`}
    <text x=${g.right - 4} y="28" text-anchor="end" class="axis-text">${p.mode === "travel" ? t.absorber : t[p.boundary]}</text>
    ${layers.velocity && Math.abs(probe.v) > 1e-7 ? svg`<path class="particle-velocity" d=${`M${px + 18 * arrowSide} ${py}v${arrow}`} stroke="var(--green)" stroke-width="2" marker-end="url(#wave-v-arrow)"/><text x=${px + 28 * arrowSide} y=${py + arrow / 2} text-anchor=${arrowSide < 0 ? "end" : "start"} fill="var(--green)" font-size="12">vᵧ</text>` : ""}
    <g class="probe-handle" role="slider" tabindex="0" aria-label=${t.probe} aria-valuemin="0" aria-valuemax=${p.length} aria-valuenow=${Number(format(probe.x, 3))} aria-valuetext=${format(probe.x) + " m. " + t.probeHelp}
      @pointerdown=${o.pointerDown} @pointermove=${o.pointerMove} @keydown=${o.keyDown}>
      <circle cx=${px} cy=${py} r="22" fill="transparent"/>
      <circle class="tracked-particle" data-x=${probe.x} data-y=${probe.y} cx=${px} cy=${py} r="9" fill="url(#wave-bead)" stroke="#6da0ff"/>
      <text x=${px} y=${g.top - 8} text-anchor=${o.probe > 0.85 ? "end" : "middle"} fill="var(--blue)" font-size="12">xₚ = ${format(probe.x)} m</text>
    </g>
  </svg>`;
}
