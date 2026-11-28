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
    --positive: light-dark(#ad5436, #ef9c77);
    --positive-body: light-dark(#a94831, #a34e38);
    --negative-body: light-dark(#3261a9, #486fb7);
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
  .coordinates,
  .status {
    color: var(--muted);
    font-size: 10.5px;
    white-space: nowrap;
  }
  .parameters {
    display: grid;
    gap: 11px;
    padding: 11px 13px;
  }
  .parameter {
    display: grid;
    gap: 4px;
  }
  .parameter + .parameter {
    border-top: 1px solid var(--border);
    padding-top: 11px;
  }
  .parameter-label,
  .limits {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px;
  }
  .parameter-label output {
    font-size: 11.5px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .charge-position {
    color: var(--muted);
    font-size: 10.5px;
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
    margin-top: auto;
    padding: 10px 13px;
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
  .positive {
    color: var(--positive);
  }
  .negative {
    color: var(--blue);
  }
  .zero,
  .neutral {
    color: var(--muted);
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    min-height: 180px;
    grid-template-rows: minmax(0, 1fr);
    padding: 6px 8px;
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
  }
  .field-scene,
  .slice-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .field-layers {
    pointer-events: none;
  }
  .field-board {
    fill: transparent;
    stroke: var(--border);
    stroke-opacity: 0.72;
    cursor: crosshair;
  }
  .grid-line,
  .world-axis,
  .contour,
  .arrow-tier,
  .component-arrow,
  .probe-arrow,
  .slice-guide,
  .profile-trace,
  .profile-cursor,
  .mini-ring,
  .mini-axis,
  .mini-sum-guide,
  .mini-vec {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .grid-line {
    stroke: var(--border);
    stroke-opacity: 0.65;
  }
  .world-axis {
    stroke: var(--muted);
    stroke-opacity: 0.5;
    stroke-dasharray: 3 4;
  }
  .axis-label {
    fill: var(--muted);
    font: 10.5px var(--mono);
  }
  .slice-slope {
    fill: var(--green);
    font: 550 10.5px var(--mono);
  }
  .contour {
    stroke: currentColor;
    stroke-width: 1.25;
    stroke-opacity: 0.74;
  }
  .contour.negative {
    stroke-dasharray: 3 3;
  }
  .contour.zero {
    stroke: var(--text);
    stroke-width: 2;
    stroke-opacity: 0.88;
  }
  .arrow-tier {
    stroke: var(--muted);
    stroke-width: 1.1;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .arrow-tier.low {
    stroke-opacity: 0.34;
  }
  .arrow-tier.mid {
    stroke-opacity: 0.54;
  }
  .arrow-tier.high {
    stroke-opacity: 0.78;
  }
  .component-arrow {
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-opacity: 0.72;
    stroke-dasharray: 3 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .probe-arrow {
    stroke: var(--green);
    stroke-width: 2.3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .slice-guide,
  .profile-cursor {
    stroke: var(--green);
    stroke-dasharray: 4 5;
    stroke-opacity: 0.72;
  }
  .excluded-zone {
    fill: var(--bg);
    fill-opacity: 0.75;
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .handle {
    cursor: grab;
    touch-action: none;
    outline: none;
  }
  .handle:active {
    cursor: grabbing;
  }
  .handle-hit {
    fill: transparent;
    stroke: transparent;
  }
  .handle:focus-visible .handle-hit {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .handle-core {
    stroke: var(--surface);
    stroke-width: 1.3;
  }
  .handle.positive .handle-core {
    fill: var(--positive-body);
  }
  .handle.negative .handle-core {
    fill: var(--negative-body);
  }
  .handle.neutral .handle-core {
    fill: var(--muted);
  }
  .handle-label {
    fill: var(--text);
    stroke: var(--surface);
    stroke-width: 3px;
    paint-order: stroke;
    font: 600 11px var(--mono);
    pointer-events: none;
  }
  .sign {
    fill: white;
    font: 700 13px var(--mono);
    pointer-events: none;
  }
  .probe .handle-core {
    fill: var(--surface);
    stroke: var(--green);
    stroke-width: 2;
  }
  .probe .probe-dot {
    fill: var(--green);
  }
  .probe.masked .handle-core {
    stroke: var(--red);
    stroke-dasharray: 3 2;
  }
  .probe.masked .probe-dot {
    fill: var(--red);
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
  .layer-switches {
    display: flex;
    align-items: center;
    gap: 11px;
    white-space: nowrap;
  }
  .legend {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 10px;
    line-height: 14px;
    white-space: nowrap;
  }
  .legend span::before {
    content: "";
    display: inline-block;
    width: 12px;
    border-top: 1.5px solid;
    margin: 0 4px 3px 0;
  }
  .legend span.negative::before {
    border-top-style: dashed;
  }
  .legend span.zero::before {
    border-top-width: 2px;
    color: var(--text);
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
  .readouts .strength output {
    color: var(--green);
  }
  .readouts .potential output {
    color: var(--blue);
  }
  .shortcuts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .shortcuts button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 5px 4px;
    line-height: 1.25;
  }
  .shortcuts button small {
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
  .contribution-panel,
  .slice-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 10px 12px;
    gap: 10px;
  }
  .contributions {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11.5px;
    flex-shrink: 0;
  }
  .contributions th,
  .contributions td {
    border-bottom: 1px solid var(--border);
    padding: 6px 4px;
    line-height: 16px;
    text-align: right;
  }
  .contributions th:first-child {
    width: 21%;
    text-align: left;
  }
  .contributions thead th,
  .contributions small {
    color: var(--muted);
  }
  .contributions small {
    font-size: 9px;
  }
  .contributions td {
    font: 11.5px var(--mono);
  }
  .contributions tr[data-contribution="total"] {
    background: var(--subtle);
  }
  .superposition-visual {
    display: grid;
    grid-template-columns: 124px minmax(0, 1fr);
    gap: 8px;
    margin-block: auto;
    align-items: stretch;
  }
  .mini-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 7px 8px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: var(--surface);
  }
  .mini-title {
    font-size: 10px;
    color: var(--muted);
    line-height: 13px;
  }
  .vector-mini {
    width: 100%;
    height: 98px;
    display: block;
  }
  .mini-ring {
    stroke: var(--border);
    stroke-dasharray: 2 3;
  }
  .mini-axis {
    stroke: var(--border);
  }
  .mini-sum-guide {
    stroke: var(--muted);
    stroke-opacity: 0.4;
    stroke-dasharray: 2 2;
  }
  .mini-vec {
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .mini-vec.net {
    stroke: var(--green);
    stroke-width: 2.2;
  }
  .mini-origin {
    fill: var(--green);
  }
  .mini-origin.masked {
    fill: var(--red);
  }
  .scalar-bars {
    display: grid;
    gap: 9px;
    margin-block: auto;
  }
  .scalar-row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) 44px;
    align-items: center;
    gap: 5px;
    font-size: 10.5px;
  }
  .scalar-row > span {
    color: var(--muted);
    font-family: var(--mono);
  }
  .scalar-row output {
    text-align: right;
    font-size: 10.5px;
  }
  .scalar-track {
    position: relative;
    height: 7px;
    border-radius: 2px;
    background: var(--subtle);
  }
  .scalar-track::before {
    content: "";
    position: absolute;
    top: -2px;
    bottom: -2px;
    left: 50%;
    width: 1px;
    background: var(--muted);
  }
  .scalar-fill {
    position: absolute;
    inset-block: 0;
    border-radius: 1px;
  }
  .scalar-fill.positive {
    background: var(--positive);
  }
  .scalar-fill.negative {
    background: var(--blue);
  }
  .scalar-fill.neutral {
    background: var(--muted);
  }
  .scalar-fill.total {
    background: var(--text);
  }
  .chart-wrap {
    flex: 1;
    min-height: 176px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .slice-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .slice-panel.empty {
    align-items: center;
    justify-content: center;
  }
  .panel-hint {
    flex-shrink: 0;
  }
  .profile-trace {
    stroke: var(--blue);
    stroke-width: 2;
  }
  .profile-probe {
    fill: var(--green);
    stroke: var(--surface);
    stroke-width: 1.2;
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
    padding: 9px 12px 11px;
  }
  .case-note {
    min-height: 34px;
    margin-bottom: 5px;
  }
  .model-formula strong {
    display: block;
    color: var(--green);
    font-size: 11.5px;
    line-height: 16px;
  }
  .model-formula strong[data-case="masked"] {
    color: var(--red);
  }
  .model-formula p {
    margin-top: 2px;
  }
  .model-formula phy-math {
    display: block;
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
    .parameter + .parameter {
      padding-top: 8px;
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
    .shortcuts {
      padding: 6px 10px;
    }
    .shortcuts button {
      min-height: 32px;
      padding: 3px 4px;
    }
    .contribution-panel,
    .slice-panel {
      padding: 8px 11px;
      gap: 7px;
    }
    .contributions th,
    .contributions td {
      padding: 4px 4px;
    }
    .vector-mini {
      height: 82px;
    }
    .scalar-bars {
      gap: 6px;
    }
    .model-formula {
      padding: 7px 12px 9px;
    }
    .case-note {
      min-height: 30px;
      margin-bottom: 4px;
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
