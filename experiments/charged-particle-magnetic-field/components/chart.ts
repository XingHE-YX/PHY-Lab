import { svg, html } from "lit";
import { guard } from "lit/directives/guard.js";
import { at, replaySpan, sample, type Orbit } from "../model/physics";
import { number, type Messages } from "../locales/messages";
import type { Snapshot } from "../model/snapshot";

export function plot(
  model: Orbit,
  progress: number,
  view: Snapshot["view"],
  text: Messages,
) {
  const energy = view === "energy";
  const x = (time: number) => 49 + 106 * time;
  const top = 23;
  const bottom = 174;
  const timeEnd = model.timeUnit * replaySpan * 1e6;
  const maximum = energy
    ? model.energy > 0
      ? model.energy * 1.25
      : 1
    : model.speed / 1000 || 1;
  const minimum = energy ? 0 : -maximum;
  const y = (value: number) =>
    bottom - ((value - minimum) / (maximum - minimum)) * (bottom - top);
  const ticks = [maximum, (maximum + minimum) / 2, minimum];
  const line = (component: "vx" | "vy", points: ReturnType<typeof sample>) =>
    points
      .map(
        (point) =>
          `${x(point.time / model.timeUnit).toFixed(2)},${y(point[component] / 1000).toFixed(2)}`,
      )
      .join(" ");
  const current = at(model, progress);
  const componentValue = (value: number) => Number((value / 1000).toFixed(1));
  return html` <svg
      class="plot"
      viewBox="0 0 288 218"
      role="img"
      aria-label=${text.view[view]}
    >
      <text class="scene-label" x="49" y="14">
        ${energy ? "K (eV)" : "v (km/s)"}
      </text>
      ${ticks.map(
        (
          value,
        ) => svg`<g><line class="grid-line" x1="49" x2="261" y1=${y(value)} y2=${y(value)} />
        <text class="scene-label" text-anchor="end" x="44" y=${y(value) + 4}>${number(value)}</text></g>`,
      )}
      ${[0, 1, 2].map(
        (
          time,
        ) => svg`<g><line class="grid-line" x1=${x(time)} x2=${x(time)} y1=${top} y2=${bottom} />
        <text class="scene-label" text-anchor="middle" x=${x(time)} y="193">${number((timeEnd * time) / replaySpan)}</text></g>`,
      )}
      <text class="scene-label" text-anchor="end" x="261" y="211">t (μs)</text>
      <line
        class="cursor"
        x1=${x(progress)}
        x2=${x(progress)}
        y1=${top}
        y2=${bottom}
      />
      ${
        energy
          ? svg`
        <line class="trace energy" x1="49" x2="261" y1=${y(model.energy)} y2=${y(model.energy)} />
        <circle class="chart-point energy" cx=${x(progress)} cy=${y(model.energy)} r="3.5" />
      `
          : svg`
        ${guard([model], () => {
          const points = sample(model, replaySpan, 120);
          return svg`<polyline class="trace horizontal" points=${line("vx", points)} />
            <polyline class="trace vertical" points=${line("vy", points)} />`;
        })}
        <circle class="chart-point horizontal" cx=${x(progress)} cy=${y(current.vx / 1000)} r="3.5" />
        <circle class="chart-point vertical" cx=${x(progress)} cy=${y(current.vy / 1000)} r="3.5" />
      `
      }
    </svg>
    <div class="plot-legend">
      ${energy ? html`<span class="energy">K ${number(model.energy)} eV</span>` : html`<span class="horizontal">vₓ ${componentValue(current.vx)}</span><span class="vertical">vᵧ ${componentValue(current.vy)}</span><span class="plot-unit">km/s</span>`}
    </div>`;
}
