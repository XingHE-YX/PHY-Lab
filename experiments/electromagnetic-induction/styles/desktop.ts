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
    --copper: light-dark(#936042, #d69c79);
    --emf-color: light-dark(#974322, #f2a484);
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
    min-width: 0;
    min-height: 0;
  }
  .panel-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 41px;
    padding: 0 14px;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    white-space: nowrap;
  }
  .panel-heading small,
  .status {
    font-size: 10px;
    color: var(--muted);
  }
  .status.active {
    color: var(--primary);
  }
  .parameters {
    display: grid;
    gap: 12px;
    padding: 12px 13px;
  }
  .parameter,
  .polarity {
    display: grid;
    gap: 4px;
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
  .polarity span {
    font-size: 12px;
    line-height: 16px;
  }
  .polarity phy-radio-group {
    --radio-height: 30px;
    --radio-font-size: 11px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .position {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 2px 13px 0;
    padding: 10px 0;
    border-top: 1px solid var(--border);
  }
  .position > div {
    font-size: 10px;
    line-height: 14px;
  }
  .position span {
    display: block;
    color: var(--muted);
    margin-bottom: 2px;
  }
  .position output {
    font-size: 11.5px;
  }
  .parameter-footer {
    display: grid;
    gap: 8px;
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
    line-height: 1.5;
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
    font-size: 12px;
    font-weight: 550;
  }
  .svg-label {
    fill: var(--muted);
    font: 10.5px var(--mono);
  }
  .scene-note {
    fill: var(--muted);
    font-size: 11px;
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
  .field-loop,
  .field-axis-ray,
  .motion-arrow,
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
  .field-loop {
    stroke: var(--blue);
    stroke-opacity: 0.24;
    stroke-width: 1.2;
    stroke-dasharray: 4 4;
  }
  .field-axis-ray {
    stroke: var(--blue);
    stroke-opacity: 0.45;
    stroke-width: 1.4;
  }
  .motion-arrow {
    stroke: var(--text);
    stroke-opacity: 0.72;
    stroke-width: 1.8;
  }
  .motion-tip {
    fill: var(--text);
    fill-opacity: 0.72;
  }
  .coil-glow-halo {
    fill: var(--green);
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
  .induced-pole-badge rect {
    fill: var(--surface);
    stroke: var(--green);
    stroke-width: 1.4;
  }
  .induced-pole-badge text {
    fill: var(--green);
    font: 600 12px var(--mono);
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
    font: 600 15px var(--mono);
    pointer-events: none;
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
  .readouts > div {
    padding: 9px 11px;
    min-width: 0;
  }
  .readouts > div + div {
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
    font-size: 18px;
    line-height: 24px;
    font-weight: 500;
  }
  .readouts small {
    font-size: 10px;
  }
  .readouts .direction output {
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
  }
  .readouts .direction output:not([data-direction="noCurrent"]) {
    color: var(--green);
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
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
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
  .chart-legend {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 10px;
    padding: 8px 12px 0;
    font-size: 10px;
    flex-shrink: 0;
  }
  .legend-main::before {
    content: "";
    display: inline-block;
    width: 12px;
    border-top: 2px solid;
    margin: 0 4px 3px 0;
  }
  .legend-note {
    color: var(--muted);
    font-size: 10px;
  }
  .chart-wrap {
    flex: 1;
    min-height: 150px;
    padding: 4px 4px 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .trace-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .chart-hint {
    padding: 4px 12px 8px;
    flex-shrink: 0;
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
  .trace.flux-ref {
    stroke: var(--blue);
    stroke-opacity: 0.32;
    stroke-width: 1.2;
    stroke-dasharray: 4 4;
  }
  .chart-point {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1.3;
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
    font-size: 13.5px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 6px;
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
    .readouts > div {
      padding: 8px 9px;
    }
    .readouts output {
      font-size: 16px;
    }
  }
  @media (max-height: 780px) {
    .parameters {
      gap: 9px;
      padding: 10px 13px;
    }
    .position {
      gap: 6px 8px;
      padding: 8px 0;
    }
    .parameter-footer {
      padding: 8px 13px;
      gap: 6px;
    }
    .readouts > div {
      padding: 7px 10px;
    }
    .readouts output {
      font-size: 16px;
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
