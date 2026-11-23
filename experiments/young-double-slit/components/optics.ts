import { svg } from "lit";
import { guard } from "lit/directives/guard.js";
import {
  at,
  derived,
  format,
  fringes,
  lightColor,
  screenHalf,
  clamp,
  type Parameters,
  type State,
} from "../model/physics";
import type { Snapshot } from "../model/snapshot";
import type { Texts } from "../locales/messages";

export const sceneGeometry = {
  width: 600,
  height: 320,
  top: 44,
  bottom: 276,
  screenX: 502,
};
export const plotGeometry = { left: 38, right: 318 };
export const screenY = (y: number) => 160 - (y / screenHalf) * 116;
const plotX = (y: number) => 38 + ((y + screenHalf) / (2 * screenHalf)) * 280;

const hueStops = [
  [400, 270],
  [450, 235],
  [490, 185],
  [530, 125],
  [580, 50],
  [630, 5],
  [700, 0],
] as const;

function spectralHue(wavelength: number) {
  const nm = wavelength * 1e9;
  let i = 0;
  while (i < hueStops.length - 2 && nm > hueStops[i + 1][0]) i++;
  const [a, hueA] = hueStops[i],
    [b, hueB] = hueStops[i + 1];
  return hueA + (hueB - hueA) * clamp((nm - a) / (b - a), 0, 1);
}

function spectralStroke(wavelength: number, dark: boolean) {
  const hue = spectralHue(wavelength);
  return dark ? `hsl(${hue} 82% 64%)` : `hsl(${hue} 74% 42%)`;
}

function gradient(p: Parameters, id: string, vertical: boolean) {
  return svg`<linearGradient id=${id} x1="0" y1="0" x2=${vertical ? "0" : "1"} y2=${vertical ? "1" : "0"}>
    ${Array.from({ length: 1025 }, (_, i) => {
      const y = (vertical ? 1 - i / 512 : i / 512 - 1) * screenHalf;
      return svg`<stop offset=${i / 1024} stop-color=${lightColor(p.wavelength)} stop-opacity=${at(p, y).intensity}></stop>`;
    })}
  </linearGradient>`;
}

function visibleOrders(p: Parameters, yp: number) {
  const all = fringes(p);
  const spacingPx = (derived(p).spacing / screenHalf) * 116;
  const step =
    [1, 2, 5, 10, 20, 50].find((s) => s * spacingPx >= 16) ??
    Math.max(1, Math.ceil(16 / Math.max(0.1, spacingPx)));
  return all.filter((f) => {
    if (f.order % step !== 0) return false;
    const fy = screenY(f.y);
    return fy >= 49 && fy <= 271 && Math.abs(fy - yp) >= 14;
  });
}

export function opticalScene(
  data: Snapshot,
  t: Texts,
  onPointer: (e: PointerEvent) => void,
  onKeys: (e: KeyboardEvent) => void,
  dark = false,
) {
  const p = data.params,
    s = at(p, data.probe, data.cycles);
  const gap = 44 + ((p.separation - 0.1e-3) / 0.9e-3) * 60;
  const a = 160 - gap / 2,
    b = 160 + gap / 2;
  const yp = screenY(data.probe);
  const waveColor = spectralStroke(p.wavelength, dark);
  const waveStep = (34 * p.wavelength) / 550e-9;
  const beamTop = Math.max(66, a - 26),
    beamBottom = Math.min(254, b + 26);
  const badgeY = yp < 160 ? 224 : 52;
  const phaseFrac = data.cycles % 1;

  return svg`<svg class="optical-scene" viewBox="0 0 600 320" role="group" aria-label=${t.scene} data-y=${data.probe} data-delta=${s.delta} data-intensity=${s.intensity}>
    <defs>
      <pattern id="opt-grid" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M24 0H0V24" fill="none" stroke="var(--border)" stroke-width="0.65"></path>
      </pattern>
      <linearGradient id="opt-beam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color=${waveColor} stop-opacity="0"></stop>
        <stop offset="0.35" stop-color=${waveColor} stop-opacity=${dark ? "0.14" : "0.10"}></stop>
        <stop offset="1" stop-color=${waveColor} stop-opacity=${dark ? "0.22" : "0.14"}></stop>
      </linearGradient>
      <linearGradient id="opt-barrier" gradientUnits="userSpaceOnUse" x1="104" y1="0" x2="116" y2="0">
        <stop offset="0" stop-color="var(--barrier-lo)"></stop>
        <stop offset="0.35" stop-color="var(--barrier-hi)"></stop>
        <stop offset="0.75" stop-color="var(--barrier-mid)"></stop>
        <stop offset="1" stop-color="var(--barrier-lo)"></stop>
      </linearGradient>
      <radialGradient id="opt-slit-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color=${waveColor} stop-opacity="0.55"></stop>
        <stop offset="1" stop-color=${waveColor} stop-opacity="0"></stop>
      </radialGradient>
      <marker id="opt-dir-arrow" markerWidth="6.5" markerHeight="6.5" refX="5.2" refY="3.25" orient="auto">
        <path d="M0 0.6L6.2 3.25L0 5.9L1.4 3.25Z" fill="var(--muted)"></path>
      </marker>
      <marker id="opt-dim-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M0 0.8L5.6 3L0 5.2L1.2 3Z" fill="var(--muted)"></path>
      </marker>
      <clipPath id="incident-region"><rect x="26" y=${beamTop} width="58" height=${beamBottom - beamTop}></rect></clipPath>
      <clipPath id="wave-region"><rect x="116" y="44" width="372" height="232"></rect></clipPath>
      ${guard([p], () => gradient(p, "screen-gradient", true))}
    </defs>

    <g class="bench-grid">
      <rect x="14" y="14" width="572" height="292" rx="6" fill="url(#opt-grid)" opacity="0.58"></rect>
      <rect x="14" y="14" width="572" height="292" rx="6" fill="none" stroke="var(--border)" stroke-width="1" opacity="0.85"></rect>
    </g>

    <line x1="26" y1="160" x2="488" y2="160" class="grid-line"></line>
    <text x="24" y="30" class="axis-label">${t.source}</text>
    <text x="150" y="30" class="axis-label">d = ${format(p.separation * 1e3)} mm</text>
    <text x="502" y="30" text-anchor="middle" class="axis-label">${t.screen}</text>

    <rect x="26" y=${beamTop} width="78" height=${beamBottom - beamTop} fill="url(#opt-beam)"></rect>
    <g clip-path="url(#incident-region)" stroke=${waveColor} stroke-width="1.25" opacity=${dark ? "0.52" : "0.46"}>
      ${Array.from({ length: 4 }, (_, i) => {
        const x = 22 + (i + phaseFrac) * 18;
        return svg`<line x1=${x} y1=${beamTop + 4} x2=${x} y2=${beamBottom - 4}></line>`;
      })}
    </g>
    <path d="M28 160H80" fill="none" stroke="var(--muted)" stroke-width="1.35" stroke-linecap="round" marker-end="url(#opt-dir-arrow)"></path>

    ${
      data.layers.wavefronts
        ? svg`<g class="wavefronts" clip-path="url(#wave-region)" fill="none" stroke=${waveColor} stroke-width="1.15">
      ${[a, b].map((y, source) =>
        Array.from({ length: 22 }, (_, i) => {
          const radius = (i + phaseFrac) * waveStep;
          return svg`<circle cx="110" cy=${y} r=${radius} stroke-dasharray=${source ? "3.5 4.5" : "none"} opacity=${(dark ? 0.3 : 0.32) * Math.max(0, 1 - radius / 440)}></circle>`;
        }),
      )}
    </g>`
        : ""
    }

    <g class="slit-assembly">
      <rect x="104" y="44" width="12" height=${a - 49} rx="1.5" class="slit-barrier"></rect>
      <rect x="104" y=${a + 5} width="12" height=${b - a - 10} rx="1.5" class="slit-barrier"></rect>
      <rect x="104" y=${b + 5} width="12" height=${271 - b} rx="1.5" class="slit-barrier"></rect>
      <line x1="106.5" y1="46" x2="106.5" y2=${a - 7} class="barrier-shine"></line>
      <line x1="106.5" y1=${a + 7} x2="106.5" y2=${b - 7} class="barrier-shine"></line>
      <line x1="106.5" y1=${b + 7} x2="106.5" y2="274" class="barrier-shine"></line>
      <path d=${`M119 ${a}h4v${b - a}h-4`} fill="none" stroke="var(--muted)" stroke-width="0.9" opacity="0.6"></path>
      <circle cx="112" cy=${a} r="9" fill="url(#opt-slit-glow)"></circle>
      <circle cx="112" cy=${b} r="9" fill="url(#opt-slit-glow)"></circle>
      <circle cx="110" cy=${a} r="3" fill="var(--blue)"></circle>
      <circle cx="110" cy=${b} r="3" fill="var(--green)"></circle>
      <text x="97" y=${a + 4} text-anchor="end" class="scene-label halo">S₁</text>
      <text x="97" y=${b + 4} text-anchor="end" class="scene-label halo">S₂</text>
    </g>

    ${
      data.layers.paths
        ? svg`<g class="light-paths" fill="none">
      <path d=${`M110 ${a}L490 ${yp}`} stroke="var(--blue)" stroke-width="1.8" class="path-s1" data-length=${s.r1}></path>
      <path d=${`M110 ${b}L490 ${yp}`} stroke="var(--green)" stroke-width="1.8" stroke-dasharray="6 4" class="path-s2" data-length=${s.r2}></path>
      <circle cx="490" cy=${yp} r="2.6" fill="var(--primary)"></circle>
      <g class="path-badge">
        <rect x="226" y=${badgeY} width="154" height="40" rx="4" fill="var(--surface)" fill-opacity="0.92" stroke="var(--border)" stroke-width="1"></rect>
        <line x1="235" y1=${badgeY + 13} x2="248" y2=${badgeY + 13} stroke="var(--blue)" stroke-width="1.8"></line>
        <text x="254" y=${badgeY + 16.5} fill="var(--blue)" font-size="10.5">r₁ = ${format(s.r1, 7)} m</text>
        <line x1="235" y1=${badgeY + 28} x2="248" y2=${badgeY + 28} stroke="var(--green)" stroke-width="1.8" stroke-dasharray="4 2.5"></line>
        <text x="254" y=${badgeY + 31.5} fill="var(--green)" font-size="10.5">r₂ = ${format(s.r2, 7)} m</text>
      </g>
    </g>`
        : ""
    }

    <g class="screen-assembly">
      <rect x="488" y="42" width="28" height="236" rx="2.5" class="screen-housing"></rect>
      <rect x="490" y="44" width="24" height="232" fill="#080b10"></rect>
      <rect class="screen-fringes" x="490" y="44" width="24" height="232" fill="url(#screen-gradient)"></rect>
      ${[-9, -3, 3, 9].map((mm) => svg`<path d=${`M517 ${screenY(mm * 1e-3)}h3`} class="axis" opacity="0.5"></path>`)}
      ${[-12, -6, 0, 6, 12].map((mm) => svg`<path d=${`M517 ${screenY(mm * 1e-3)}h6`} class="axis"></path><text x="527" y=${screenY(mm * 1e-3) + 3.5} class="axis-label">${mm > 0 ? "+" : ""}${mm}</text>`)}
      <text x="527" y="298" class="axis-label">y / mm</text>
    </g>

    ${
      data.layers.orders
        ? svg`<g class="fringe-orders">${visibleOrders(p, yp).map((f) => {
            const fy = screenY(f.y);
            return svg`<path d=${`M481 ${fy}H486`} class="axis" opacity="0.7"></path><text x="477" y=${fy + 3.5} text-anchor="end" class="axis-label halo">m=${f.order}</text>`;
          })}</g>`
        : ""
    }

    <g class="screen-probe" role="slider" tabindex="0" aria-label=${t.probe} aria-description=${t.probeHint} aria-orientation="vertical" aria-valuemin="-12" aria-valuemax="12" aria-valuenow=${format(data.probe * 1e3, 3)} aria-valuetext=${`y = ${format(data.probe * 1e3)} mm; I / Imax = ${format(s.intensity, 3)}`} @keydown=${onKeys} @pointerdown=${onPointer} @pointermove=${onPointer} @pointerup=${onPointer} @pointercancel=${onPointer}>
      <rect class="probe-focus" x="485" y="39" width="34" height="242" rx="3"></rect>
      <line x1="478" y1=${yp} x2="517" y2=${yp} class="probe-line"></line>
      <circle class="probe-ring" cx="502" cy=${yp} r="5.5"></circle>
      <circle cx="502" cy=${yp} r="1.8" fill="var(--primary)"></circle>
      <rect class="probe-badge" x="462" y=${yp - 8} width="16" height="16" rx="3"></rect>
      <text class="probe-badge-text" x="470" y=${yp + 3.5} text-anchor="middle">P</text>
      <rect class="probe-hit" x="460" y="38" width="64" height="244"></rect>
    </g>

    <g class="distance-dimension">
      <path d="M110 280v19M490 280v19" fill="none" stroke="var(--border)" stroke-width="1"></path>
      <path d="M255 294H112" fill="none" class="axis" marker-end="url(#opt-dim-arrow)"></path>
      <path d="M345 294H488" fill="none" class="axis" marker-end="url(#opt-dim-arrow)"></path>
      <text x="300" y="298" text-anchor="middle" class="axis-label">L = ${format(p.distance)} m</text>
    </g>
  </svg>`;
}

export function intensityChart(
  p: Parameters,
  s: State,
  t: Texts,
  onPointer: (e: PointerEvent) => void,
  onKeys: (e: KeyboardEvent) => void,
  height = 256,
) {
  const h = Math.max(216, height);
  const top = 24,
    curveBottom = h - 66,
    curveHeight = curveBottom - top;
  const stripTop = curveBottom + 8,
    stripHeight = 16;
  const tickY = stripTop + stripHeight + 14;
  const px = plotX(s.y),
    py = curveBottom - s.intensity * curveHeight;

  return svg`<svg class="optical-chart intensity-chart" viewBox=${`0 0 336 ${h}`} role="slider" tabindex="0" aria-label=${t.probeChart} aria-orientation="horizontal" aria-valuemin="-12" aria-valuemax="12" aria-valuenow=${format(s.y * 1e3, 3)} aria-valuetext=${`${format(s.y * 1e3)} mm`} @keydown=${onKeys} @pointerdown=${onPointer} @pointermove=${onPointer} @pointerup=${onPointer} @pointercancel=${onPointer}>
    <title>${t.intensityChart}</title>
    <text x="8" y="13" class="axis-text">${t.intensityAxis}</text>
    ${[0, 0.5, 1].map((v) => {
      const y = curveBottom - v * curveHeight;
      return svg`<line x1="38" x2="318" y1=${y} y2=${y} class="grid-line"></line><text x="31" y=${y + 3.5} text-anchor="end" class="axis-text">${v}</text>`;
    })}
    ${[-12, -6, 0, 6, 12].map((mm) => {
      const x = plotX(mm * 1e-3);
      return svg`<line x1=${x} x2=${x} y1=${top} y2=${curveBottom} class="grid-line"></line><text x=${x} y=${tickY} text-anchor="middle" class="axis-text">${mm}</text>`;
    })}
    ${guard([p, curveHeight], () => {
      const pts = Array.from({ length: 1025 }, (_, i) => {
        const y = -screenHalf + (i / 1024) * 2 * screenHalf;
        return `${i ? "L" : "M"}${plotX(y).toFixed(2)} ${(curveBottom - at(p, y).intensity * curveHeight).toFixed(2)}`;
      }).join(" ");
      const area = `${pts} L318 ${curveBottom} L38 ${curveBottom} Z`;
      return svg`<defs>${gradient(p, "plot-fringes", false)}</defs>
        <path d=${area} fill="var(--blue)" fill-opacity="0.08"></path>
        <path class="intensity-curve" d=${pts} fill="none" stroke="var(--blue)" stroke-width="1.65"></path>`;
    })}
    <rect x="38" y=${stripTop} width="280" height=${stripHeight} fill="#080b10"></rect>
    <rect class="plot-fringes" x="38" y=${stripTop} width="280" height=${stripHeight} fill="url(#plot-fringes)"></rect>
    <rect x="38" y=${stripTop} width="280" height=${stripHeight} fill="none" stroke="var(--border)" stroke-width="1"></rect>
    <line x1=${px} x2=${px} y1=${top} y2=${stripTop + stripHeight} class="probe-line"></line>
    <path d=${`M${px} ${stripTop}l-3 -4h6z`} fill="var(--primary)"></path>
    <circle class="intensity-point" cx=${px} cy=${py} r="4" fill="var(--primary)" stroke="var(--surface)" stroke-width="1.8" data-value=${s.intensity} data-y=${s.y}></circle>
    <text x="318" y=${h - 8} text-anchor="end" class="axis-text">${t.positionAxis}</text>
    <rect class="intensity-hit" x="34" y=${top - 6} width="288" height=${stripTop + stripHeight - top + 12}></rect>
  </svg>`;
}

export function phaseChart(
  p: Parameters,
  s: State,
  cycles: number,
  t: Texts,
  height = 256,
  onSeek?: (cycles: number) => void,
) {
  const h = Math.max(216, height);
  const phasorHeight = Math.round(Math.min(132, Math.max(96, h * 0.44)));
  const cy = Math.round(phasorHeight / 2 + 4);
  const r = Math.round(Math.min(46, (phasorHeight - 16) / 2));
  const cx = 100;

  const traceTop = phasorHeight + 24,
    traceBottom = h - 32;
  const traceMid = (traceTop + traceBottom) / 2;
  const traceAmp = (traceBottom - traceTop) / 2;

  const theta = 2 * Math.PI * cycles;
  const halfR = r / 2;
  const v1 = [halfR * Math.cos(theta), -halfR * Math.sin(theta)];
  const v2 = [
    halfR * Math.cos(theta - s.phase),
    -halfR * Math.sin(theta - s.phase),
  ];
  const x1 = cx + v1[0],
    y1 = cy + v1[1],
    x2 = cx + v2[0],
    y2 = cy + v2[1];
  const sx = cx + v1[0] + v2[0],
    sy = cy + v1[1] + v2[1];
  const cursorX = 38 + (cycles / 4) * 280;

  const scrub = (e: PointerEvent) => {
    if (!onSeek) return;
    const node = e.currentTarget as SVGSVGElement;
    if (e.type === "pointermove" && !node.hasPointerCapture(e.pointerId))
      return;
    const matrix = node.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    if (point.y < traceTop - 10) return;
    onSeek(clamp((point.x - 38) / 280, 0, 1) * 4);
  };

  return svg`<svg class="optical-chart phase-chart" viewBox=${`0 0 336 ${h}`} role="img" aria-label=${t.phaseChart} @pointerdown=${(
    e: PointerEvent,
  ) => {
    if (!onSeek || e.button !== 0) return;
    const node = e.currentTarget as SVGSVGElement;
    const matrix = node.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    if (point.y < traceTop - 10) return;
    node.setPointerCapture(e.pointerId);
    scrub(e);
  }} @pointermove=${scrub}>
    <defs>
      ${["var(--blue)", "var(--green)", "var(--text)"].map((color, i) => svg`<marker id=${`phasor-arrow-${i}`} viewBox="0 0 7 7" refX="5.5" refY="3.5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0.8L6.5 3.5L0 6.2L1.5 3.5Z" fill=${color}></path></marker>`)}
    </defs>

    <g class="phasor-diagram">
      <circle cx=${cx} cy=${cy} r=${r} fill="var(--subtle)" fill-opacity="0.45" stroke="var(--border)" stroke-width="1"></circle>
      <circle cx=${cx} cy=${cy} r=${halfR} fill="none" stroke="var(--border)" stroke-dasharray="2 4"></circle>
      <line x1=${cx - r - 8} y1=${cy} x2=${cx + r + 8} y2=${cy} stroke="var(--border)" stroke-width="1"></line>
      <line x1=${cx} y1=${cy - r - 6} x2=${cx} y2=${cy + r + 6} class="grid-line"></line>
      <line x1=${sx} y1=${sy} x2=${sx} y2=${cy} stroke="var(--text)" stroke-dasharray="2 3" opacity="0.4"></line>
      <circle cx=${sx} cy=${cy} r="2.2" fill="var(--text)" opacity="0.7"></circle>
      <path d=${`M${x1} ${y1}L${sx} ${sy}`} stroke="var(--green)" opacity="0.35" stroke-dasharray="2 3" fill="none"></path>
      <path d=${`M${x2} ${y2}L${sx} ${sy}`} stroke="var(--blue)" opacity="0.35" stroke-dasharray="2 3" fill="none"></path>
      <path d=${`M${cx} ${cy}L${sx} ${sy}`} stroke="var(--text)" stroke-width="2.3" stroke-linecap="round" fill="none" class="phasor-sum" data-real=${s.field} marker-end=${s.intensity > 1e-12 ? "url(#phasor-arrow-2)" : "none"}></path>
      <path d=${`M${cx} ${cy}L${x1} ${y1}`} stroke="var(--blue)" stroke-width="1.8" stroke-linecap="round" fill="none" marker-end="url(#phasor-arrow-0)"></path>
      <path d=${`M${cx} ${cy}L${x2} ${y2}`} stroke="var(--green)" stroke-width="1.8" stroke-dasharray="4 3" stroke-linecap="round" fill="none" marker-end="url(#phasor-arrow-1)"></path>
      <circle cx=${cx} cy=${cy} r="2.2" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.2"></circle>
    </g>

    <g class="phasor-legend">
      ${(
        [
          ["S₁", "E₁/(2E₀)", "var(--blue)", "none"],
          ["S₂", "E₂/(2E₀)", "var(--green)", "4 3"],
          ["Σ", "E/(2E₀)", "var(--text)", "none"],
        ] as const
      ).map(
        ([sym, desc, color, dash], i) =>
          svg`<line x1="176" x2="196" y1=${cy - 24 + i * 18} y2=${cy - 24 + i * 18} stroke=${color} stroke-dasharray=${dash} stroke-width="1.8"></line><text x="204" y=${cy - 20.5 + i * 18} class="axis-text" style=${`fill:${color};font-weight:600`}>${sym}</text><text x="224" y=${cy - 20.5 + i * 18} class="axis-text">${desc}</text>`,
      )}
      <text x="176" y=${cy + 34} class="axis-text">Δφ = ${format(s.phase / Math.PI)} π</text>
    </g>

    <text x="8" y=${traceTop - 10} class="axis-text">${t.fieldAxis}</text>
    ${[-1, 0, 1].map((v) => {
      const y = traceMid - v * traceAmp;
      return svg`<line x1="38" x2="318" y1=${y} y2=${y} class="grid-line"></line><text x="31" y=${y + 3.5} text-anchor="end" class="axis-text">${v}</text>`;
    })}
    ${[0, 1, 2, 3, 4].map((v) => {
      const gx = 38 + (v / 4) * 280;
      return svg`<line x1=${gx} x2=${gx} y1=${traceTop} y2=${traceBottom} class="grid-line"></line><text x=${gx} y=${traceBottom + 14} class="axis-text" text-anchor="middle">${v}</text>`;
    })}
    ${guard([p, s.y, traceMid, traceAmp], () =>
      [0, 1, 2].map((metric) => {
        const path = Array.from({ length: 513 }, (_, i) => {
          const state = at(p, s.y, (i / 512) * 4);
          const field =
            metric === 0
              ? state.e1 / 2
              : metric === 1
                ? state.e2 / 2
                : state.field;
          return `${i ? "L" : "M"}${(38 + (i / 512) * 280).toFixed(2)} ${(traceMid - field * traceAmp).toFixed(2)}`;
        }).join(" ");
        return svg`<path d=${path} fill="none" stroke=${["var(--blue)", "var(--green)", "var(--text)"][metric]} stroke-width=${metric === 2 ? 2 : 1.35} stroke-dasharray=${metric === 1 ? "4 3" : "none"}></path>`;
      }),
    )}
    <line x1=${cursorX} x2=${cursorX} y1=${traceTop} y2=${traceBottom} class="probe-line"></line>
    <circle class="field-point" cx=${cursorX} cy=${traceMid - s.field * traceAmp} r="3.8" fill="var(--text)" stroke="var(--surface)" stroke-width="1.5" data-value=${s.field}></circle>
    <text x="318" y=${h - 6} class="axis-text" text-anchor="end">t / T</text>
  </svg>`;
}
