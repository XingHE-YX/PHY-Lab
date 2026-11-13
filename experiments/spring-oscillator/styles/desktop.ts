import { css } from "lit";
export const styles = css`
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
  button:disabled,
  input:disabled {
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
  .mono,
  .val,
  .value,
  strong,
  .derived-row span:last-child {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .muted,
  .unit {
    color: var(--muted);
  }
  .unit {
    font: 11px var(--font);
    margin-left: 4px;
  }
  .heading,
  .heading-copy,
  .model-switch,
  .scene-header,
  .panel-heading,
  .plot-top,
  .compare,
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
    gap: 14px;
  }
  h1 {
    font-size: 20px;
    font-weight: 550;
    letter-spacing: -0.6px;
    margin: 0;
    white-space: nowrap;
  }
  .intro {
    font-size: 11px;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }
  .model-switch {
    gap: 4px;
    flex-shrink: 0;
  }
  .lab-grid {
    display: grid;
    grid-template-columns: 224px minmax(420px, 1fr) 350px;
    gap: 8px;
    min-height: 0;
  }
  .parameters,
  .stage,
  .observation {
    display: flex;
    flex-direction: column;
  }
  .panel-heading {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    font-weight: 550;
    flex-shrink: 0;
  }
  .status {
    color: var(--muted);
    font-size: 10px;
    font-weight: 400;
  }
  .running {
    color: var(--primary);
  }
  .parameter-tabs,
  .energy-tabs,
  .presets {
    display: flex;
    gap: 5px;
  }
  .parameter-body {
    padding: 16px 14px;
    flex: 1;
    min-height: 0;
  }
  .parameter {
    margin-bottom: 18px;
  }
  .parameter label {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    margin-bottom: 9px;
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
  }
  .derived {
    display: grid;
    gap: 12px;
    border-top: 1px solid var(--border);
    padding-top: 16px;
    margin-top: 16px;
  }
  .derived-row {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 11px;
    line-height: 1.5;
  }
  .derived-row span:first-child {
    color: var(--muted);
  }
  .derived-row span:last-child {
    white-space: nowrap;
  }
  .presets {
    margin: -2px 0 14px;
  }
  .presets button {
    flex: 1;
    padding: 4px;
    font-size: 11px;
  }
  .parameter-note {
    font-size: 11px;
    line-height: 1.8;
    color: var(--muted);
    margin: 0;
  }
  .parameter-footer {
    border-top: 1px solid var(--border);
    padding: 10px 14px;
    display: grid;
    gap: 8px;
    flex-shrink: 0;
  }
  .parameter-footer small {
    color: var(--muted);
    font-size: 10px;
    text-align: center;
  }
  .scene-header {
    height: 40px;
    padding: 0 14px;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    flex-shrink: 0;
  }
  .phasor-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    white-space: nowrap;
  }
  .phase-readout {
    color: var(--muted);
    font-size: 10px;
  }
  .scene-wrap {
    position: relative;
    flex: 1;
    min-height: 120px;
  }
  .scene {
    display: block;
    width: 100%;
    height: 100%;
    user-select: none;
  }
  .mass {
    cursor: grab;
    touch-action: none;
  }
  .mass:active {
    cursor: grabbing;
  }
  .phase-handle {
    cursor: crosshair;
    touch-action: none;
  }
  .phasor-layer {
    opacity: 1;
    visibility: visible;
    transition:
      opacity 180ms ease,
      visibility 180ms;
  }
  .phasor-layer[aria-hidden="true"] {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .scene-instruction,
  .scene-scale {
    position: absolute;
    color: var(--muted);
    font-size: 10px;
    pointer-events: none;
  }
  .scene-instruction {
    top: 14px;
    left: 14px;
  }
  .scene-scale {
    bottom: 10px;
    right: 14px;
    font-size: 9px;
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
  .label {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .value {
    font-size: 22px;
    font-weight: 500;
  }
  .force-readouts {
    display: flex;
    justify-content: space-evenly;
    gap: 5px;
    padding: 8px;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 10px;
    flex-shrink: 0;
  }
  .timeline {
    padding: 12px 14px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 10px;
    align-items: center;
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
    border-left: 1px solid var(--border);
    padding-left: 10px;
    color: var(--text);
  }
  .moments {
    border-top: 1px solid var(--border);
    padding: 10px 12px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    flex-shrink: 0;
  }
  .section-title {
    display: none;
  }
  .moment-buttons {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 5px;
    grid-column: 1/-1;
  }
  .moment-buttons button {
    padding: 5px 2px;
    font-size: 11px;
  }
  .moment-hint {
    font-size: 10px;
    color: var(--muted);
    margin: 0;
    line-height: 1.6;
  }
  .moment-hint + .toggles {
    grid-column: 2;
  }
  .moments > .toggles {
    grid-column: 1/-1;
    justify-content: flex-end;
  }
  .moments:has(.moment-hint) > .toggles {
    grid-column: 2;
  }
  .toggles,
  .toggle-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    color: var(--muted);
  }
  .toggles phy-checkbox {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .plot {
    height: 100%;
    padding: 12px;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .plot[hidden] {
    display: none;
  }
  .plot-top {
    flex-shrink: 0;
    font-size: 10px;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .plot-top .toggles {
    font-size: 10px;
    gap: 6px;
  }
  .plot-time {
    margin-left: auto;
    white-space: nowrap;
  }
  .chart-stack {
    display: grid;
    grid-auto-rows: minmax(0, 1fr);
    flex: 1;
    min-height: 70px;
  }
  .chart {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: block;
    touch-action: none;
  }
  .mini-stats,
  .energy-values {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    flex-shrink: 0;
    font-size: 11px;
  }
  .mini-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    color: var(--muted);
  }
  .mini-stats b {
    display: block;
    color: var(--text);
    font-size: 14px;
    margin-top: 6px;
    font-weight: 500;
  }
  .energy-values small {
    display: block;
    color: var(--muted);
    font-size: 10px;
    margin-bottom: 5px;
  }
  .energy-values strong {
    font-size: 14px;
    font-weight: 500;
  }
  .energy-bar {
    height: 6px;
    background: var(--subtle);
    border-radius: 2px;
    display: flex;
    flex-shrink: 0;
  }
  .energy-bar div {
    height: 100%;
  }
  .energy-caption {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 10px;
    flex-shrink: 0;
  }
  .observation-note {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.65;
    margin: 0;
    flex-shrink: 0;
  }
  .compare {
    padding-top: 8px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .compare button {
    padding: 4px 8px;
    min-height: 28px;
    font-size: 10px;
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
    flex: 1;
    min-height: 0;
  }
  .exploring .observation-tabs {
    flex: 0;
  }
  .support-tabs {
    --tab-font-size: 11px;
  }
  .support-tabs::part(tabs) {
    padding: 6px 12px 0;
  }
  .equation phy-math {
    font-size: 0.87em;
  }
  .support {
    border: 0;
    border-top: 1px solid var(--border);
    border-radius: 0;
    flex-shrink: 0;
  }
  #support-content {
    padding: 12px;
  }
  .theory {
    display: grid;
    gap: 6px;
  }
  .equation {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 10px;
    font-size: 13px;
    align-items: center;
  }
  .conservation {
    font-size: 12px;
    margin-top: 5px;
  }
  .explanation {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.65;
    margin: 6px 0 0;
  }
  .formula-live {
    display: none;
  }
  .derivation {
    width: fit-content;
    font-size: 10px;
    padding: 0;
    min-height: 22px;
    color: var(--primary);
    border: 0;
    background: none;
  }
  .exploring .support {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .exploring #support-content {
    min-height: 0;
    overflow: auto;
  }
  .task-grid {
    display: grid;
    gap: 12px;
  }
  .task {
    border: 1px solid var(--border);
    padding: 12px;
    border-radius: 3px;
  }
  .task-title {
    margin: 0 0 7px;
    font-size: 13px;
    font-weight: 550;
  }
  .task-description,
  .explore-copy {
    margin: 0 0 9px;
    font-size: 12px;
    line-height: 1.8;
    color: var(--muted);
  }
  .task-status {
    font-size: 10px;
    color: var(--muted);
    margin: 8px 0;
  }
  .task-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 11px;
  }
  .completed {
    border-color: var(--green);
  }
  .active-task {
    border-color: var(--primary);
  }
  .task-check {
    color: var(--green);
  }
  .response-frequency {
    display: grid;
    gap: 8px;
    font-size: 11px;
  }
  .response-frequency > span {
    display: flex;
    justify-content: space-between;
  }
  .response-values {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .response-values small {
    display: block;
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .response-values strong {
    font-size: 12px;
    font-weight: 500;
  }
  .response-peak,
  .response-hint {
    margin: 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.6;
  }
  @media (max-height: 800px) {
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
      gap: 7px;
      padding: 10px;
    }
    #support-content {
      padding: 10px 12px;
    }
    .explanation {
      font-size: 10px;
    }
    .task {
      padding: 10px;
    }
  }
  @media (max-height: 719px) {
    :host {
      overflow: auto;
    }
    .lab-grid {
      min-height: 550px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .phasor-layer {
      transition: none;
    }
  }
`;
