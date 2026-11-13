import { css } from "lit";
export const styles = css`
  :host {
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr);
    height: 100%;
    min-height: 0;
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
    cursor: pointer;
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    min-height: 36px;
    padding: 6px 10px;
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
    color: var(--primary);
    background: var(--primary-soft);
    border-color: var(--primary);
  }
  :focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 3px;
  }
  .heading,
  .heading-copy,
  .panel-heading,
  .scene-heading,
  .scene-tools,
  .camera,
  .dialog-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }
  .heading-copy {
    justify-content: flex-start;
    gap: 16px;
    align-items: baseline;
  }
  h1 {
    font-size: 20px;
    letter-spacing: -0.5px;
    font-weight: 550;
    margin: 0;
    white-space: nowrap;
  }
  .intro,
  .model-summary {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
  }
  .lab {
    display: grid;
    grid-template-columns: 224px minmax(420px, 1fr) 322px;
    gap: 8px;
    min-height: 0;
  }
  .parameter-panel,
  .stage,
  .observation-panel {
    display: flex;
    flex-direction: column;
  }
  .panel-heading,
  .scene-heading {
    padding: 12px 14px;
    font-size: 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .status {
    font-size: 10px;
    color: var(--muted);
  }
  .running {
    color: var(--primary);
  }
  .parameter-tabs,
  .pair,
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
  .pair button {
    flex: 1;
    padding: 4px 6px;
  }
  .observation-tabs {
    --tab-height: 42px;
    flex: 1;
    min-height: 0;
  }
  .coordinate phy-input {
    flex: 1;
    min-width: 0;
    width: 40px;
    --input-font-size: 11px;
  }
  .equation phy-math {
    font-size: 0.87em;
  }
  .parameter-body {
    padding: 16px 14px 10px;
    flex: 1;
    min-height: 0;
  }
  .parameter {
    margin-bottom: 19px;
  }
  .parameter label,
  .coordinate label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    margin-bottom: 7px;
    line-height: 1.35;
  }
  .val,
  .mono,
  .value {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .val {
    font-size: 11px;
    white-space: nowrap;
  }
  .limits {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 10px;
    margin-top: 4px;
    line-height: 1.3;
  }
  .parameter-note,
  .view-note {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7;
    margin: 8px 0 0;
  }
  .position-summary {
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 8px;
    font-size: 11px;
    line-height: 1.4;
  }
  .position-summary .mono {
    display: block;
    margin-top: 5px;
  }
  .derived {
    display: grid;
    gap: 10px;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: 14px;
    font-size: 11px;
  }
  .derived-row {
    display: flex;
    justify-content: space-between;
    gap: 4px;
  }
  .derived-row span:last-child {
    white-space: nowrap;
    font-family: var(--mono);
  }
  .parameter-footer {
    border-top: 1px solid var(--border);
    padding: 12px;
    display: grid;
    gap: 8px;
    flex-shrink: 0;
  }
  .parameter-footer small {
    font-size: 10px;
    color: var(--muted);
    line-height: 1.6;
  }
  .help-button {
    width: 100%;
  }
  .scene-heading small {
    font: 10px var(--mono);
    color: var(--muted);
  }
  .scene-tools {
    padding: 8px 12px;
    flex-shrink: 0;
  }
  .camera {
    gap: 4px;
  }
  .scene-wrap {
    flex: 1;
    position: relative;
    min-height: 200px;
    background: var(--bg);
    isolation: isolate;
    touch-action: none;
    user-select: none;
  }
  .scene-wrap canvas {
    position: absolute;
    width: 100%;
    height: 100%;
    display: block;
    inset: 0;
  }
  .scene-wrap canvas[hidden] {
    display: none;
  }
  .scene-label {
    position: absolute;
    left: 14px;
    top: 12px;
    pointer-events: none;
    color: var(--muted);
    font: 10px var(--mono);
    letter-spacing: 1.5px;
  }
  .scene-caption {
    position: absolute;
    bottom: 12px;
    left: 14px;
    pointer-events: none;
    font-size: 10px;
    line-height: 1.6;
    color: var(--muted);
  }
  .scene-scale {
    position: absolute;
    right: 14px;
    bottom: 12px;
    font: 10px var(--mono);
    color: var(--muted);
    border-top: 0;
    padding: 5px 8px 0;
    pointer-events: none;
  }
  .handle {
    position: absolute;
    transform: translate(-50%, -50%);
    z-index: 2;
    border: 0;
    background: transparent;
    min-height: 32px;
    min-width: 32px;
    padding: 0;
    color: #f5f7fa;
    touch-action: none;
    cursor: move;
  }
  .handle:hover {
    background: transparent;
  }
  .handle::before {
    content: "";
    display: block;
    position: absolute;
    inset: 9px;
    border: 1.5px solid #edf3ff;
    border-radius: 50%;
    box-shadow: 0 0 0 3px #13182080;
  }
  .handle.drive::before {
    border-radius: 2px;
    border-color: #4e8fff;
    background: #327bff80;
    transform: rotate(45deg);
  }
  .handle span {
    position: absolute;
    left: 30px;
    top: 5px;
    font: 10px var(--mono);
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 0 1px 2px #000;
  }
  .center-mount {
    position: absolute;
    pointer-events: none;
    background: #64707a;
    border: 1px solid #9da6ad;
    border-radius: 2px;
    transform: translate(-50%, -50%);
    z-index: 1;
    box-shadow: inset 0 0 0 4px #3e4852;
  }
  .center-mount::after {
    content: "";
    position: absolute;
    inset: 40%;
    border-radius: 50%;
    background: #a9b3bb;
  }
  .layer-controls {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 9px 14px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    flex-shrink: 0;
  }
  .layer-controls phy-checkbox {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .layer-controls small {
    margin-left: auto;
    color: var(--muted);
    font-size: 10px;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readout {
    border-right: 1px solid var(--border);
    padding: 11px 12px;
  }
  .readout:last-child {
    border: 0;
  }
  .readout small {
    display: block;
    color: var(--muted);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .value {
    font-size: 21px;
    font-weight: 500;
  }
  .unit {
    font: 10px var(--font);
    margin-left: 5px;
    color: var(--muted);
  }
  .timeline {
    display: flex;
    gap: 10px;
    align-items: center;
    border-top: 1px solid var(--border);
    padding: 11px 12px;
    flex-shrink: 0;
    font: 10px var(--mono);
    color: var(--muted);
  }
  .timeline phy-slider {
    flex: 1;
    min-width: 0;
  }
  .timeline span {
    white-space: nowrap;
  }
  .time-label {
    border-left: 1px solid var(--border);
    padding-left: 9px;
    color: var(--text);
  }
  .observation-content {
    height: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px;
  }
  .view-note {
    margin: 0;
    flex-shrink: 0;
  }
  .facts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px 10px;
    flex-shrink: 0;
  }
  .facts small {
    display: block;
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .facts b {
    font: 14px var(--mono);
    font-weight: 450;
  }
  .plot-heading {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
    flex-shrink: 0;
  }
  .chart-wrap {
    flex: 1;
    min-height: 128px;
  }
  .plate-chart {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: block;
    touch-action: none;
  }
  .plate-chart text {
    font: 10px var(--mono);
    fill: var(--muted);
  }
  .chart-caption {
    font-size: 10px;
    color: var(--muted);
    margin: 0;
    line-height: 1.6;
  }
  .coordinates {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }
  .coordinate {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 7px;
    font-size: 11px;
  }
  .coordinate label {
    margin: 0;
    white-space: nowrap;
    font-size: 10px;
  }
  .support {
    padding: 12px 14px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .equation {
    font-size: 12px;
    line-height: 1.8;
  }
  .support p {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
    margin: 7px 0 0;
  }
  .preset-heading {
    font-size: 11px;
    margin: 0 0 10px;
    color: var(--muted);
    font-weight: 450;
  }
  .presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
  }
  .preset {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 7px 3px;
    min-height: 46px;
    font: 12px var(--mono);
  }
  .preset small {
    font: 9px var(--mono);
    color: var(--muted);
  }
  .preset-block {
    padding: 12px 14px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .energy-track {
    display: flex;
    height: 5px;
    background: var(--subtle);
    margin-top: 8px;
    flex-shrink: 0;
  }
  .warning {
    color: var(--red) !important;
  }
  @media (max-height: 800px) {
    .intro {
      display: none;
    }
    .parameter-body {
      padding-top: 10px;
    }
    .parameter {
      margin-bottom: 9px;
    }
    .parameter label {
      margin-bottom: 5px;
    }
    .readout {
      padding: 9px 12px;
    }
    .value {
      font-size: 19px;
    }
    .observation-content {
      gap: 6px;
      padding: 8px 12px;
    }
    .facts {
      gap: 10px;
    }
    .facts b {
      font-size: 12px;
    }
    .facts small {
      margin-bottom: 4px;
    }
    .support {
      padding: 6px 12px;
    }
    .support p {
      font-size: 10px;
      margin-top: 5px;
    }
    .preset-block {
      padding: 6px 12px;
    }
    .preset-heading {
      margin-bottom: 6px;
    }
    .preset {
      min-height: 36px;
      padding: 4px 2px;
      gap: 1px;
    }
    .scene-caption {
      font-size: 9px;
    }
    .layer-controls {
      padding: 8px 12px;
    }
    .derived {
      gap: 6px;
      margin-top: 10px;
      padding-top: 8px;
    }
  }
  @media (max-height: 719px) {
    :host {
      overflow: auto;
    }
    .lab {
      min-height: 574px;
    }
  }
`;
