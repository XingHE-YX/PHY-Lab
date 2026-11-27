import { html, svg } from "lit";
import type { Messages } from "../locales/messages";
import type { Reading } from "../model/electrostatics";
import type { profile } from "../model/profile";

export function display(value: number | undefined) {
  if (value === undefined) return "—";
  if (Math.abs(value) < 1e-9) return "0.00";
  if (Math.abs(value) < 0.01) return value.toExponential(1);
  return value.toFixed(2);
}

export function contributions(reading: Reading | null, t: Messages) {
  const rows = [
    { name: "A", key: "first", reading: reading?.parts[0] },
    { name: "B", key: "second", reading: reading?.parts[1] },
    { name: t.total, key: "total", reading },
  ];
  return html`<div class="contribution-panel">
    <table class="contributions" aria-label=${t.contributions}>
      <thead>
        <tr>
          <th scope="col">${t.source}</th>
          <th scope="col">V <small>(V)</small></th>
          <th scope="col">Eₓ <small>(V/m)</small></th>
          <th scope="col">Eᵧ <small>(V/m)</small></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (row) =>
            html`<tr data-contribution=${row.key}>
              <th scope="row">${row.name}</th>
              <td data-component="potential">
                ${display(row.reading?.potential)}
              </td>
              <td data-component="fieldX">${display(row.reading?.fieldX)}</td>
              <td data-component="fieldY">${display(row.reading?.fieldY)}</td>
            </tr>`,
        )}
      </tbody>
    </table>
    <p>${t.probeHint}</p>
  </div>`;
}

const plot = { left: 47, right: 321, top: 25, bottom: 199 };

export function slice(
  data: ReturnType<typeof profile>,
  reading: Reading | null,
  t: Messages,
) {
  const { start, end, scale, segments } = data;
  if (end - start <= 1e-9)
    return html`<div class="slice-panel empty"><p>${t.sliceEmpty}</p></div>`;
  const xAt = (value: number) =>
    plot.left + ((value - start) / (end - start)) * (plot.right - plot.left);
  const yAt = (value: number) =>
    (plot.top + plot.bottom) / 2 -
    ((value / scale) * (plot.bottom - plot.top)) / 2;
  return html`<div class="slice-panel">
    ${svg`<svg class="slice-chart" viewBox="0 0 343 235" role="img" aria-label=${t.profile}>
      <text x=${plot.left} y="15" class="axis-label">V (V)</text>
      ${[-1, -0.5, 0, 0.5, 1].map((fraction) => {
        const y = yAt(fraction * scale);
        return svg`<line x1=${plot.left} x2=${plot.right} y1=${y} y2=${y} class=${fraction === 0 ? "world-axis" : "grid-line"} />
          <text x="40" y=${y + 4} text-anchor="end" class="axis-label">${fraction * scale}</text>`;
      })}
      ${[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
        const offset = start + (end - start) * fraction;
        const x = xAt(offset);
        return svg`<line x1=${x} x2=${x} y1=${plot.top} y2=${plot.bottom} class="grid-line" />
          <text x=${x} y="215" text-anchor="middle" class="axis-label">${offset.toFixed(1)}</text>`;
      })}
      ${segments.map((line) => svg`<polyline class="profile-trace" points=${line.map(({ offset, value }) => `${xAt(offset).toFixed(2)},${yAt(value).toFixed(2)}`).join(" ")} />`)}
      <line class="profile-cursor" x1=${xAt(0)} x2=${xAt(0)} y1=${plot.top} y2=${plot.bottom} />
      ${reading ? svg`<circle class="profile-probe" data-potential=${reading.potential} cx=${xAt(0)} cy=${yAt(reading.potential)} r="4.5" />` : svg``}
      <text x=${plot.right} y="232" text-anchor="end" class="axis-label">s (m)</text>
    </svg>`}
    <p>${t.sliceHint}</p>
  </div>`;
}
