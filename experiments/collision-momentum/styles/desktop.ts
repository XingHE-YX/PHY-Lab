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
    --cart-b: light-dark(#96502c, #e3a17e);
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
  .phase,
  .status {
    font-size: 10.5px;
    color: var(--muted);
  }
  .status.active {
    color: var(--primary);
  }
  .parameters {
    display: grid;
    gap: 8px;
    padding: 10px 13px;
  }
  .segmented-field,
  .parameter {
    display: grid;
    gap: 3px;
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
  .cart-parameters {
    display: grid;
    gap: 5px;
    padding-top: 7px;
    border-top: 1px solid var(--border);
  }
  .cart-heading {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }
  .cart-heading output {
    font-size: 10.5px;
    color: var(--muted);
  }
  .parameter-label,
  .limits {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    line-height: 16px;
    gap: 4px;
  }
  .parameter-label {
    font-size: 11.5px;
  }
  .parameter-label output {
    font-size: 11px;
  }
  .limits {
    color: var(--muted);
    font: 10px/12px var(--mono);
  }
  .parameter-footer {
    display: grid;
    gap: 6px;
    margin-top: auto;
    padding: 9px 13px;
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
  .cart-scene,
  .quantity-chart {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: block;
    user-select: none;
  }
  .scene-note {
    fill: var(--muted);
    font-size: 11px;
  }
  .coupled-note {
    fill: var(--green);
    font-size: 11.5px;
    font-weight: 550;
  }
  .scale-label {
    fill: var(--muted);
    font: 10.5px var(--mono);
  }
  .grid-guide,
  .track-edge,
  .track-tick,
  .arrow,
  .vector-guide,
  .cm-guide,
  .impact-flash,
  .plot-grid,
  .plot-axis,
  .contact-line,
  .chart-cursor,
  .trace,
  .coupler {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .track-fill {
    fill: var(--subtle);
  }
  .grid-guide,
  .plot-grid {
    stroke: var(--border);
    stroke-opacity: 0.65;
  }
  .track-edge,
  .track-tick,
  .plot-axis {
    stroke: var(--muted);
  }
  .left {
    color: var(--blue);
  }
  .right {
    color: var(--cart-b);
  }
  .left-top {
    stop-color: light-dark(#5681d1, #648ee5);
  }
  .left-bottom {
    stop-color: light-dark(#2d55a2, #365aa3);
  }
  .right-top {
    stop-color: light-dark(#ba744d, #ca895f);
  }
  .right-bottom {
    stop-color: light-dark(#8c482b, #8e563a);
  }
  .chassis {
    stroke: currentColor;
    stroke-opacity: 0.45;
  }
  .wheel {
    fill: var(--text);
    stroke: var(--bg);
    stroke-width: 1.3;
  }
  .cart-letter {
    fill: white;
    font: 600 13.5px var(--mono);
  }
  .cart-mass {
    fill: rgba(255, 255, 255, 0.88);
    font: 500 9.5px var(--mono);
  }
  .vector-guide {
    stroke: currentColor;
    stroke-opacity: 0.48;
    stroke-dasharray: 2 4;
  }
  .arrow {
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  .vector-label {
    fill: currentColor;
    font: 600 10.5px var(--mono);
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
  }
  .arrow-hit {
    fill: transparent;
    stroke: transparent;
  }
  .arrow-grip {
    fill: var(--surface);
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .vector.editable {
    cursor: ew-resize;
    outline: none;
    touch-action: none;
  }
  .vector.editable:hover .arrow-grip {
    fill: currentColor;
  }
  .vector.editable:focus-visible .arrow-hit {
    stroke: currentColor;
    stroke-width: 2;
  }
  .cm-guide {
    stroke: var(--primary);
    stroke-opacity: 0.42;
    stroke-dasharray: 3 4;
  }
  .cm-marker {
    fill: var(--primary);
    stroke: var(--surface);
    stroke-width: 1.4;
  }
  .cm-label {
    fill: var(--primary);
    font: 550 10.5px var(--mono);
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
  }
  .impact-flash {
    stroke: var(--green);
    stroke-width: 2.2;
    stroke-dasharray: 3 3;
  }
  .coupler {
    stroke: var(--green);
    stroke-width: 2;
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
  .readouts .kinetic output {
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
  .totals {
    padding: 7px 12px 0;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .totals table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 11px;
  }
  .totals th,
  .totals td {
    text-align: right;
    padding: 3px 4px;
    line-height: 15px;
  }
  .totals th:first-child {
    width: 45%;
    text-align: left;
    padding-left: 0;
  }
  .totals thead th {
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    font-weight: 500;
    font-size: 10.5px;
  }
  .totals thead th[data-current] {
    color: var(--primary);
  }
  .totals tbody th {
    color: var(--text);
    font-weight: 500;
  }
  .totals small {
    display: inline-block;
    color: var(--muted);
    font: 9.5px var(--mono);
  }
  .totals td {
    font: 11.5px var(--mono);
  }
  .conversion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
    padding: 5px 4px 5px 0;
    font-size: 10.5px;
  }
  .conversion-val {
    white-space: nowrap;
  }
  .conversion output {
    color: var(--green);
    font-size: 11.5px;
  }
  .transfer-pct {
    font: 10px var(--mono);
    color: var(--muted);
    margin-left: 3px;
  }
  .legend {
    display: flex;
    gap: 6px 14px;
    padding: 7px 12px 0;
    font-size: 10.5px;
    flex-shrink: 0;
  }
  .legend span::before {
    content: "";
    display: inline-block;
    width: 12px;
    border-top: 2px solid;
    margin: 0 4px 3px 0;
  }
  .legend .left::before {
    border-top-style: dashed;
  }
  .legend .right::before {
    border-top-style: dotted;
  }
  .chart-wrap {
    flex: 1;
    min-height: 152px;
    padding: 4px 4px 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .quantity-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .chart-hint {
    padding: 2px 12px 8px;
    flex-shrink: 0;
  }
  .contact-line {
    stroke: var(--muted);
    stroke-dasharray: 3 4;
  }
  .contact-tag {
    fill: var(--muted);
    font: 550 10px var(--mono);
  }
  .chart-cursor {
    stroke: var(--primary);
    opacity: 0.85;
  }
  .trace {
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .trace.left {
    stroke-dasharray: 6 4;
  }
  .trace.right {
    stroke-dasharray: 2 4;
  }
  .trace.aggregate {
    stroke-width: 2.1;
  }
  .kinetic .aggregate {
    color: var(--green);
  }
  .chart-point {
    fill: currentColor;
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
  .model-formula p {
    margin-top: 6px;
  }
  .model-formula phy-math {
    font-size: 13px;
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
      gap: 6px;
      padding: 8px 12px;
    }
    .cart-parameters {
      gap: 3px;
      padding-top: 5px;
    }
    .parameter {
      gap: 1px;
    }
    .parameter-footer {
      padding: 7px 12px;
      gap: 4px;
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
    .totals {
      padding: 5px 11px 0;
    }
    .totals th,
    .totals td {
      padding: 2px 4px;
    }
    .conversion {
      padding: 4px 4px 4px 0;
    }
    .legend {
      padding: 5px 12px 0;
    }
    .chart-hint {
      padding: 2px 12px 6px;
    }
    .model-formula {
      padding: 7px 12px 9px;
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
