import { css } from "lit";
export const styles = css`
  :host {
    display: block;
    font-family: var(--font);
    color: var(--text);
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
  button,
  a,
  input,
  select,
  summary,
  [tabindex] {
    outline-offset: 3px;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  summary:focus-visible,
  [tabindex]:focus-visible {
    outline: 2px solid var(--primary);
  }
  button {
    cursor: pointer;
    color: inherit;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    min-height: 34px;
    padding: 7px 12px;
    font-size: 12px;
  }
  button:hover {
    background: var(--subtle);
  }
  button.selected {
    color: var(--primary);
    background: var(--primary-soft);
    border-color: var(--primary);
  }
  .mono {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .muted {
    color: var(--muted);
  }
  .heading {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 25px;
  }
  h1 {
    font-weight: 550;
    font-size: 28px;
    letter-spacing: -0.7px;
    margin: 0 0 10px;
  }
  .intro {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.8;
    margin: 0;
  }
  .model {
    font-size: 10px;
    color: var(--muted);
    line-height: 1.8;
    text-align: right;
    padding-top: 8px;
    max-width: 320px;
  }
  .bench {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 18px;
  }
  .panel {
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--surface);
    overflow: hidden;
  }
  .scene-header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 20px;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.5px;
  }
  .scene {
    display: block;
    width: 100%;
    height: auto;
    min-height: 210px;
    touch-action: pan-y;
    user-select: none;
  }
  .mass {
    cursor: grab;
    touch-action: none;
  }
  .mass:active {
    cursor: grabbing;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid var(--border);
  }
  .readout {
    padding: 14px 20px;
    border-right: 1px solid var(--border);
  }
  .readout:last-child {
    border-right: 0;
  }
  .readout .label {
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 7px;
  }
  .readout .value {
    font-size: 17px;
  }
  .unit {
    font-size: 10px;
    color: var(--muted);
    margin-left: 4px;
  }
  .controls {
    padding: 15px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .controls select {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    padding: 7px;
    border-radius: 3px;
    font-size: 11px;
  }
  .time-label {
    font-size: 11px;
    color: var(--muted);
    margin-left: auto;
  }
  .timeline {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 0 20px 16px;
    font-size: 10px;
    color: var(--muted);
  }
  input[type="range"] {
    accent-color: var(--primary);
    width: 100%;
    height: 18px;
    margin: 0;
    cursor: pointer;
  }
  .parameters {
    padding: 20px;
  }
  .section-title {
    font-size: 10px;
    letter-spacing: 1px;
    color: var(--muted);
    margin: 0 0 23px;
  }
  .parameter {
    margin-bottom: 23px;
  }
  .parameter label {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    margin-bottom: 12px;
  }
  .parameter .val {
    font-size: 11px;
    font-family: var(--mono);
  }
  .limits {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    margin-top: 4px;
  }
  .derived {
    padding-top: 17px;
    border-top: 1px solid var(--border);
    display: grid;
    gap: 13px;
  }
  .derived-row {
    font-size: 11px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .derived-row span:last-child {
    font-family: var(--mono);
  }
  details {
    font-size: 12px;
  }
  summary {
    cursor: pointer;
    color: var(--muted);
    list-style-position: inside;
  }
  .advanced {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid var(--border);
  }
  .advanced .parameter {
    margin-top: 20px;
    margin-bottom: 0;
  }
  .toggles {
    display: flex;
    gap: 20px;
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    font-size: 11px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .toggles label {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .toggles input {
    accent-color: var(--primary);
  }
  .analysis {
    margin-top: 25px;
  }
  .tabs {
    display: flex;
    gap: 22px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 18px;
  }
  .tabs button {
    border: 0;
    background: none;
    border-radius: 0;
    padding: 12px 1px;
    font-size: 13px;
    color: var(--muted);
    border-bottom: 2px solid transparent;
  }
  .tabs button.active {
    color: var(--text);
    border-bottom-color: var(--primary);
  }
  .placeholder {
    padding: 30px;
    color: var(--muted);
    font-size: 12px;
  }
  .plot-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 285px;
    gap: 18px;
  }
  .plot {
    padding: 17px 20px;
  }
  .plot-top {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    gap: 12px;
  }
  .chart {
    width: 100%;
    height: auto;
    display: block;
    touch-action: none;
  }
  .equations {
    padding: 20px;
  }
  .equation {
    font-family: var(--mono);
    font-size: 15px;
    line-height: 1.9;
    margin: 12px 0;
    word-spacing: 2px;
  }
  .explanation {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.9;
  }
  .subtle-box {
    background: var(--subtle);
    border: 1px solid var(--border);
    padding: 10px 12px;
    font-size: 11px;
    line-height: 1.8;
  }
  .derivation {
    margin-top: 20px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }
  .derivation p {
    font-family: var(--mono);
    font-size: 12px;
    line-height: 2;
  }
  .moments {
    margin-top: 24px;
    padding: 20px;
  }
  .moment-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .moment-hint {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.8;
    margin: 14px 0 0;
    min-height: 22px;
  }
  .moments .section-title {
    margin-bottom: 15px;
  }
  .compare {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    font-size: 10px;
    color: var(--muted);
    margin: 12px 0;
  }
  .compare button {
    font-size: 10px;
    min-height: 25px;
    padding: 4px 7px;
  }
  .energy-values {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
    margin: 18px 0;
  }
  .energy-values small {
    font-size: 10px;
    color: var(--muted);
    display: block;
    margin-bottom: 7px;
  }
  .energy-values strong {
    font-weight: 500;
    font-size: 15px;
    font-family: var(--mono);
  }
  .energy-bar {
    display: flex;
    height: 9px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--subtle);
  }
  .energy-caption {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--muted);
    margin-top: 8px;
  }
  .tasks {
    margin: 28px 0 0;
  }
  .task-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
  .task {
    padding: 18px;
  }
  .task-number {
    font-size: 10px;
    color: var(--muted);
    font-family: var(--mono);
  }
  .task summary {
    color: var(--text);
    font-size: 12px;
    line-height: 1.8;
    margin: 12px 0;
  }
  .task p {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.8;
  }
  .task button {
    font-size: 11px;
  }
  .zero {
    font-size: 11px;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .bench {
      grid-template-columns: minmax(0, 1fr) 220px;
    }
    .plot-layout {
      grid-template-columns: 1fr;
    }
    .model {
      max-width: 210px;
    }
    .scene-header {
      padding: 14px;
    }
    .readout {
      padding: 14px;
    }
    .equations {
      display: block;
    }
  }
  @media (max-width: 660px) {
    .heading {
      display: block;
    }
    .model {
      text-align: left;
      max-width: none;
      font-size: 9px;
    }
    .bench {
      grid-template-columns: 1fr;
    }
    .parameters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 24px;
    }
    .parameters .section-title {
      grid-column: 1/-1;
    }
    .advanced {
      margin-top: 0;
    }
    .scene {
      min-height: 180px;
    }
    .readout {
      padding: 12px;
    }
    .readout .value {
      font-size: 14px;
    }
    .controls {
      padding: 12px;
    }
    .time-label {
      margin-left: 0;
    }
    .task-grid {
      grid-template-columns: 1fr;
    }
    .tabs {
      gap: 20px;
    }
    .plot {
      padding: 15px 10px;
    }
    .heading h1 {
      font-size: 25px;
    }
    .scene-header {
      font-size: 9px;
    }
    .controls select {
      max-width: 100px;
    }
    .timeline {
      padding: 0 12px 12px;
    }
    .equations {
      padding: 18px;
    }
  }
  @media (max-width: 660px) {
    .scene text {
      font-size: 19px;
    }
    .scene .mass {
      r: 50px;
    }
    .chart text {
      font-size: 16px;
    }
  }
`;
