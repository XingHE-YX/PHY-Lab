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
    transition: background 0.15s;
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
    outline-offset: 3px;
  }
  h1,
  h2,
  h3,
  p,
  dl,
  dd {
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
    line-height: 1.55;
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
  }
  .fallback-controls {
    display: flex;
    gap: 8px;
    align-items: center;
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
    min-height: 0;
    min-width: 0;
  }
  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    min-height: 41px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    white-space: nowrap;
  }
  .panel-heading small,
  .status {
    font-size: 10px;
    color: var(--muted);
  }
  .status.running {
    color: var(--primary);
  }
  .parameters {
    display: grid;
    gap: 14px;
    padding: 12px 13px;
  }
  .parameter {
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
    line-height: 16px;
  }
  .parameter-label output {
    font-size: 11px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .periods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 8px;
    margin: 4px 13px 0;
    padding: 12px 0;
    border-top: 1px solid var(--border);
  }
  .periods > div {
    font-size: 10px;
    line-height: 14px;
  }
  .periods dt {
    color: var(--muted);
    margin-bottom: 2px;
  }
  .periods output {
    font-size: 12px;
  }
  .period-increase output {
    font-weight: 600;
    color: var(--blue);
  }
  .parameter-footer {
    margin-top: auto;
    display: grid;
    gap: 8px;
    padding: 10px 13px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .parameter-footer phy-button {
    display: block;
  }
  .parameter-footer small {
    font-size: 10px;
    line-height: 1.5;
  }
  .scene-wrap {
    position: relative;
    flex: 1;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 180px;
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
    padding: 6px 8px;
  }
  .scene-scale {
    position: absolute;
    right: 12px;
    bottom: 8px;
    font: 10px var(--mono);
    color: var(--muted);
    pointer-events: none;
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
    font: 10.5px var(--mono);
  }
  .vector-label {
    font: 600 11px var(--mono);
    pointer-events: none;
  }
  .velocity-label {
    fill: var(--green);
  }
  .acceleration-label {
    fill: var(--red);
  }
  .ruler,
  .vertical,
  .tick,
  .orbit,
  .theta-arc,
  .rod,
  .linear-model > *,
  .velocity,
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
    stroke-opacity: 0.38;
    stroke-width: 1.4;
  }
  .theta-arc {
    stroke: var(--blue);
    stroke-opacity: 0.72;
    stroke-width: 1.3;
  }
  .theta-label {
    fill: var(--blue);
    font:
      italic 11.5px Georgia,
      "Times New Roman",
      serif;
    pointer-events: none;
  }
  .rod {
    stroke: var(--text);
    stroke-width: 2;
  }
  .pivot-housing {
    fill: var(--subtle);
    stroke: var(--border);
    stroke-width: 1.2;
  }
  .pivot {
    fill: var(--surface);
    stroke: var(--text);
    stroke-width: 2;
  }
  .linear-model > * {
    stroke: var(--muted);
    stroke-width: 1.5;
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
    stroke-width: 0.9;
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
  .velocity {
    stroke: var(--green);
    stroke-width: 2;
  }
  .velocity-tip {
    fill: var(--green);
  }
  .acceleration {
    stroke: var(--red);
    stroke-width: 2;
  }
  .acceleration-tip {
    fill: var(--red);
  }
  .layer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
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
  .readouts div {
    padding: 9px 11px;
    min-width: 0;
  }
  .readouts div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span {
    display: block;
    color: var(--muted);
    font-size: 10px;
    line-height: 14px;
    margin-bottom: 4px;
  }
  .readouts output {
    display: block;
    font-size: 19px;
    line-height: 24px;
    font-weight: 500;
  }
  .readouts small {
    font-size: 10px;
  }
  .timeline {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 12px;
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
    font-size: 10px;
  }
  .moments {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
  .plot-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    padding: 8px 12px 0;
    font-size: 10px;
    flex-shrink: 0;
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
    flex: 1;
    min-height: 150px;
    padding: 4px 4px 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .seekable {
    cursor: ew-resize;
    touch-action: none;
  }
  .energy-strip {
    padding: 6px 12px 2px;
    flex-shrink: 0;
  }
  .energy-values {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font: 10px var(--mono);
    line-height: 14px;
  }
  .energy-bar {
    display: flex;
    height: 5px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--subtle);
    margin-top: 5px;
  }
  .energy-bar .potential-fill {
    background: var(--blue);
  }
  .energy-bar .kinetic-fill {
    background: var(--green);
  }
  .chart-hint {
    padding: 4px 12px 8px;
    flex-shrink: 0;
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
    margin-top: 7px;
  }
  .model-formula phy-math {
    font-size: 12.5px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 5px;
  }
  .task-content {
    padding: 10px 12px;
  }
  .tasks-hint {
    margin-bottom: 10px;
  }
  .task-grid {
    display: grid;
    gap: 10px;
  }
  .task {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 10px 12px;
  }
  .task h3 {
    font-size: 12.5px;
    margin-bottom: 6px;
  }
  .task p {
    margin-bottom: 8px;
    line-height: 1.65;
  }
  .task button {
    min-height: 30px;
    padding: 4px 10px;
    font-size: 11px;
  }
  @media (max-width: 1350px) {
    .subtitle {
      display: none;
    }
    .readouts div {
      padding: 8px 9px;
    }
    .readouts output {
      font-size: 17px;
    }
  }
  @media (max-height: 780px) {
    .parameters {
      gap: 9px;
      padding: 10px 13px;
    }
    .periods {
      gap: 7px 8px;
      padding: 9px 0;
    }
    .parameter-footer {
      padding: 8px 13px;
      gap: 6px;
    }
    .readouts div {
      padding: 7px 10px;
    }
    .readouts output {
      font-size: 17px;
      line-height: 21px;
    }
    .timeline {
      padding: 7px 12px;
    }
    .moments {
      padding: 6px 10px;
    }
    .moments button {
      min-height: 34px;
      padding: 4px 3px;
    }
    .support-tabs::part(tabs) {
      padding-top: 6px;
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
