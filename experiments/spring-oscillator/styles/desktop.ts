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
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 3px;
    min-height: 34px;
    padding: 7px 11px;
    font-size: 12px;
  }
  button:hover {
    background: var(--subtle);
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
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
    align-items: center;
    justify-content: space-between;
    gap: 30px;
    margin: 0 0 20px;
  }
  .heading-copy {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
  }
  h1 {
    font-weight: 550;
    font-size: 20px;
    letter-spacing: -0.8px;
    margin: 0;
  }
  .intro {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
    line-height: 1.6;
  }
  .lab-meta {
    display: flex;
    gap: 22px;
    align-items: center;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-family: var(--mono);
    padding: 7px 11px;
    border: 1px solid var(--border);
    border-radius: 3px;
  }
  .status-dot {
    width: 5px;
    height: 5px;
    background: var(--muted);
    border-radius: 50%;
  }
  .running .status-dot {
    background: var(--blue);
    box-shadow: 0 0 8px var(--blue);
  }
  .lab-grid {
    display: grid;
    grid-template-columns: 218px minmax(480px, 1fr) 354px;
    gap: 14px;
    align-items: stretch;
  }
  .panel {
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--surface);
    overflow: hidden;
  }
  .panel-heading {
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 550;
  }
  .panel-heading span {
    font-weight: 400;
    font-size: 10px;
    color: var(--muted);
    letter-spacing: 0.8px;
  }
  .parameter-body {
    padding: 21px 18px;
  }
  .parameter {
    margin-bottom: 25px;
  }
  .parameter label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 13px;
    gap: 8px;
  }
  .parameter .val {
    font-family: var(--mono);
    font-size: 11px;
  }
  .limits {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
    font-family: var(--mono);
    font-size: 9px;
    color: var(--muted);
  }
  input[type="range"] {
    accent-color: var(--primary);
    width: 100%;
    height: 15px;
    margin: 0;
    cursor: pointer;
  }
  .derived {
    border-top: 1px solid var(--border);
    padding-top: 18px;
    display: grid;
    gap: 14px;
  }
  .derived-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
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
    line-height: 1.7;
  }
  .advanced {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }
  .advanced .parameter {
    margin-top: 18px;
    margin-bottom: 0;
  }
  .stage {
    display: flex;
    flex-direction: column;
  }
  .scene-header {
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
  }
  .scene-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    min-height: 305px;
    background: var(--surface);
  }
  .scene {
    width: 100%;
    height: 305px;
    display: block;
    user-select: none;
  }
  .mass {
    cursor: grab;
    touch-action: none;
  }
  .mass:active {
    cursor: grabbing;
  }
  .scene-scale {
    position: absolute;
    bottom: 12px;
    right: 17px;
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 0.5px;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid var(--border);
  }
  .readout {
    padding: 15px 18px;
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
  .value {
    font-family: var(--mono);
    font-size: 20px;
    font-weight: 500;
  }
  .unit {
    font-size: 10px;
    color: var(--muted);
    margin-left: 4px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 18px;
    border-top: 1px solid var(--border);
  }
  .controls select {
    background: var(--surface);
    color: var(--text);
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 11px;
  }
  .time-label {
    margin-left: auto;
    font-size: 12px;
    font-family: var(--mono);
  }
  .timeline {
    padding: 0 18px 16px;
    display: flex;
    gap: 12px;
    align-items: center;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }
  .toggles {
    display: flex;
    gap: 13px;
    font-size: 11px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .toggles label {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .toggles input {
    accent-color: var(--primary);
    margin: 0;
  }
  .stage .toggles {
    padding: 13px 18px;
    border-top: 1px solid var(--border);
    justify-content: space-between;
  }
  .stage .toggle-group {
    display: flex;
    gap: 14px;
  }
  .arrow-note {
    font-size: 9px;
  }
  .observation {
    display: flex;
    flex-direction: column;
  }
  .tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-bottom: 1px solid var(--border);
  }
  .tabs button {
    border: 0;
    border-radius: 0;
    background: none;
    padding: 16px 4px;
    font-size: 12px;
    color: var(--muted);
    border-bottom: 2px solid transparent;
  }
  .tabs button.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    background: var(--primary-soft);
  }
  .plot {
    padding: 15px 16px;
    flex: 1;
  }
  .plot-top {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 10px;
  }
  .chart {
    width: 100%;
    height: auto;
    display: block;
    touch-action: none;
    margin-top: 8px;
  }
  .plot .toggles {
    margin: 13px 0 6px;
    font-size: 10px;
    gap: 10px;
  }
  .compare {
    border-top: 1px solid var(--border);
    margin-top: 14px;
    padding-top: 11px;
    font-size: 10px;
    color: var(--muted);
    line-height: 1.8;
  }
  .compare button {
    padding: 3px 6px;
    min-height: 24px;
    font-size: 10px;
    float: right;
  }
  .observation-note {
    padding: 15px 16px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted);
    line-height: 1.9;
    background: var(--bg);
  }
  .mini-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 20px 0;
  }
  .mini-stat {
    padding: 14px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .mini-stat small {
    display: block;
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 9px;
  }
  .mini-stat strong {
    font-family: var(--mono);
    font-size: 16px;
    font-weight: 500;
  }
  .energy-values {
    display: grid;
    gap: 14px;
    margin: 18px 0;
  }
  .energy-values > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
  }
  .energy-values small {
    font-size: 11px;
    color: var(--muted);
  }
  .energy-values strong {
    font-family: var(--mono);
    font-size: 16px;
    font-weight: 500;
  }
  .energy-bar {
    display: flex;
    height: 7px;
    overflow: hidden;
    background: var(--subtle);
    border-radius: 2px;
  }
  .energy-caption {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 10px;
    color: var(--muted);
  }
  .moments {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-top: 14px;
    padding: 14px 18px;
  }
  .section-title {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.7px;
    color: var(--muted);
    margin: 0;
    white-space: nowrap;
  }
  .moment-buttons {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .moment-hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
    line-height: 1.7;
    border-left: 1px solid var(--border);
    padding-left: 18px;
  }
  .theory {
    margin-top: 14px;
    display: grid;
    grid-template-columns: minmax(380px, 1fr) 1fr 220px;
    align-items: center;
    padding: 18px 20px;
    gap: 25px;
  }
  .equation {
    font-family: var(--mono);
    font-size: 16px;
    line-height: 1.8;
    margin: 0;
  }
  .equation small {
    display: block;
    font-size: 11px;
    color: var(--muted);
    margin-top: 7px;
  }
  .explanation {
    font-size: 12px;
    line-height: 1.9;
    color: var(--muted);
    margin: 0;
  }
  .derivation {
    border-left: 1px solid var(--border);
    padding-left: 20px;
  }
  .derivation p {
    font-family: var(--mono);
    font-size: 12px;
    line-height: 2;
  }
  .explore {
    margin-top: 16px;
    border-top: 1px solid var(--border);
    padding-top: 15px;
  }
  .explore > summary {
    font-size: 12px;
    letter-spacing: 0.4px;
  }
  .task-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 14px;
  }
  .task {
    padding: 17px;
  }
  .task-number {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }
  .task summary {
    margin: 10px 0;
    color: var(--text);
    font-size: 12px;
  }
  .task p {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.8;
  }
`;
