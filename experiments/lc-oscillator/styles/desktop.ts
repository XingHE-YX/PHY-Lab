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
  button,
  input,
  select {
    font: inherit;
  }
  button {
    min-height: 36px;
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 6px 10px;
    color: var(--text);
    background: var(--surface);
    font-size: 12px;
    cursor: pointer;
  }
  button:hover {
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
  .parameter phy-slider {
    margin: 7px 0 4px;
  }
  h1,
  h2,
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
  small,
  .muted {
    color: var(--muted);
  }
  .mono {
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
    font-size: 11px;
    color: var(--muted);
  }
  .lab {
    display: grid;
    grid-template-columns: 224px minmax(420px, 1fr) 350px;
    gap: 8px;
    min-height: 0;
  }
  .parameter-panel,
  .main-panel,
  .observation-panel {
    display: flex;
    flex-direction: column;
  }
  .panel-heading {
    min-height: 40px;
    padding: 12px 14px;
    line-height: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-heading small {
    font-size: 10px;
    line-height: 14px;
  }
  .parameters {
    padding: 4px 13px 0;
  }
  .parameter-tabs {
    flex-shrink: 0;
    --tab-height: 30px;
    --tab-font-size: 11px;
    padding-top: 8px;
  }
  .parameter-tabs::part(tabs) {
    padding: 0 12px;
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
    font: 11px var(--mono);
    white-space: nowrap;
  }
  .range-ends {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font: 10px var(--mono);
  }
  .derived {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 20px 13px 0;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .derived div {
    display: block;
    font-size: 10px;
    line-height: 14px;
  }
  .derived span {
    display: block;
  }
  .derived output {
    font: 11px var(--mono);
  }
  .parameter-footer {
    display: grid;
    gap: 8px;
    margin-top: auto;
    padding: 12px 13px;
    border-top: 1px solid var(--border);
  }
  .parameter-footer phy-button {
    display: block;
  }
  .parameter-footer small {
    font-size: 10px;
    line-height: 1.6;
  }
  .scene-wrap {
    position: relative;
    flex: 1;
    min-height: 200px;
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
    --plate-hi: light-dark(#6c9aff, #9ec0ff);
    --plate-mid: light-dark(#3b73ea, #6896f6);
    --plate-lo: light-dark(#2256c7, #4472d4);
    --core-hi: light-dark(#ffffff, #2c313b);
    --core-mid: light-dark(#eaedf2, #20242c);
    --core-lo: light-dark(#d5dae3, #171a20);
    --core-stroke: light-dark(#aeb6c4, #404754);
    --flange-hi: light-dark(#f4f6f9, #353b47);
    --flange-lo: light-dark(#cbd2de, #1e222a);
    --coil-hi: light-dark(#f0b584, #f5be91);
    --coil-mid: light-dark(#c77743, #cf814d);
    --coil-lo: light-dark(#8f4c24, #935028);
    --coil-back: light-dark(#7d4220, #6d3a1c);
    --coil-edge: light-dark(#522810, #2b1509);
    --coil-shine: light-dark(#fff3e6, #ffe9d2);
  }
  .circuit-scene {
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
  }
  .axis-text {
    font: 10px var(--mono);
    fill: var(--muted);
  }
  .component-label {
    font:
      600 20px Georgia,
      "Times New Roman",
      serif;
    font-style: italic;
    fill: var(--text);
  }
  .field-label {
    font: 600 12.5px var(--mono);
  }
  .voltage-label {
    font: 500 13.5px var(--mono);
    font-variant-numeric: tabular-nums;
    fill: var(--blue);
  }
  .circuit-switch {
    cursor: pointer;
  }
  .circuit-switch .switch-hitbox {
    stroke: var(--border);
    stroke-width: 1.1;
    stroke-dasharray: 4 3;
    pointer-events: all;
    transition: stroke 0.15s;
  }
  .circuit-switch:hover .switch-hitbox {
    stroke: var(--muted);
  }
  .circuit-switch:focus-visible {
    outline: none;
  }
  .circuit-switch:focus-visible .switch-hitbox {
    stroke: var(--primary);
    stroke-width: 1.6;
  }
  .layer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    font-size: 11px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .circuit-scene .axis-text {
    font-size: 12.5px;
    font-variant-numeric: tabular-nums;
  }
  .circuit-scene .switch-label {
    font-weight: 600;
    fill: var(--text);
  }
  .layer-controls > div {
    display: flex;
    gap: 12px;
  }
  .layer-controls .direction {
    font-size: 10px;
    color: var(--muted);
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readout {
    padding: 10px 12px;
    min-width: 0;
  }
  .readout + .readout {
    border-left: 1px solid var(--border);
  }
  .readout label {
    display: block;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .readout output {
    font: 21px var(--mono);
    font-weight: 500;
    color: var(--blue);
    white-space: nowrap;
  }
  .readout.current output {
    color: var(--green);
  }
  .readout.switch-voltage output {
    color: var(--red);
  }
  .readout small {
    margin-left: 3px;
    font: 10px var(--mono);
  }
  .energy-strip {
    padding: 9px 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .energy-values {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font: 10px var(--mono);
    line-height: 14px;
  }
  .energy-values span {
    white-space: nowrap;
  }
  .charge {
    color: var(--blue);
  }
  .current {
    color: var(--green);
  }
  .energy-bar {
    display: flex;
    height: 5px;
    border-radius: 999px;
    overflow: hidden;
    background: var(--subtle);
    margin-top: 8px;
  }
  .clock-readout {
    border-top: 1px solid var(--border);
    padding: 8px 12px;
    flex-shrink: 0;
  }
  .time-values {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    font: 10px var(--mono);
    line-height: 14px;
    color: var(--muted);
  }
  .time-values output {
    color: var(--text);
  }
  .moments {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .moments button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding: 6px 2px;
    font-size: 10px;
    line-height: 1.25;
  }
  .moments button small {
    font: 10px var(--mono);
  }
  .observation-tabs {
    flex: 1;
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
    flex-wrap: wrap;
    gap: 6px 12px;
    font-size: 10px;
    padding: 8px 13px 0;
    flex-shrink: 0;
  }
  .chart-stack.single {
    grid-template-rows: minmax(0, 1fr);
  }
  .chart-stack.analogy-stack {
    grid-template-rows: 112px minmax(0, 1fr);
  }
  .spring-analogy {
    width: 100%;
    height: 112px;
    align-self: center;
  }
  .normalization-empty {
    flex: 1;
    display: grid;
    place-items: center;
    padding: 32px;
    font-size: 12px;
    color: var(--muted);
    line-height: 1.8;
  }
  .observation-summary {
    padding: 12px 13px 0;
    min-height: 58px;
    font-size: 11px;
    line-height: 1.7;
    color: var(--muted);
    flex-shrink: 0;
  }
  .chart-stack {
    display: grid;
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 12px 8px;
    flex: 1;
    min-height: 216px;
  }
  .lc-chart {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    user-select: none;
    cursor: ew-resize;
  }
  .formula-content {
    padding: 12px 13px;
    flex-shrink: 0;
    font-size: 12px;
    line-height: 1.7;
  }
  .formula-content .equation + .equation {
    margin-top: 6px;
  }
  .formula-content p {
    margin-top: 10px;
    font-size: 11px;
    color: var(--muted);
  }
  .formula-content phy-math {
    font-size: 0.83em;
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
  .support-note {
    display: block;
    margin-top: 8px;
    line-height: 1.5;
    font-size: 10px;
  }
  .task-content {
    padding: 10px 12px;
  }
  .task-grid {
    display: grid;
    gap: 12px;
  }
  .task {
    border: 1px solid var(--border);
    border-radius: var(--radius);
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
  .task-reference,
  .task-comparison {
    display: block;
    font-size: 10px;
    line-height: 1.5;
    color: var(--muted);
  }
  .transient-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    height: 100%;
  }
  .transient-model,
  .transient-legend {
    font-size: 10px;
    line-height: 1.5;
    color: var(--muted);
    flex-shrink: 0;
  }
  .transient-plot {
    flex: 1;
    min-height: 150px;
  }
  .transient-chart {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: ew-resize;
  }
  .transient-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 10px;
    flex-shrink: 0;
  }
  .transient-summary small {
    display: block;
    font-size: 10px;
    line-height: 14px;
  }
  .transient-summary output {
    font: 13px/18px var(--mono);
  }
  .transient-tools {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .transient-tools phy-select {
    min-width: 140px;
  }
  .comparison-summary {
    margin: 12px 13px 0;
  }
  .task-comparison {
    font-family: var(--mono);
    margin-top: 4px;
  }
  @media (max-width: 1350px) {
    .subtitle {
      display: none;
    }
    .readout {
      padding: 9px 10px;
    }
    .readout output {
      font-size: 18px;
    }
  }
  @media (max-height: 780px) {
    .support-tabs::part(tabs) {
      padding-top: 6px;
    }
    .parameter {
      margin-top: 10px;
    }
    .derived {
      gap: 9px;
      margin-top: 12px;
      padding-top: 12px;
    }
    .observation-summary {
      padding-top: 10px;
      min-height: 52px;
    }
    .formula-content {
      padding: 10px 12px;
    }
    .chart-stack {
      gap: 6px;
      padding: 8px;
    }
    .parameter-footer {
      padding-top: 10px;
      padding-bottom: 10px;
    }
  }
  @media (max-height: 650px) {
    :host {
      height: auto;
      min-height: 562px;
      grid-template-rows: 38px minmax(510px, 1fr);
    }
  }
`;
