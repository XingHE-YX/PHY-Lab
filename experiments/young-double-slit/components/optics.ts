import { svg } from "lit";
import { guard } from "lit/directives/guard.js";
import {
  at,
  format,
  fringes,
  lightColor,
  screenHalf,
  type Parameters,
  type State,
} from "../model/physics";
import type { Snapshot } from "../model/snapshot";
import type { Texts } from "../locales/messages";

export const sceneGeometry = {
  width: 600,
  height: 320,
  top: 42,
  bottom: 278,
  screenX: 500,
};
export const plotGeometry = { left: 38, right: 318 };
export const screenY = (y: number) => 160 - (y / screenHalf) * 118;
const plotX = (y: number) => 38 + ((y + screenHalf) / (2 * screenHalf)) * 280;

function gradient(p: Parameters, id: string, vertical: boolean) {
  return svg`<linearGradient id=${id} x1="0" y1="0" x2=${vertical ? "0" : "1"} y2=${vertical ? "1" : "0"}>
    ${Array.from({ length: 1025 }, (_, i) => {
      const y = (vertical ? 1 - i / 512 : i / 512 - 1) * screenHalf;
      return svg`<stop offset=${i / 1024} stop-color=${lightColor(p.wavelength)} stop-opacity=${at(p, y).intensity}></stop>`;
    })}
  </linearGradient>`;
}

export function opticalScene(
  data: Snapshot,
  t: Texts,
  onPointer: (e: PointerEvent) => void,
  onKeys: (e: KeyboardEvent) => void,
) {
  const p = data.params,
    s = at(p, data.probe, data.cycles);
  const gap = 42 + ((p.separation - 0.1e-3) / 0.9e-3) * 64;
  const a = 160 - gap / 2,
    b = 160 + gap / 2;
  const yp = screenY(data.probe),
    hue = lightColor(p.wavelength);
  const waveStep = (35 * p.wavelength) / 550e-9;
  return svg`<svg class="optical-scene" viewBox="0 0 600 320" role="group" aria-label=${t.scene} data-y=${data.probe} data-delta=${s.delta} data-intensity=${s.intensity}>
    <defs>
      <clipPath id="wave-region"><rect x="112" y="42" width="374" height="236"></rect></clipPath>
      ${guard([p], () => gradient(p, "screen-gradient", true))}
    </defs>
    <line x1="35" y1="160" x2="490" y2="160" class="grid-line"></line>
    <text x="28" y="29" class="axis-label">${t.source}</text>
    <text x="150" y="29" class="axis-label">d = ${format(p.separation * 1e3)} mm</text>
    <text x="488" y="29" class="axis-label">${t.screen}</text>
    ${[30, 51, 72].map((x) => svg`<line x1=${x} y1="108" x2=${x} y2="212" stroke=${hue} opacity="0.5"></line>`)}
    <path d="M30 160H87m-7-5 7 5-7 5" fill="none" stroke="var(--muted)"></path>
    <path d=${`M104 42h10v${a - 48}h-10z M104 ${a + 6}h10v${b - a - 12}h-10z M104 ${b + 6}h10v${272 - b}h-10z`} class="slit-barrier"></path>
    ${
      data.layers.wavefronts
        ? svg`<g class="wavefronts" clip-path="url(#wave-region)" fill="none" stroke=${hue}>
      ${[a, b].map((y, source) =>
        Array.from({ length: 22 }, (_, i) => {
          const radius = (i + (data.cycles % 1)) * waveStep;
          return svg`<circle cx="110" cy=${y} r=${radius} stroke-dasharray=${source ? "3 4" : "none"} opacity=${0.24 * Math.max(0, 1 - radius / 480)}></circle>`;
        }),
      )}
    </g>`
        : ""
    }
    ${
      data.layers.paths
        ? svg`<g class="light-paths" fill="none" stroke-width="1.7">
      <path d=${`M110 ${a}L500 ${yp}`} stroke="var(--blue)" class="path-s1" data-length=${s.r1}></path>
      <path d=${`M110 ${b}L500 ${yp}`} stroke="var(--green)" stroke-dasharray="6 4" class="path-s2" data-length=${s.r2}></path>
      <text x="208" y="65" fill="var(--blue)" font-size="11">r₁ = ${format(s.r1, 7)} m</text>
      <text x="208" y="83" fill="var(--green)" font-size="11">r₂ = ${format(s.r2, 7)} m</text>
    </g>`
        : ""
    }
    <circle cx="110" cy=${a} r="3" fill="var(--blue)"></circle><text x="83" y=${a + 4} class="scene-label">S₁</text>
    <circle cx="110" cy=${b} r="3" fill="var(--green)"></circle><text x="83" y=${b + 4} class="scene-label">S₂</text>
    <rect x="490" y="42" width="25" height="236" fill="#080a0e" stroke="var(--muted)"></rect>
    <rect class="screen-fringes" x="490" y="42" width="25" height="236" fill="url(#screen-gradient)"></rect>
    ${[-12, -6, 0, 6, 12].map((mm) => svg`<path d=${`M517 ${screenY(mm * 1e-3)}h5`} class="axis"></path><text x="527" y=${screenY(mm * 1e-3) + 4} class="axis-label">${mm > 0 ? "+" : ""}${mm}</text>`)}
    <text x="527" y="300" class="axis-label">y / mm</text>
    ${
      data.layers.orders
        ? svg`<g class="fringe-orders">${fringes(p)
            .filter((f) => Math.abs(f.order) <= 6)
            .map(
              (f) =>
                svg`<text x="480" y=${screenY(f.y) + 3} text-anchor="end" class="axis-label">m=${f.order}</text>`,
            )}</g>`
        : ""
    }
    <g class="screen-probe" role="slider" tabindex="0" aria-label=${t.probe} aria-description=${t.probeHint} aria-orientation="vertical" aria-valuemin="-12" aria-valuemax="12" aria-valuenow=${format(data.probe * 1e3, 3)} aria-valuetext=${`y = ${format(data.probe * 1e3)} mm; I / Imax = ${format(s.intensity, 3)}`} @keydown=${onKeys} @pointerdown=${onPointer} @pointermove=${onPointer} @pointerup=${onPointer} @pointercancel=${onPointer}>
      <rect class="probe-focus" x="486" y="38" width="33" height="244" rx="3"></rect>
      <line x1="484" y1=${yp} x2="525" y2=${yp} class="probe-line"></line>
      <circle class="probe-ring" cx="502.5" cy=${yp} r="6"></circle>
      <text x="461" y=${yp - 10} fill="var(--primary)" font-size="13">P</text>
      <rect class="probe-hit" x="479" y="36" width="44" height="248"></rect>
    </g>
    <path d="M114 299H487m-367-4-6 4 6 4m361-8 6 4-6 4" fill="none" class="axis"></path>
    <rect x="260" y="287" width="95" height="20" fill="var(--bg)"></rect>
    <text x="307" y="301" text-anchor="middle" class="axis-label">L = ${format(p.distance)} m</text>
  </svg>`;
}

export function intensityChart(
  p: Parameters,
  s: State,
  t: Texts,
  onPointer: (e: PointerEvent) => void,
  onKeys: (e: KeyboardEvent) => void,
) {
  const px = plotX(s.y),
    py = 192 - s.intensity * 144;
  return svg`<svg class="optical-chart intensity-chart" viewBox="0 0 336 278" role="slider" tabindex="0" aria-label=${t.probeChart} aria-orientation="horizontal" aria-valuemin="-12" aria-valuemax="12" aria-valuenow=${format(s.y * 1e3, 3)} aria-valuetext=${`${format(s.y * 1e3)} mm`} @keydown=${onKeys} @pointerdown=${onPointer} @pointermove=${onPointer} @pointerup=${onPointer} @pointercancel=${onPointer}>
    <title>${t.intensityChart}</title>
    <text x="38" y="22" class="axis-label">${t.intensityAxis}</text>
    ${[0, 0.5, 1].map((v) => svg`<line x1="38" x2="318" y1=${192 - v * 144} y2=${192 - v * 144} class="grid-line"></line><text x="28" y=${196 - v * 144} text-anchor="end" class="axis-label">${v}</text>`)}
    ${[-12, -6, 0, 6, 12].map((mm) => svg`<line x1=${plotX(mm * 1e-3)} x2=${plotX(mm * 1e-3)} y1="42" y2="239" class="grid-line"></line><text x=${plotX(mm * 1e-3)} y="211" text-anchor="middle" class="axis-label">${mm}</text>`)}
    ${guard([p], () => {
      const path = Array.from({ length: 1025 }, (_, i) => {
        const y = -screenHalf + (i / 1024) * 2 * screenHalf;
        return `${i ? "L" : "M"}${plotX(y).toFixed(3)} ${(192 - at(p, y).intensity * 144).toFixed(3)}`;
      }).join(" ");
      return svg`<defs>${gradient(p, "plot-fringes", false)}</defs><path class="intensity-curve" d=${path} fill="none" stroke="var(--blue)" stroke-width="1.5"></path>`;
    })}
    <rect x="38" y="222" width="280" height="18" fill="#080a0e"></rect>
    <rect class="plot-fringes" x="38" y="222" width="280" height="18" fill="url(#plot-fringes)"></rect>
    <line x1=${px} x2=${px} y1="42" y2="242" class="probe-line"></line>
    <circle class="intensity-point" cx=${px} cy=${py} r="4" fill="var(--primary)" stroke="var(--surface)" stroke-width="1.5" data-value=${s.intensity} data-y=${s.y}></circle>
    <text x="178" y="263" text-anchor="middle" class="axis-label">${t.positionAxis}</text>
    <rect class="intensity-hit" x="34" y="36" width="288" height="208"></rect>
  </svg>`;
}

export function phaseChart(p: Parameters, s: State, cycles: number, t: Texts) {
  const theta = 2 * Math.PI * cycles;
  const v1 = [30 * Math.cos(theta), -30 * Math.sin(theta)];
  const v2 = [30 * Math.cos(theta - s.phase), -30 * Math.sin(theta - s.phase)];
  const x = 38 + (cycles / 4) * 280;
  const x1 = 104 + v1[0],
    y1 = 78 + v1[1],
    x2 = 104 + v2[0],
    y2 = 78 + v2[1];
  return svg`<svg class="optical-chart phase-chart" viewBox="0 0 336 306" role="img" aria-label=${t.phaseChart}>
    <defs>${["var(--blue)", "var(--green)", "var(--text)"].map((color, i) => svg`<marker id=${`phasor-arrow-${i}`} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3 0 6Z" fill=${color}></path></marker>`)}</defs>
    <circle cx="104" cy="78" r="60" fill="none" class="grid-line"></circle>
    <path d="M40 78H170M104 14V142" class="grid-line"></path>
    <path d=${`M${x1} ${y1}l${v2[0]} ${v2[1]}M${x2} ${y2}l${v1[0]} ${v1[1]}`} stroke="var(--muted)" opacity="0.5" stroke-dasharray="2 4" fill="none"></path>
    <path d=${`M104 78L${104 + v1[0] + v2[0]} ${78 + v1[1] + v2[1]}`} stroke="var(--text)" stroke-width="2.5" fill="none" class="phasor-sum" data-real=${s.field} marker-end=${s.intensity > 1e-12 ? "url(#phasor-arrow-2)" : "none"}></path>
    <path d=${`M104 78L${x1} ${y1}`} stroke="var(--blue)" stroke-width="2" fill="none" marker-end="url(#phasor-arrow-0)"></path>
    <path d=${`M104 78L${x2} ${y2}`} stroke="var(--green)" stroke-width="2" stroke-dasharray="4 3" fill="none" marker-end="url(#phasor-arrow-1)"></path>
    <circle cx=${x1} cy=${y1} r="2.5" fill="var(--blue)"></circle><circle cx=${x2} cy=${y2} r="2.5" fill="var(--green)"></circle>
    ${["S₁", "S₂", "Σ"].map((label, i) => svg`<line x1="198" x2="219" y1=${40 + i * 24} y2=${40 + i * 24} stroke=${["var(--blue)", "var(--green)", "var(--text)"][i]} stroke-dasharray=${i === 1 ? "4 3" : "none"} stroke-width="2"></line><text x="228" y=${44 + i * 24} class="axis-label">${label}</text>`)}
    <text x="196" y="122" class="axis-label">Δφ / π = ${format(s.phase / Math.PI)}</text>
    <text x="38" y="159" class="axis-label">${t.fieldAxis}</text>
    ${[-1, 0, 1].map((v) => svg`<line x1="38" x2="318" y1=${222 - v * 40} y2=${222 - v * 40} class="grid-line"></line><text x="28" y=${226 - v * 40} text-anchor="end" class="axis-label">${v}</text>`)}
    ${guard([p, s.y], () =>
      [0, 1, 2].map((metric) => {
        const path = Array.from({ length: 513 }, (_, i) => {
          const state = at(p, s.y, (i / 512) * 4);
          const field =
            metric === 0
              ? state.e1 / 2
              : metric === 1
                ? state.e2 / 2
                : state.field;
          return `${i ? "L" : "M"}${(38 + (i / 512) * 280).toFixed(3)} ${(222 - field * 40).toFixed(3)}`;
        }).join(" ");
        return svg`<path d=${path} fill="none" stroke=${["var(--blue)", "var(--green)", "var(--text)"][metric]} stroke-width=${metric === 2 ? 2 : 1.3} stroke-dasharray=${metric === 1 ? "4 3" : "none"}></path>`;
      }),
    )}
    ${[0, 1, 2, 3, 4].map((v) => svg`<text x=${38 + (v / 4) * 280} y="282" class="axis-label" text-anchor="middle">${v}</text>`)}
    <line x1=${x} x2=${x} y1="176" y2="267" class="probe-line"></line>
    <circle class="field-point" cx=${x} cy=${222 - s.field * 40} r="3.5" fill="var(--text)" data-value=${s.field}></circle>
    <text x="178" y="302" class="axis-label" text-anchor="middle">t / T</text>
  </svg>`;
}
