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
  }
  .subtitle,
  .model-note {
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
    height: 41px;
    padding: 0 14px;
    line-height: 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
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
    padding: 0 13px;
  }
  .parameter {
    margin-top: 16px;
  }
  .parameter label,
  .probe-control label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
  }
  .parameter output,
  .probe-control output {
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
    margin: 18px 13px 0;
    padding-top: 14px;
    display: grid;
    gap: 10px;
    border-top: 1px solid var(--border);
  }
  .derived-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
    font-size: 11px;
    line-height: 1.4;
  }
  .derived-row span {
    color: var(--muted);
    white-space: nowrap;
  }
  .derived-row output {
    font-size: 11px;
    white-space: nowrap;
  }
  .comparison {
    margin: 12px 13px 0;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    display: grid;
    gap: 4px;
  }
  .task-reference,
  .task-comparison {
    display: block;
    font-size: 10px;
    line-height: 1.5;
    color: var(--muted);
  }
  .task-comparison {
    color: var(--text);
    font-size: 11px;
  }
  .parameter-footer {
    margin-top: auto;
    padding: 12px 13px;
    display: grid;
    gap: 8px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .parameter-footer phy-button {
    display: block;
  }
  .parameter-footer small {
    font-size: 10px;
    line-height: 1.55;
  }
  .scene-wrap {
    flex: 1;
    min-height: 190px;
    position: relative;
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
    --barrier-hi: light-dark(#e9edf3, #353c48);
    --barrier-mid: light-dark(#d4dbe5, #252a33);
    --barrier-lo: light-dark(#bec6d3, #1b1f26);
    --barrier-stroke: light-dark(#98a2b3, #4a5261);
    --screen-frame: light-dark(#d8dde6, #252a33);
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
  .axis-label,
  .axis-text {
    fill: var(--muted);
    font: 10px var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .scene-label {
    fill: var(--text);
    font-size: 11.5px;
    font-weight: 500;
  }
  .halo {
    paint-order: stroke;
    stroke: var(--bg);
    stroke-width: 3px;
    stroke-linejoin: round;
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
    fill: url(#opt-barrier);
    stroke: var(--barrier-stroke);
    stroke-width: 1;
  }
  .barrier-shine {
    stroke: var(--surface);
    stroke-opacity: 0.45;
    stroke-width: 1;
    stroke-linecap: round;
  }
  .screen-housing {
    fill: var(--screen-frame);
    stroke: var(--barrier-stroke);
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
    stroke-width: 2.5;
  }
  .screen-probe:focus-visible .probe-focus {
    stroke: var(--primary);
    stroke-width: 1.8;
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
  .probe-badge {
    fill: var(--primary);
  }
  .probe-badge-text {
    fill: var(--bg);
    font: 600 10px var(--mono);
  }
  .probe-line {
    stroke: var(--primary);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .scene-caption {
    height: 24px;
    padding: 0 14px 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    background: var(--bg);
    color: var(--muted);
    font-size: 10px;
    line-height: 16px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .scene-caption .time-scale {
    font-family: var(--mono);
  }
  .layer-controls {
    height: 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 0 14px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .layers {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .layers phy-checkbox {
    font-size: 11px;
  }
  .probe-tip {
    font-size: 10px;
    color: var(--muted);
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }
  .readout {
    padding: 10px 14px;
    min-width: 0;
  }
  .readout + .readout {
    border-left: 1px solid var(--border);
  }
  .readout small {
    display: block;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted);
    margin-bottom: 5px;
    white-space: nowrap;
  }
  .readout output {
    display: block;
    font-size: 20px;
    line-height: 24px;
    font-weight: 500;
    white-space: nowrap;
  }
  .readout.delta output {
    color: var(--blue);
  }
  .readout.phase output {
    color: var(--green);
  }
  .readout.intensity output {
    color: var(--text);
  }
  .readout .unit {
    font: 11px var(--font);
    color: var(--muted);
  }
  .timeline {
    height: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font: 10px var(--mono);
    flex-shrink: 0;
  }
  .timeline phy-slider {
    flex: 1;
    min-width: 0;
  }
  .timeline span,
  .timeline output {
    white-space: nowrap;
  }
  .time-label {
    color: var(--text);
    padding-left: 10px;
    border-left: 1px solid var(--border);
    min-width: 72px;
    text-align: end;
  }
  .fringe-controls {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  phy-button {
    font-size: 11px;
    white-space: nowrap;
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
  .probe-control {
    padding: 10px 12px 4px;
    display: grid;
    gap: 6px;
    flex-shrink: 0;
  }
  .plot-wrap {
    flex: 1;
    min-height: 204px;
    padding: 4px 8px 4px;
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
  .phase-chart {
    touch-action: none;
  }
  .observation-summary {
    padding: 4px 12px 10px;
    flex-shrink: 0;
    font-size: 11px;
    line-height: 1.5;
  }
  .summary-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 2px 8px;
    margin-bottom: 2px;
  }
  .observation-summary strong {
    color: var(--text);
    font-weight: 500;
    font-size: 11.5px;
    white-space: nowrap;
  }
  .summary-head .mono {
    font-size: 10.5px;
    color: var(--muted);
    white-space: nowrap;
  }
  .observation-summary small {
    display: block;
    font-size: 10.5px;
    line-height: 1.45;
  }
  .support-tabs {
    --tab-height: 30px;
    --tab-font-size: 11px;
    --tab-flex: 0 0 auto;
    --tab-padding: 4px 10px;
    --tab-gap: 5px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .support-tabs::part(tabs) {
    padding: 8px 12px 0;
  }
  .formula-content {
    padding: 10px 12px 12px;
    font-size: 11px;
    line-height: 1.5;
    display: grid;
    align-content: start;
    gap: 5px;
  }
  .formula-content phy-math {
    font-size: 12.5px;
  }
  .formula-content small {
    font-size: 10px;
    line-height: 1.45;
  }
  .tasks-open .observation-tabs {
    flex: 0 0 auto;
  }
  .tasks-open .support-tabs {
    flex: 1;
    min-height: 0;
    border-top: 0;
  }
  .tasks-open .support-tabs::part(panel) {
    display: flex;
    flex-direction: column;
  }
  .tasks-open .support-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .task-content {
    padding: 10px 12px 12px;
  }
  .task-grid {
    display: grid;
    gap: 10px;
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
  @media (max-width: 1380px) {
    .probe-tip {
      display: none;
    }
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
    .readout {
      padding: 9px 12px;
    }
    .readout output {
      font-size: 18px;
      line-height: 22px;
    }
  }
  @media (max-height: 780px) {
    .parameter {
      margin-top: 11px;
    }
    .derived {
      margin-top: 12px;
      padding-top: 10px;
      gap: 7px;
    }
    .comparison {
      margin-top: 10px;
      padding-top: 10px;
    }
    .parameter-footer {
      padding: 10px 12px;
      gap: 6px;
    }
    .readout {
      padding: 8px 12px;
    }
    .readout output {
      font-size: 18px;
      line-height: 22px;
    }
    .probe-control {
      padding: 8px 12px 2px;
      gap: 4px;
    }
    .observation-summary {
      padding: 2px 12px 8px;
    }
    .support-tabs::part(tabs) {
      padding-top: 6px;
    }
    .formula-content {
      padding: 8px 12px 10px;
      gap: 4px;
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
  }
  @media (max-height: 680px) {
    :host {
      overflow: auto;
      grid-template-rows: 38px minmax(540px, 1fr);
    }
  }
`;
