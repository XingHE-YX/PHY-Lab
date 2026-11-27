import { css } from "lit";

export const styles = css`
  :host {
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    color: var(--text);
    font-family: var(--font);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font: inherit;
    min-height: 36px;
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 5px 6px;
    color: var(--text);
    background: var(--surface);
    font-size: 11px;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  button:hover:not(:disabled) {
    background: var(--subtle);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button.selected {
    color: var(--primary);
    background: var(--primary-soft);
    border-color: var(--primary);
  }
  :focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  h1,
  h2,
  h3,
  p {
    margin: 0;
  }
  h1 {
    font-size: 20px;
    font-weight: 550;
    white-space: nowrap;
    letter-spacing: -0.5px;
  }
  h2,
  h3 {
    font-size: 12px;
    font-weight: 550;
  }
  p {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  small {
    color: var(--muted);
  }
  .mono,
  output {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .heading-main {
    display: flex;
    align-items: baseline;
    gap: 12px;
    min-width: 0;
  }
  .subtitle,
  .model-note {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
  }
  .fallback-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lab {
    display: grid;
    grid-template-columns: 224px minmax(420px, 1fr) 350px;
    gap: 8px;
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 41px;
    padding: 0 13px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    white-space: nowrap;
  }
  .motion-status,
  .status {
    font-size: 10.5px;
    color: var(--muted);
  }
  .status.active {
    color: var(--primary);
  }
  .parameters {
    display: grid;
    gap: 10px;
    padding: 11px 13px;
  }
  .segmented-field,
  .parameter {
    display: grid;
    gap: 4px;
    font-size: 12px;
  }
  .segmented-field > span {
    font-size: 12px;
    line-height: 16px;
  }
  .segmented-field phy-radio-group {
    --radio-height: 29px;
    --radio-font-size: 11px;
  }
  .parameter.muted-param .parameter-label output {
    color: var(--muted);
  }
  .parameter-label,
  .limits {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }
  .parameter-label {
    font-size: 12px;
    line-height: 16px;
  }
  .parameter-label output {
    font-size: 11px;
  }
  .rest-tag {
    font-family: var(--font);
    font-size: 10px;
    color: var(--muted);
    margin-left: 3px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .derived-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 2px 13px 0;
    padding: 10px 0;
    border-top: 1px solid var(--border);
  }
  .derived-metrics > div {
    font-size: 10px;
    line-height: 14px;
    min-width: 0;
  }
  .derived-metrics span {
    display: block;
    color: var(--muted);
    margin-bottom: 2px;
  }
  .derived-metrics output {
    font-size: 11.5px;
    color: var(--text);
  }
  .parameter-footer {
    display: grid;
    gap: 6px;
    padding: 10px 13px;
    margin-top: auto;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .parameter-footer phy-button {
    display: block;
  }
  .parameter-footer small {
    font-size: 10px;
    line-height: 1.45;
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 180px;
    padding: 6px 8px;
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
  }
  .wave-field,
  .timing-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .field-edge,
  .field-grid,
  .track-axis,
  .track-tick,
  .wavefront,
  .motion-arrow,
  .glyph,
  .receive-pulse,
  .scrub-ring,
  .wavelength-leader,
  .wavelength-span,
  .time-grid,
  .timing-axis,
  .crest-tick,
  .chart-cursor {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .field-edge {
    stroke: var(--border);
    stroke-opacity: 0.7;
    fill: transparent;
  }
  .field-grid,
  .time-grid {
    stroke: var(--border);
    stroke-opacity: 0.65;
  }
  .track-axis,
  .track-tick,
  .timing-axis {
    stroke: var(--muted);
  }
  .track-axis,
  .chart-cursor {
    stroke-dasharray: 3 4;
  }
  .wavefront {
    stroke: var(--blue);
    stroke-width: 1.35;
  }
  .wavefront.hitting,
  .receive-pulse {
    stroke: var(--green);
    stroke-opacity: 1;
    stroke-width: 2.1;
  }
  .wavelength-leader {
    stroke: var(--primary);
    stroke-opacity: 0.6;
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .wavelength-span {
    stroke: var(--primary);
    stroke-width: 1.8;
    stroke-linecap: round;
  }
  .wavelength-dot {
    fill: var(--primary);
  }
  .wavelength-label {
    fill: var(--primary);
    font: 550 11px var(--mono);
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
  }
  .scene-note {
    fill: var(--muted);
    font-size: 11px;
  }
  .svg-label {
    fill: var(--muted);
    font: 10.5px var(--mono);
  }
  .actor-label {
    font-size: 12px;
    font-weight: 600;
    fill: currentColor;
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
  }
  .vector-label {
    font: 600 10.5px var(--mono);
    fill: currentColor;
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
  }
  .source,
  .emission-row {
    color: var(--blue);
  }
  .observer,
  .reception-row {
    color: var(--green);
  }
  .object-body {
    fill: var(--surface);
    stroke: currentColor;
    stroke-width: 2;
  }
  .scrub-ring {
    stroke: currentColor;
    stroke-opacity: 0.25;
    stroke-width: 1.5;
    stroke-dasharray: 3 3;
  }
  .object-hit {
    fill: transparent;
  }
  .scrubbable {
    cursor: ew-resize;
    outline: none;
    touch-action: none;
  }
  .scrubbable:hover .scrub-ring,
  .scrubbable:focus-visible .scrub-ring {
    stroke-opacity: 0.7;
  }
  .scrubbable:focus-visible .object-hit {
    stroke: currentColor;
    stroke-width: 2;
  }
  .glyph,
  .motion-arrow {
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .layer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    font-size: 11px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .layer-controls > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .layer-hint {
    font-size: 10px;
    color: var(--muted);
    white-space: nowrap;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readouts > div {
    padding: 8px 10px;
    min-width: 0;
  }
  .readouts > div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span {
    display: block;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted);
    margin-bottom: 3px;
  }
  .readouts output {
    display: block;
    font-size: 17px;
    line-height: 22px;
    font-weight: 500;
  }
  .readouts small {
    font-size: 10px;
  }
  .emitted output {
    color: var(--blue);
  }
  .received output {
    color: var(--green);
  }
  .timeline {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font: 10px var(--mono);
    flex-shrink: 0;
  }
  .timeline phy-slider {
    flex: 1;
    min-width: 0;
  }
  .timeline span {
    white-space: nowrap;
  }
  .time-label {
    color: var(--text);
    padding-left: 9px;
    border-left: 1px solid var(--border);
    font-size: 10.5px;
  }
  .moments {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .moments button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 5px 4px;
    line-height: 1.25;
  }
  .moments button small {
    font: 10px var(--mono);
  }
  .observation-tabs {
    flex: 1;
    min-height: 0;
    --tab-height: 42px;
  }
  .observation-tabs::part(panel) {
    display: flex;
    flex-direction: column;
  }
  .exploring .observation-tabs {
    flex: 0 0 auto;
  }
  .observation {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .timing,
  .comparison {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 10px 12px;
    gap: 8px;
  }
  .chart-wrap {
    flex: 1;
    min-height: 168px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .timing-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .chart-hint {
    flex-shrink: 0;
  }
  .row-label {
    fill: currentColor;
    font-size: 12px;
    font-weight: 600;
  }
  .period-band {
    fill: currentColor;
    fill-opacity: 0.1;
  }
  .crest-tick {
    stroke: currentColor;
    stroke-width: 1.7;
  }
  .crest-tick.highlighted {
    stroke-width: 4;
  }
  .cursor-dot {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1.4;
  }
  .chart-cursor {
    stroke: var(--text);
  }
  .comparison-list {
    display: grid;
    gap: 7px;
    margin-block: auto;
  }
  .comparison-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 52px;
    gap: 6px 8px;
    padding: 8px 10px;
    min-height: 0;
    text-align: left;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .comparison-row[data-active] {
    border-color: var(--primary);
    background: var(--primary-soft);
  }
  .comparison-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    grid-column: 1 / -1;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 500;
  }
  .comparison-label output {
    color: var(--green);
    font-size: 12px;
  }
  .bar {
    position: relative;
    height: 7px;
    align-self: center;
    border-radius: var(--radius);
    background: var(--subtle);
  }
  .bar::before {
    content: "";
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 1px;
    left: 50%;
    background: var(--muted);
  }
  .bar span {
    position: absolute;
    inset-block: 0;
    background: var(--green);
    opacity: 0.85;
  }
  .relative {
    text-align: right;
    font-size: 10.5px;
    color: var(--muted);
  }
  .comp-scale {
    display: flex;
    justify-content: space-between;
    margin-right: 68px;
    padding-left: 8px;
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .role-contrast {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: var(--subtle);
  }
  .role-contrast-body {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .role-contrast-body span {
    font-size: 10px;
    color: var(--muted);
  }
  .role-contrast-body output {
    font-size: 11.5px;
    color: var(--text);
  }
  .role-contrast-body small {
    font-size: 10px;
  }
  .switch-role {
    min-height: 28px;
    padding: 4px 9px;
    font-size: 10.5px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .support {
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .exploring .support {
    flex: 1;
    min-height: 0;
  }
  .exploring .support::part(panel) {
    display: flex;
    flex-direction: column;
  }
  .exploring .support-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .support-tabs {
    --tab-height: 30px;
    --tab-font-size: 11px;
    --tab-flex: 0 0 auto;
    --tab-gap: 5px;
    --tab-padding: 4px 10px;
  }
  .support-tabs::part(tabs) {
    padding: 8px 12px 0;
  }
  .model-formula {
    padding: 10px 12px 12px;
  }
  .model-formula p {
    margin-top: 6px;
  }
  .model-formula phy-math {
    font-size: 13.5px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 6px;
  }
  .explore-content {
    padding: 10px 12px;
  }
  .explore-hint {
    margin-bottom: 10px;
  }
  .scenario-grid {
    display: grid;
    gap: 9px;
  }
  .scenario-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 9px 11px;
  }
  .scenario-card h3 {
    font-size: 12px;
    margin-bottom: 5px;
  }
  .scenario-card p {
    margin-bottom: 8px;
    line-height: 1.55;
  }
  .scenario-card button {
    min-height: 28px;
    padding: 4px 10px;
    font-size: 11px;
  }
  @media (max-height: 760px) {
    .parameters {
      gap: 8px;
      padding: 9px 13px;
    }
    .derived-metrics {
      padding: 8px 0;
      gap: 6px 8px;
    }
    .parameter-footer {
      padding: 8px 13px;
      gap: 5px;
    }
    .readouts > div {
      padding: 6px 9px;
    }
    .readouts output {
      font-size: 15.5px;
      line-height: 20px;
    }
    .timeline {
      padding: 6px 12px;
    }
    .moments {
      padding: 6px 10px;
    }
    .moments button {
      min-height: 32px;
      padding: 3px 4px;
    }
    .timing,
    .comparison {
      padding: 8px 11px;
      gap: 6px;
    }
    .comparison-row {
      padding: 6px 9px;
      gap: 4px 8px;
    }
    .role-contrast {
      padding: 6px 9px;
    }
    .model-formula {
      padding: 8px 12px 10px;
    }
  }
  @media (max-height: 690px) {
    :host {
      height: auto;
      min-height: 590px;
      grid-template-rows: 38px minmax(540px, 1fr);
    }
  }
`;
