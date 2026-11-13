import { css } from "lit";
export const styles = css`
  .support-body {
    padding: 10px 12px;
  }
  .support.exploring {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .support.exploring .support-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .task-grid {
    display: grid;
    gap: 12px;
    margin-top: 12px;
  }
  .task {
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 12px;
  }
  .task h3 {
    font-size: 13px;
    font-weight: 550;
    line-height: 1.6;
    margin: 0 0 8px;
  }
  .task p {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.8;
    margin: 0 0 10px;
  }
  .task button {
    font-size: 11px;
  }
  .source-handle[role="img"] {
    cursor: default;
  }
  .boundary-label {
    margin: 0 0 8px;
    font-size: 11px;
    color: var(--muted);
  }
  .layer-controls {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 15px;
    padding: 10px 14px;
    font-size: 11px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .swatch {
    width: 16px;
    height: 0;
    border-top: 1px solid var(--muted);
  }
  .swatch.total {
    border-color: var(--blue);
    border-width: 2px;
  }
  .swatch.incident {
    border-top-style: dashed;
  }
  .swatch.reflected {
    border-color: var(--text);
    border-top-style: dotted;
  }
  :host {
    display: grid;
    height: 100%;
    min-height: 0;
    grid-template-rows: 38px minmax(0, 1fr);
    gap: 10px;
    color: var(--text);
    font-family: var(--font);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  input,
  select {
    font: inherit;
  }
  button {
    min-height: 36px;
    padding: 6px 10px;
    cursor: pointer;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 12px;
  }
  button:hover {
    background: var(--subtle);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  button.selected {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary);
  }
  button.primary {
    background: var(--primary);
    border-color: var(--primary);
    color: var(--bg);
  }
  :focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }
  .mono,
  .val,
  .value,
  .axis-text {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .muted,
  small {
    color: var(--muted);
  }
  .heading,
  .heading-copy,
  .mode-switch,
  .panel-heading,
  .scene-heading,
  .dialog-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
  }
  .heading-copy {
    justify-content: flex-start;
    align-items: baseline;
    gap: 12px;
  }
  h1 {
    font-size: 20px;
    font-weight: 550;
    margin: 0;
    white-space: nowrap;
    letter-spacing: -0.5px;
  }
  .intro {
    margin: 0;
    font-size: 11px;
    line-height: 1.6;
    color: var(--muted);
  }
  .mode-switch {
    gap: 4px;
    flex-shrink: 0;
  }
  .lab {
    display: grid;
    grid-template-columns: 224px minmax(420px, 1fr) 350px;
    gap: 8px;
    min-height: 0;
  }
  .parameter-panel,
  .stage,
  .observation-panel {
    display: flex;
    flex-direction: column;
  }
  .panel-heading {
    font-size: 12px;
    font-weight: 550;
    border-bottom: 1px solid var(--border);
    padding: 12px 14px;
    flex-shrink: 0;
  }
  .status {
    font-size: 10px;
    font-weight: 400;
    color: var(--muted);
  }
  .status.running {
    color: var(--primary);
  }
  .parameter-tabs,
  .source-tabs,
  .boundary-tabs,
  .metric-tabs {
    display: flex;
    gap: 5px;
  }
  .parameter-tabs {
    flex: 1;
    min-height: 0;
    padding-top: 10px;
  }
  .parameter-tabs::part(tabs) {
    padding: 0 12px;
  }
  .parameter-tabs .parameter-body {
    height: 100%;
  }
  .observation-tabs {
    --tab-height: 42px;
    flex: 1;
    min-height: 0;
  }
  .exploring .observation-tabs {
    flex: 0 0 auto;
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
  .support.exploring .support-body {
    height: 100%;
  }
  .equation phy-math {
    font-size: 0.87em;
  }
  .parameter-body {
    flex: 1;
    min-height: 0;
    padding: 14px;
  }
  .source-tabs,
  .boundary-tabs {
    margin-bottom: 16px;
  }
  .parameter {
    margin-bottom: 18px;
  }
  .parameter label,
  .probe-control label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    margin-bottom: 9px;
    font-size: 12px;
  }
  .val {
    font-size: 11px;
    white-space: nowrap;
  }
  .limits {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    margin-top: 4px;
  }
  .emit-actions {
    display: flex;
    gap: 6px;
    margin: 4px 0 12px;
  }
  .emit-actions button {
    flex: 1;
    font-size: 11px;
    padding: 5px;
  }
  .parameter-note,
  .view-note {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7;
    margin: 0;
  }
  .derived {
    display: grid;
    gap: 11px;
    padding-top: 16px;
    margin-top: 16px;
    border-top: 1px solid var(--border);
  }
  .derived-row {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 11px;
  }
  .derived-row span:last-child {
    font-family: var(--mono);
    white-space: nowrap;
  }
  .parameter-footer {
    display: grid;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .parameter-footer small {
    text-align: center;
    font-size: 10px;
    line-height: 1.5;
  }
  .scene-heading {
    min-height: 40px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    flex-shrink: 0;
  }
  .scene-heading small {
    font-size: 10px;
  }
  .scene-wrap {
    flex: 1;
    position: relative;
    min-height: 200px;
  }
  .wave-scene {
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
  }
  .axis-text {
    font-size: 10px;
    fill: var(--muted);
  }
  .scene-direction {
    font: 11px var(--mono);
    fill: var(--muted);
  }
  .source-handle {
    cursor: pointer;
  }
  .probe-handle {
    cursor: ew-resize;
    touch-action: none;
  }
  .scene-foot {
    color: var(--muted);
    font-size: 10px;
    padding: 0 14px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .scene-foot phy-checkbox,
  .layer-controls phy-checkbox {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readout {
    padding: 11px 14px;
    border-right: 1px solid var(--border);
  }
  .readout:last-child {
    border-right: 0;
  }
  .readout small {
    display: block;
    font-size: 11px;
    margin-bottom: 7px;
  }
  .value {
    font-size: 22px;
    font-weight: 500;
  }
  .unit {
    color: var(--muted);
    font: 11px var(--font);
    margin-left: 4px;
  }
  .timeline {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px 14px;
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
    padding-left: 8px;
    border-left: 1px solid var(--border);
  }
  .moments {
    display: flex;
    gap: 5px;
    padding: 10px 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .moments button {
    flex: 1;
    font-size: 11px;
    padding: 5px;
  }
  .observation-content {
    height: 100%;
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
  }
  .plot {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
  .probe-control {
    flex-shrink: 0;
  }
  .chart-stack {
    display: flex;
    flex: 1;
    min-height: 150px;
  }
  .wave-chart {
    width: 100%;
    height: 100%;
    display: block;
    min-height: 0;
    touch-action: none;
  }
  .profile-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 10px;
    color: var(--muted);
  }
  .component-values,
  .site-values {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    font-size: 11px;
  }
  .component-values small,
  .site-values small {
    display: block;
    margin-bottom: 6px;
    font-size: 10px;
  }
  .component-values b,
  .site-values b {
    font: 12px var(--mono);
  }
  .support {
    border-top: 1px solid var(--border);
    padding: 0;
    flex-shrink: 0;
  }
  .equation {
    font-size: 13px;
    line-height: 1.8;
  }
  .explanation {
    margin: 7px 0 0;
    font-size: 11px;
    line-height: 1.7;
    color: var(--muted);
  }
  @media (max-height: 800px) {
    .support-tabs::part(tabs) {
      padding-top: 6px;
    }
    .parameter {
      margin-bottom: 13px;
    }
    .parameter-body {
      padding-top: 12px;
    }
    .readout {
      padding: 9px 12px;
    }
    .value {
      font-size: 19px;
    }
    .plot {
      padding: 10px;
      gap: 9px;
    }
    .explanation {
      font-size: 10px;
    }
  }
  @media (max-height: 719px) {
    :host {
      overflow: auto;
    }
    .lab {
      min-height: 560px;
    }
  }
`;
