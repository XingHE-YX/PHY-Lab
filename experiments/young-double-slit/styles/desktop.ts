import { css } from "lit";
export const styles = css`
  :host {
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 0;
    overflow: auto;
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
  h3,
  p {
    margin: 0;
  }
  h1 {
    font-size: 20px;
    font-weight: 550;
    letter-spacing: -0.5px;
  }
  h2 {
    font-size: 12px;
    font-weight: 550;
  }
  h3 {
    font-size: 13px;
    font-weight: 550;
  }
  small,
  .muted {
    color: var(--muted);
  }
  .mono,
  output {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .heading,
  .heading-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .heading-main {
    justify-content: start;
    align-items: baseline;
  }
  .subtitle {
    color: var(--muted);
    font-size: 11px;
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
  }
  .panel-heading {
    min-height: 40px;
    padding: 12px 14px;
    line-height: 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .panel-heading small {
    font-size: 10px;
  }
  .parameters {
    padding: 0 13px;
  }
  .parameter {
    margin-top: 16px;
  }
  .parameter label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
  }
  .parameter output {
    font-size: 11px;
    white-space: nowrap;
  }
  .parameter phy-slider {
    margin: 6px 0 3px;
  }
  .range-ends {
    display: flex;
    justify-content: space-between;
    font: 10px var(--mono);
    color: var(--muted);
  }
  .derived {
    margin: 16px 13px 0;
    padding: 14px 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    border-block: 1px solid var(--border);
  }
  .derived span {
    display: block;
    color: var(--muted);
    font-size: 10px;
    line-height: 16px;
  }
  .derived output {
    font-size: 12px;
    line-height: 20px;
  }
  .layers {
    display: grid;
    gap: 10px;
    padding: 16px 13px;
  }
  .layers phy-checkbox {
    font-size: 11px;
  }
  .parameter-footer {
    margin-top: auto;
    padding: 12px 13px;
    display: grid;
    gap: 8px;
    border-top: 1px solid var(--border);
  }
  .parameter-footer small {
    font-size: 11px;
    line-height: 1.5;
  }
  .scene-wrap {
    flex: 1;
    min-height: 190px;
    position: relative;
    background: var(--bg);
  }
  .optical-scene {
    width: 100%;
    height: 100%;
    display: block;
  }
  svg {
    font-family: var(--mono);
    user-select: none;
  }
  .axis-label {
    fill: var(--muted);
    font-size: 11px;
  }
  .scene-label {
    fill: var(--text);
    font-size: 12px;
  }
  .symbol {
    fill: var(--text);
    font:
      italic 16px Georgia,
      serif;
  }
  .grid-line {
    stroke: var(--border);
    stroke-width: 1;
    stroke-dasharray: 3 5;
  }
  .axis {
    stroke: var(--muted);
    stroke-width: 1;
  }
  .slit-barrier {
    fill: var(--subtle);
    stroke: var(--muted);
    stroke-width: 1;
  }
  .probe-hit {
    fill: transparent;
    cursor: ns-resize;
    touch-action: none;
  }
  .intensity-hit {
    fill: transparent;
    cursor: ew-resize;
    touch-action: none;
  }
  .screen-probe:focus-visible .probe-ring {
    stroke: var(--text);
    stroke-width: 3;
  }
  .screen-probe:focus-visible .probe-focus {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .probe-focus {
    fill: none;
    stroke: transparent;
  }
  .probe-ring {
    fill: var(--surface);
    stroke: var(--primary);
    stroke-width: 2;
  }
  .probe-line {
    stroke: var(--primary);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .readouts {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    padding: 9px 12px;
    border-block: 1px solid var(--border);
    background: var(--surface);
    gap: 8px;
    flex-shrink: 0;
  }
  .readouts span {
    display: block;
    font-size: 10px;
    color: var(--muted);
    line-height: 16px;
  }
  .readouts output {
    font-size: 14px;
    line-height: 20px;
  }
  .probe-control,
  .clock-control {
    display: grid;
    grid-template-columns: auto minmax(80px, 1fr) auto;
    align-items: center;
    padding: 7px 12px;
    gap: 10px;
    font-size: 11px;
    min-height: 42px;
    flex-shrink: 0;
  }
  .probe-control output,
  .clock-control output {
    font-size: 11px;
    min-width: 65px;
    text-align: end;
  }
  .fringe-controls {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 0 12px 8px;
    flex-shrink: 0;
  }
  phy-button {
    font-size: 11px;
  }
  .clock-control {
    border-top: 1px solid var(--border);
  }
  .scene-caption {
    padding: 4px 12px 8px;
    color: var(--muted);
    font-size: 10px;
    line-height: 15px;
    flex-shrink: 0;
  }
  .scene-caption .time-scale {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-family: var(--mono);
  }
  .observation-tabs {
    --tab-height: 42px;
    flex: 1;
    min-height: 0;
  }
  .observation-tabs::part(panel) {
    display: flex;
    flex-direction: column;
  }
  .observation-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .plot-wrap {
    flex: 1;
    min-height: 200px;
    padding: 8px;
  }
  .optical-chart {
    display: block;
    width: 100%;
    height: 100%;
  }
  .optical-chart:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }
  .observation-summary {
    padding: 0 14px 10px;
    min-height: 72px;
    flex-shrink: 0;
    font-size: 11px;
    line-height: 1.6;
  }
  .observation-summary strong {
    display: block;
    color: var(--text);
    font-weight: 500;
    font-size: 12px;
  }
  .comparison {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--border);
    line-height: 1.5;
  }
  .comparison small {
    font-size: 10px;
    display: block;
  }
  .support-tabs {
    --tab-height: 30px;
    --tab-font-size: 11px;
    --tab-flex: 0 0 auto;
    --tab-padding: 4px 10px;
    --tab-gap: 5px;
    padding: 8px 12px 12px;
    flex-shrink: 0;
    border-top: 1px solid var(--border);
  }
  .formula-content {
    padding: 8px 0 0;
    font-size: 11px;
    line-height: 1.5;
    min-height: 112px;
    display: grid;
    align-content: start;
    gap: 6px;
  }
  .formula-content phy-math {
    font-size: 13px;
  }
  .tasks-open .observation-tabs {
    flex: 0 0 auto;
  }
  .tasks-open .support-tabs {
    flex: 1;
    border-top: 0;
  }
  .task-grid {
    padding-top: 12px;
    display: grid;
    gap: 12px;
  }
  .task {
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 12px;
  }
  .task p {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.6;
    margin: 6px 0 10px;
  }
  .task phy-button {
    display: block;
  }
  .empty {
    color: var(--muted);
    font-size: 11px;
  }
  @media (max-width: 1350px) {
    .lab {
      grid-template-columns: 212px minmax(420px, 1fr) 330px;
    }
    .subtitle {
      display: none;
    }
    .panel-heading {
      padding-inline: 12px;
    }
  }
  @media (max-height: 800px) {
    .parameter {
      margin-top: 12px;
    }
    .layers {
      padding-block: 12px;
      gap: 8px;
    }
    .derived {
      padding-block: 10px;
      margin-top: 12px;
    }
    .task-grid {
      gap: 8px;
    }
    .task {
      padding: 10px;
    }
    .task p {
      margin: 4px 0 8px;
    }
    .plot-wrap {
      min-height: 190px;
    }
  }
  @media (max-height: 680px) {
    :host {
      grid-template-rows: 38px minmax(520px, 1fr);
    }
  }
`;
