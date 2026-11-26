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
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h1,
  h2,
  p,
  dl,
  dd {
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
    gap: 12px;
    align-items: baseline;
    align-self: center;
  }
  .fallback-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-left: auto;
  }
  .lab {
    display: grid;
    grid-template-columns: 246px minmax(0, 1fr) 348px;
    gap: 8px;
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    min-height: 43px;
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
  .parameter {
    display: grid;
    gap: 2px;
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
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .periods {
    display: grid;
    gap: 10px;
    padding: 12px;
    border-block: 1px solid var(--border);
  }
  .periods > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .periods dt {
    font-size: 11px;
    color: var(--muted);
  }
  .periods output {
    font-size: 14px;
  }
  .period-increase output {
    font-weight: 650;
    color: var(--blue);
  }
  .source-footer {
    margin-top: auto;
    display: grid;
    gap: 8px;
    padding: 12px;
  }
  .source-footer p {
    font-size: 11px;
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    background: var(--bg);
    padding: 8px;
  }
  .motion-scene,
  .chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .svg-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .scene-note {
    fill: var(--muted);
    font: 12px var(--font);
  }
  .ruler,
  .vertical,
  .tick,
  .orbit,
  .rod,
  .linear-model > *,
  .acceleration,
  .axis,
  .grid-line,
  .graph-cursor,
  .trace {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .ruler,
  .tick,
  .grid-line {
    stroke: var(--border);
  }
  .vertical,
  .axis,
  .graph-cursor {
    stroke: var(--muted);
  }
  .vertical,
  .graph-cursor {
    stroke-dasharray: 3 5;
  }
  .orbit {
    stroke: var(--blue);
    stroke-opacity: 0.45;
    stroke-width: 1.4;
  }
  .rod {
    stroke: var(--text);
    stroke-width: 2;
  }
  .pivot {
    fill: var(--surface);
    stroke: var(--text);
    stroke-width: 2;
  }
  .linear-model > * {
    stroke: var(--muted);
    stroke-width: 1.6;
    stroke-dasharray: 4 4;
  }
  .bob-highlight {
    stop-color: light-dark(#b2caff, #bed3ff);
  }
  .bob-color {
    stop-color: light-dark(#4c83ed, #6a9cfb);
  }
  .bob-shadow {
    stop-color: light-dark(#1a49b2, #2e59a9);
  }
  .bob {
    stroke: var(--blue);
  }
  .bob-handle {
    cursor: grab;
    touch-action: none;
    outline: none;
  }
  .bob-handle:active {
    cursor: grabbing;
  }
  .bob-target {
    fill: transparent;
    stroke: transparent;
  }
  .bob-handle:focus-visible .bob-target {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .acceleration {
    stroke: var(--red);
    stroke-width: 2;
  }
  .acceleration-tip {
    fill: var(--red);
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readouts div {
    padding: 8px 10px;
  }
  .readouts div + div {
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
    font-size: 12px;
    line-height: 18px;
  }
  .moments {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
    grid-template-rows: auto minmax(0, 1fr) auto;
    flex: 1;
    min-height: 0;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
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
  .legend .approximation::before,
  .legend .kinetic::before {
    border-top-style: dashed;
  }
  .legend .total::before {
    border-top-style: dotted;
  }
  .chart-wrap {
    min-height: 0;
    padding: 8px 4px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .seekable {
    cursor: crosshair;
  }
  .actual,
  .potential {
    color: var(--blue);
  }
  .approximation {
    color: var(--muted);
  }
  .kinetic {
    color: var(--green);
  }
  .total {
    color: var(--text);
  }
  .acceleration-value {
    color: var(--red);
  }
  .trace {
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .trace.actual {
    stroke-width: 2.2;
  }
  .trace.approximation,
  .trace.kinetic {
    stroke-dasharray: 5 4;
  }
  .trace.total {
    stroke-dasharray: 2 4;
  }
  .chart-point {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1.2;
  }
  .chart-point.limit {
    stroke: var(--muted);
    fill: var(--surface);
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
    font-size: 13px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 5px;
  }
  @media (max-height: 780px) {
    .parameters {
      gap: 8px;
    }
    .periods {
      gap: 8px;
    }
    .model-formula {
      min-height: 96px;
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
