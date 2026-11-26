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
    --signal-1: var(--text);
    --signal-2: light-dark(#9b4b22, #ecaa7b);
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
    padding: 6px 8px;
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
  .parameter-groups {
    display: grid;
    gap: 8px;
    padding: 8px 13px;
  }
  .source-group {
    display: grid;
    gap: 6px;
  }
  .source-group + .source-group {
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }
  .source-heading {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .source-swatch {
    width: 12px;
    border-top: 2px solid;
    flex-shrink: 0;
  }
  .source-swatch.first {
    border-color: var(--signal-1);
    border-top-style: dashed;
  }
  .source-swatch.second {
    border-color: var(--signal-2);
    border-top-style: dotted;
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
  .derived {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 8px;
    margin: 2px 13px 0;
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }
  .derived div {
    font-size: 10px;
    line-height: 14px;
  }
  .derived span {
    display: block;
    color: var(--muted);
  }
  .derived output {
    font-size: 11px;
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
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
    padding: 6px 8px;
  }
  .motion-scene,
  .time-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .scene-title,
  .track-label {
    fill: var(--text);
    font-size: 12.5px;
    font-weight: 550;
  }
  .svg-label {
    fill: var(--muted);
    font: 10.5px var(--mono);
  }
  .vector-label {
    fill: currentColor;
    font: 600 10.5px var(--mono);
    pointer-events: none;
  }
  .guide,
  .axis,
  .projection,
  .cursor,
  .ghost,
  .vector-line,
  .trace,
  .envelope-ring,
  .envelope-tick,
  .phase-arc {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .guide {
    stroke: var(--border);
  }
  .grid-ring {
    stroke-dasharray: 3 4;
  }
  .envelope-ring {
    stroke: var(--blue);
    stroke-opacity: 0.36;
    stroke-width: 1.2;
    stroke-dasharray: 5 4;
  }
  .envelope-band {
    fill: var(--primary-soft);
    opacity: 0.72;
  }
  .envelope-tick {
    stroke: var(--blue);
    stroke-opacity: 0.55;
    stroke-width: 1.3;
  }
  .phase-arc {
    stroke: var(--blue);
    stroke-opacity: 0.75;
    stroke-width: 1.3;
  }
  .phase-arc-label {
    fill: var(--blue);
    font:
      italic 11px Georgia,
      "Times New Roman",
      serif;
    pointer-events: none;
  }
  .axis {
    stroke: var(--muted);
  }
  .origin {
    fill: var(--muted);
  }
  .projection {
    stroke: var(--muted);
    stroke-opacity: 0.6;
    stroke-dasharray: 2 4;
  }
  .ghost {
    stroke: currentColor;
    stroke-dasharray: 2 4;
    opacity: 0.48;
  }
  .vector-line,
  .trace {
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .sum .vector-line,
  .trace.sum {
    stroke-width: 2.2;
  }
  .trace.carrier {
    color: var(--blue);
    stroke-opacity: 0.34;
    stroke-width: 1.15;
  }
  .first .vector-line,
  .trace.first {
    stroke-dasharray: 6 3;
  }
  .second .vector-line,
  .trace.second {
    stroke-dasharray: 2 3;
  }
  .first {
    color: var(--signal-1);
  }
  .second {
    color: var(--signal-2);
  }
  .sum {
    color: var(--blue);
  }
  .bound {
    color: var(--muted);
  }
  .trace.bound {
    stroke-dasharray: 5 4;
    stroke-width: 1.6;
  }
  .point {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1;
  }
  .phase-marker {
    fill: var(--surface);
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .phase-handle {
    cursor: grab;
    touch-action: none;
  }
  .phase-handle:active {
    cursor: grabbing;
  }
  .phase-handle:focus-visible {
    outline: none;
    stroke: var(--primary);
    stroke-width: 1.5;
  }
  .cursor {
    stroke: var(--muted);
    stroke-dasharray: 4 3;
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
    padding: 9px 12px;
    min-width: 0;
  }
  .readouts div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span {
    display: block;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted);
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
    padding: 5px 4px;
    white-space: nowrap;
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
  .observation-content {
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
  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
  }
  .legend-items span::before {
    content: "";
    display: inline-block;
    width: 12px;
    border-top: 2px solid;
    margin: 0 4px 3px 0;
  }
  .legend-items .first::before,
  .legend-items .bound::before {
    border-top-style: dashed;
  }
  .legend-items .second::before {
    border-top-style: dotted;
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
  .time-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .chart-hint {
    padding: 4px 12px 8px;
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
  .model-formula phy-math {
    font-size: 12.5px;
  }
  .model-formula p {
    margin-top: 7px;
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
      padding: 8px 10px;
    }
    .readouts output {
      font-size: 17px;
    }
  }
  @media (max-height: 780px) {
    .parameter-groups {
      gap: 6px;
      padding: 6px 13px;
    }
    .source-group {
      gap: 4px;
    }
    .source-group + .source-group {
      padding-top: 6px;
    }
    .derived {
      gap: 4px 8px;
      padding: 6px 0;
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
      padding: 7px 10px;
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
