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
  input[type="range"],
  input[type="checkbox"] {
    accent-color: var(--primary);
  }
  input[type="range"] {
    width: 100%;
    margin: 7px 0 4px;
    cursor: pointer;
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
    grid-template-columns: 218px minmax(0, 1fr) 338px;
    gap: 10px;
    min-height: 0;
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    min-width: 0;
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
    padding: 10px 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .panel-heading small {
    font-size: 10px;
  }
  .parameters {
    padding: 4px 13px 0;
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
    gap: 11px;
    margin: 20px 13px 0;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }
  .derived div {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
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
    background: var(--bg);
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
  .scene-caption {
    fill: var(--muted);
    font: 10px var(--mono);
    letter-spacing: 1.6px;
  }
  .component-label {
    font: 22px var(--mono);
    fill: var(--text);
  }
  .voltage-label {
    font: 16px var(--mono);
    fill: var(--blue);
  }
  .circuit-switch {
    cursor: pointer;
  }
  .circuit-switch:focus-visible {
    outline: none;
  }
  .circuit-switch:focus-visible rect {
    stroke: var(--primary);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .layer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .layer-controls label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
  }
  .circuit-scene .axis-text {
    font-size: 14px;
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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
    background: var(--subtle);
    margin-top: 8px;
  }
  .timeline {
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
    color: var(--muted);
  }
  .time-values output {
    color: var(--text);
  }
  .timeline input {
    margin: 8px 0 0;
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
  .tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .tabs button {
    flex: 1;
    border: 0;
    border-radius: 0;
    background: transparent;
    border-bottom: 2px solid transparent;
    min-width: 0;
    font-size: 11px;
  }
  .tabs button[aria-selected="true"] {
    background: var(--primary-soft);
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
  .observation-tabs button {
    min-height: 40px;
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
    border-top: 1px solid var(--border);
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
  .formula-content .katex {
    font-size: 1em;
  }
  .observation-footer {
    padding: 8px 13px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--muted);
    line-height: 1.5;
    flex-shrink: 0;
  }
  dialog {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    border-radius: 4px;
    width: 650px;
    max-height: 80dvh;
    padding: 24px;
    line-height: 1.8;
  }
  dialog::backdrop {
    background: #0008;
  }
  dialog h2 {
    font-size: 18px;
    margin-bottom: 18px;
  }
  dialog p {
    font-size: 13px;
    margin: 12px 0;
  }
  dialog .equation {
    text-align: center;
    margin: 18px 0;
    font-size: 14px;
  }
  dialog footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
  @media (max-width: 1350px) {
    .lab {
      grid-template-columns: 200px minmax(0, 1fr) 300px;
    }
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
    .parameter {
      margin-top: 12px;
    }
    .derived {
      gap: 9px;
      margin-top: 16px;
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
  }
  @media (max-height: 650px) {
    :host {
      height: auto;
      min-height: 562px;
      grid-template-rows: 38px minmax(510px, 1fr);
    }
  }
`;
