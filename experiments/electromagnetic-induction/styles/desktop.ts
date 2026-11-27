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
    --copper: light-dark(#936042, #d69c79);
    --emf-color: light-dark(#974322, #f2a484);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h1,
  h2,
  p {
    margin: 0;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
  }
  h2 {
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
    gap: 8px;
    margin-left: auto;
  }
  .lab {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 348px;
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
    min-height: 43px;
    padding: 8px 12px;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-heading phy-checkbox {
    font-size: 11px;
    color: var(--muted);
  }
  .parameters {
    display: grid;
    gap: 12px;
    padding: 12px;
  }
  .parameter,
  .polarity {
    display: grid;
    gap: 3px;
  }
  .parameter-label,
  .limits {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 4px;
    font-size: 12px;
    line-height: 18px;
  }
  .polarity {
    font-size: 12px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .position {
    display: grid;
    gap: 8px;
    padding: 12px;
    border-block: 1px solid var(--border);
  }
  .position > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .position span {
    font-size: 11px;
    color: var(--muted);
  }
  .source-footer {
    display: grid;
    gap: 8px;
    padding: 12px;
    margin-top: auto;
  }
  .source-footer p {
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
  .apparatus,
  .trace-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .scene-title {
    fill: var(--text);
    font-size: 13px;
    font-weight: 600;
  }
  .svg-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .scene-note {
    fill: var(--muted);
    font-size: 12px;
  }
  .axis-line,
  .rail,
  .rail-tick,
  .coil-plane,
  .coil-turn,
  .coil-wire,
  .coil-bridge,
  .magnet-edge,
  .measure,
  .external-arrow,
  .induced-arrow,
  .face-ring,
  .current-arrow,
  .chart-grid,
  .chart-cursor,
  .trace {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .axis-line,
  .rail-tick,
  .measure,
  .chart-cursor {
    stroke: var(--muted);
  }
  .axis-line,
  .coil-plane,
  .measure,
  .chart-cursor {
    stroke-dasharray: 3 4;
  }
  .rail,
  .coil-plane,
  .chart-grid {
    stroke: var(--border);
  }
  .coil-turn,
  .coil-wire {
    stroke: var(--copper);
    stroke-width: 2;
  }
  .coil-bridge {
    stroke: var(--copper);
    stroke-width: 5;
  }
  .coil-turn:nth-of-type(2n) {
    stroke-opacity: 0.75;
  }
  .north-highlight {
    stop-color: light-dark(#dc624f, #d96352);
  }
  .north-shadow {
    stop-color: light-dark(#ae3629, #9d342a);
  }
  .south-highlight {
    stop-color: light-dark(#567dcc, #688fd8);
  }
  .south-shadow {
    stop-color: light-dark(#2e4e97, #37599f);
  }
  .pole {
    fill: #fff;
    font: 600 16px var(--mono);
  }
  .magnet-edge {
    stroke: var(--text);
    stroke-opacity: 0.45;
  }
  .magnet-handle {
    cursor: grab;
    touch-action: none;
    outline: none;
  }
  .magnet-handle:active {
    cursor: grabbing;
  }
  .magnet-focus {
    fill: transparent;
    stroke: transparent;
  }
  .magnet-handle:focus-visible .magnet-focus {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .external-arrow {
    stroke: var(--blue);
    stroke-width: 2;
  }
  .external-tip {
    fill: var(--blue);
  }
  .induced-arrow,
  .current-arrow {
    stroke: var(--green);
    stroke-width: 2;
  }
  .current-tip {
    fill: var(--green);
  }
  .face-ring {
    stroke: var(--muted);
    stroke-dasharray: 3 3;
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
    color: var(--muted);
    font-size: 11px;
    line-height: 16px;
  }
  .readouts output {
    display: block;
    font-size: 16px;
    line-height: 24px;
  }
  .readouts small {
    font-size: 10px;
  }
  .readouts .direction output {
    font-family: var(--font);
    font-size: 13px;
    font-weight: 600;
  }
  .readouts .direction output:not([data-direction="noCurrent"]) {
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
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: 8px;
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
  .plot-panel {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    flex: 1;
    min-height: 0;
  }
  .chart-wrap {
    min-height: 0;
    padding: 8px 4px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .trace-chart {
    cursor: crosshair;
  }
  .flux {
    color: var(--blue);
  }
  .emf {
    color: var(--emf-color);
  }
  .current {
    color: var(--green);
  }
  .trace {
    stroke: currentColor;
    stroke-width: 2;
  }
  .chart-point {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1.3;
  }
  .model-formula {
    border-top: 1px solid var(--border);
    min-height: 106px;
    padding: 12px;
  }
  .model-formula p {
    margin-top: 8px;
  }
  .model-formula phy-math {
    font-size: 14px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 6px;
  }
  @media (max-height: 780px) {
    .parameters {
      gap: 10px;
    }
    .model-formula {
      min-height: 98px;
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
