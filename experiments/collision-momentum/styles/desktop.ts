import { css } from "lit";

export const styles = css`
  :host {
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr);
    gap: 8px;
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
  h1,
  h2,
  h3,
  p {
    margin: 0;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
  }
  h2,
  h3 {
    font-size: 12px;
    font-weight: 600;
  }
  p {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  output {
    font: 12px/18px var(--mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .heading {
    display: flex;
    align-self: center;
    align-items: baseline;
    gap: 12px;
  }
  .fallback-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .lab {
    display: grid;
    grid-template-columns: 232px minmax(0, 1fr) 348px;
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
    gap: 10px;
    min-height: 43px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-heading phy-checkbox {
    margin-left: auto;
    font-size: 11px;
    color: var(--muted);
  }
  .phase {
    color: var(--muted);
    font-size: 11px;
  }
  .parameters {
    display: grid;
    gap: 10px;
    padding: 10px 12px;
  }
  .field-label,
  .parameter {
    display: grid;
    gap: 2px;
    font-size: 12px;
  }
  .cart-parameters {
    display: grid;
    gap: 4px;
  }
  .cart-parameters + .cart-parameters {
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }
  .parameter-label,
  .limits {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    line-height: 17px;
    gap: 4px;
  }
  .limits {
    color: var(--muted);
    font: 10px/12px var(--mono);
  }
  .footer {
    display: grid;
    gap: 6px;
    margin-top: auto;
    padding: 8px 12px;
  }
  .footer p {
    font-size: 11px;
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    padding: 8px;
    background: var(--bg);
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
    font-size: 12px;
  }
  .scale-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .grid-guide,
  .track-edge,
  .track-tick,
  .arrow,
  .vector-guide,
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
    font: 600 14px var(--mono);
  }
  .vector-guide {
    stroke: currentColor;
    stroke-opacity: 0.5;
    stroke-dasharray: 2 4;
  }
  .arrow {
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
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
  .vector.editable:focus-visible .arrow-hit {
    stroke: currentColor;
    stroke-width: 2;
  }
  .coupler {
    stroke: var(--green);
    stroke-width: 2;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readouts > div {
    padding: 8px 10px;
  }
  .readouts > div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span {
    display: block;
    font-size: 11px;
    line-height: 16px;
    color: var(--muted);
  }
  .readouts output {
    display: block;
    font-size: 16px;
    line-height: 24px;
  }
  .readouts small {
    font-size: 10px;
  }
  .readouts .kinetic output {
    color: var(--green);
  }
  .timeline {
    display: grid;
    gap: 6px;
    padding: 8px 12px;
    flex-shrink: 0;
  }
  .time-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
    line-height: 18px;
  }
  .moments {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .totals {
    padding: 10px 12px 0;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .totals table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    margin-top: 6px;
    font-size: 11px;
  }
  .totals th,
  .totals td {
    text-align: right;
    padding: 4px 4px;
    line-height: 15px;
  }
  .totals th:first-child {
    width: 43%;
    text-align: left;
    padding-left: 0;
  }
  .totals thead th {
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    font-weight: 500;
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
    font: 10px var(--mono);
  }
  .totals td {
    font: 12px var(--mono);
  }
  .conversion {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
    padding: 6px 4px 6px 0;
    font-size: 11px;
  }
  .conversion output {
    color: var(--green);
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
  .observation {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    flex: 1;
    min-height: 0;
  }
  .legend {
    display: flex;
    gap: 6px 14px;
    padding: 8px 12px 0;
    font-size: 11px;
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
    min-height: 0;
    padding: 6px 4px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .quantity-chart {
    cursor: crosshair;
  }
  .contact-line {
    stroke: var(--muted);
    stroke-dasharray: 3 4;
  }
  .chart-cursor {
    stroke: var(--primary);
    opacity: 0.8;
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
    stroke-width: 2;
  }
  .kinetic .aggregate {
    color: var(--green);
  }
  .chart-point {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1.1;
  }
  .model-formula {
    min-height: 89px;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
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
  @media (max-height: 690px) {
    :host {
      height: auto;
      min-height: 590px;
      grid-template-rows: 38px minmax(540px, 1fr);
    }
  }
`;
