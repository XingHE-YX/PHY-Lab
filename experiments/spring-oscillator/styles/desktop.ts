import { css } from "lit";
export const styles = css`
  :host {
    display: grid;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    grid-template-rows: auto minmax(0, 1fr) auto clamp(150px, 23vh, 220px);
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
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
  }
  @supports not selector(::-webkit-scrollbar) {
    * {
      scrollbar-width: thin;
    }
  }
  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 30px;
    margin: 0 0 10px;
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
    gap: 0;
    min-height: 0;
    align-items: stretch;
  }
  .panel {
    border: 1px solid var(--border);
    border-radius: 0;
    min-height: 0;
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
  .parameters {
    display: flex;
    flex-direction: column;
  }
  .parameter-body {
    min-height: 0;
    overflow: auto;
    scrollbar-gutter: stable;
    padding: 16px 18px;
  }
  .parameter {
    margin-bottom: 18px;
  }
  .parameter label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    margin-bottom: 8px;
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
    min-height: 0;
    overflow: hidden;
    background: var(--surface);
  }
  .scene {
    width: 100%;
    height: 100%;
    max-height: 100%;
    min-height: 0;
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
    padding: 10px 18px;
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
  .timeline {
    padding: 12px 18px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 12px;
    align-items: center;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--muted);
  }
  .timeline span {
    white-space: nowrap;
  }
  .timeline input {
    min-width: 0;
    flex: 1;
  }
  .timeline .time-label {
    color: var(--text);
    border-left: 1px solid var(--border);
    padding-left: 12px;
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
    min-height: 0;
    overflow: auto;
    scrollbar-gutter: stable;
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
    gap: 0;
    margin: 16px 0;
  }
  .mini-stat {
    padding: 14px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  .mini-stat + .mini-stat {
    border-left: 0;
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
    margin-top: 0;
    border-top: 0;
    padding: 10px 18px;
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
  .support {
    margin-top: 0;
    border-top: 0;
    display: flex;
    flex-direction: column;
  }
  #support-content {
    min-height: 0;
    overflow: auto;
    scrollbar-gutter: stable;
    flex: 1;
  }
  .bench > .panel + .panel {
    border-left: 0;
  }
  .tabs,
  .support-tabs,
  .panel-heading,
  .scene-header,
  .readouts,
  .timeline,
  .stage > .toggles,
  .observation-note {
    flex-shrink: 0;
  }
  .support-tabs {
    display: flex;
    gap: 6px;
    padding: 10px 18px;
    border-bottom: 1px solid var(--border);
  }
  .support-tabs button {
    background: transparent;
    border-color: transparent;
  }
  .support-tabs button.selected {
    background: var(--primary-soft);
    color: var(--primary);
  }
  .theory {
    padding: 18px 20px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px 28px;
    align-items: start;
  }
  .equation {
    font-family: var(--mono);
    font-size: 16px;
    line-height: 1.8;
  }
  .equation small {
    display: block;
    font-size: 11px;
    color: var(--muted);
    margin-top: 7px;
  }
  .explanation {
    grid-column: 1;
    font-size: 12px;
    line-height: 1.9;
    color: var(--muted);
    margin: 0;
  }
  .derivation {
    grid-column: 2;
    grid-row: 1 / 3;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 3px;
  }
  .derivation summary {
    color: var(--text);
  }
  .derivation p {
    font-family: var(--mono);
    font-size: 12px;
    line-height: 2;
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-bottom: 0;
  }
  .task-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 18px 20px;
    gap: 18px;
  }
  .task {
    padding: 4px 18px 4px 0;
    border-right: 1px solid var(--border);
  }
  .task:last-child {
    border-right: 0;
  }
  .task h3 {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.7;
    min-height: 44px;
    margin: 0 0 12px;
  }
  .task-answer {
    margin-top: 14px;
  }
  .task p {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.8;
    margin-bottom: 0;
  }
`;
