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
    --signal-1: var(--muted);
    --signal-2: light-dark(#9b4b22, #ecaa7b);
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
    font: 12px var(--mono);
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
    grid-template-columns: 224px minmax(0, 1fr) 348px;
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
    padding: 8px 12px;
    min-height: 43px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-heading phy-checkbox {
    font-size: 11px;
    color: var(--muted);
  }
  .parameter-groups {
    display: grid;
    gap: 8px;
    padding: 8px 12px;
  }
  .source-group {
    display: grid;
    gap: 6px;
  }
  .source-group + .source-group {
    border-top: 1px solid var(--border);
    padding-top: 8px;
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
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .derived {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 0 12px;
    padding: 8px 0;
    border-block: 1px solid var(--border);
  }
  .derived span,
  .readouts span {
    display: block;
    font-size: 11px;
    line-height: 16px;
    color: var(--muted);
  }
  .source-footer {
    display: grid;
    gap: 6px;
    padding: 8px 12px;
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
    background: var(--bg);
    padding: 8px;
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
    font-size: 13px;
    font-weight: 600;
  }
  .svg-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .guide,
  .axis,
  .projection,
  .cursor,
  .ghost,
  .vector-line,
  .trace {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .guide {
    stroke: var(--border);
  }
  .grid-ring {
    stroke-dasharray: 3 4;
  }
  .axis {
    stroke: var(--muted);
  }
  .origin {
    fill: var(--muted);
  }
  .projection {
    stroke: var(--muted);
    stroke-dasharray: 2 4;
  }
  .ghost {
    stroke: currentColor;
    stroke-dasharray: 2 4;
    opacity: 0.55;
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
  }
  .point {
    fill: currentColor;
    stroke: var(--surface);
    stroke-width: 1;
  }
  .cursor {
    stroke: var(--muted);
    stroke-dasharray: 4 3;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readouts div {
    padding: 8px 12px;
  }
  .readouts div + div {
    border-left: 1px solid var(--border);
  }
  .readouts output {
    display: block;
    font-size: 18px;
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
  .time-label output {
    line-height: inherit;
  }
  .moments {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .moments phy-button::part(button) {
    width: 100%;
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
    grid-template-rows: auto minmax(0, 1fr) minmax(44px, auto) auto;
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
  .legend .first::before,
  .legend .bound::before {
    border-top-style: dashed;
  }
  .legend .second::before {
    border-top-style: dotted;
  }
  .chart-wrap {
    min-height: 0;
    padding: 8px 4px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .time-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .chart-hint {
    padding: 0 12px 8px;
  }
  .model-formula {
    padding: 12px;
    border-top: 1px solid var(--border);
    min-height: 85px;
  }
  .model-formula phy-math {
    font-size: 13px;
  }
  .model-formula p {
    margin-top: 8px;
  }
  @media (max-height: 780px) {
    .source-group {
      gap: 4px;
    }
    .source-group + .source-group {
      padding-top: 6px;
    }
    .parameter-groups {
      gap: 6px;
    }
    .model-formula {
      padding: 8px 12px;
      min-height: 76px;
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
