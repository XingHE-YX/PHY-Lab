import { html } from "lit";
import type { Messages } from "../locales/messages";
import { objectFor, scenarios, solve, type Image } from "../model/optics";

export function signed(value: number | null, unit = "") {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}${unit ? ` ${unit}` : ""}`;
}

export function details(image: Image, t: Messages) {
  const location =
    image.kind === "real"
      ? t.oppositeSide
      : image.kind === "virtual"
        ? t.objectSide
        : "—";
  return html`
    <section class="detail-card">
      <h3 data-kind=${image.kind}>${t[image.kind]}</h3>
      <dl>
        <div>
          <dt>${t.location}</dt>
          <dd>${location}</dd>
        </div>
        <div>
          <dt>${t.imageDistance}</dt>
          <dd>${signed(image.distance, "cm")}</dd>
        </div>
        <div>
          <dt>${t.magnification}</dt>
          <dd>${signed(image.magnification, "×")}</dd>
        </div>
        <div>
          <dt>${t.imageHeight}</dt>
          <dd>${signed(image.height, "cm")}</dd>
        </div>
      </dl>
    </section>
  `;
}

export function comparisons(focal: number, active: number, t: Messages) {
  return html`
    <div class="comparison-panel">
      <table aria-label=${t.compare} class="comparison">
        <thead>
          <tr>
            <th scope="col">u (cm)</th>
            <th scope="col">v (cm)</th>
            <th scope="col">M (×)</th>
          </tr>
        </thead>
        <tbody>
          ${scenarios.map((scenario) => {
            const object = objectFor(scenario, focal);
            const { image } = solve({ focal, object });
            return html`<tr
              data-scenario=${scenario}
              ?data-current=${object === active}
            >
              <th scope="row">
                ${object.toFixed(1)}<small>${t[image.kind]}</small>
              </th>
              <td>${signed(image.distance)}</td>
              <td>${signed(image.magnification)}</td>
            </tr>`;
          })}
        </tbody>
      </table>
      <p>${t.comparisonHint}</p>
    </div>
  `;
}
