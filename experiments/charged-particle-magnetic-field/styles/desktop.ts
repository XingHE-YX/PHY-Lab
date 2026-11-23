import { css } from "lit";

export const styles = css`
  :host {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 8px;
    height: 100%;
    min-height: 0;
    color: var(--text);
    font: 13px var(--font);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h1,
  h2,
  p,
  dl,
  dd {
    margin: 0;
  }
  h1 {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  h2 {
    font-size: 14px;
    font-weight: 600;
  }
  .heading,
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .heading > div {
    display: flex;
    align-items: baseline;
    gap: 16px;
  }
  .heading p,
  .mono,
  .scene-label {
    font-size: 12px;
  }
  .mono,
  .scene-label {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
  }
  .heading p,
  .mode,
  .scene-details,
  .layer-control > span,
  .formula p,
  dt {
    color: var(--muted);
  }
  .lab {
    display: grid;
    grid-template-columns: 212px minmax(0, 1fr) 320px;
    gap: 8px;
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    min-height: 0;
    padding: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
  }
  .parameters h2,
  .panel-top h2,
  .observation h2 {
    line-height: 20px;
  }
  .parameter-list {
    display: grid;
    gap: 12px;
  }
  .parameter phy-slider,
  .timeline phy-slider {
    margin-top: 4px;
  }
  .layer-control {
    border-top: 1px solid var(--border);
    margin-top: 4px;
    padding-top: 12px;
  }
  .layer-control > div {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin-top: 4px;
  }
  .stage {
    gap: 8px;
  }
  .mode {
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 3px;
    font-size: 11px;
  }
  .scene-wrap {
    position: relative;
    flex: 1;
    min-height: 220px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
  }
  .scene,
  .plot {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
  }
  .scene {
    position: absolute;
    inset: 0;
  }
  .scene-label {
    fill: var(--muted);
    paint-order: stroke;
    stroke: var(--bg);
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  .grid-line,
  .scene-axis,
  .predicted,
  .flight-path,
  .scale,
  .trace,
  .cursor {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .grid-line {
    stroke: var(--border);
  }
  .scene-axis {
    stroke: var(--muted);
    opacity: 0.45;
  }
  .field-symbol {
    fill: var(--muted);
    opacity: 0.35;
  }
  .field-cross {
    stroke: var(--muted);
    opacity: 0.45;
  }
  .scale {
    stroke: var(--muted);
    stroke-width: 1.2;
  }
  .predicted {
    stroke: var(--muted);
    stroke-width: 1.4;
    stroke-dasharray: 4 5;
    opacity: 0.8;
  }
  .flight-path {
    stroke: var(--blue);
    stroke-width: 2.4;
  }
  .launch-point {
    fill: var(--surface);
    stroke: var(--muted);
  }
  .particle {
    fill: var(--primary);
    stroke: var(--bg);
    stroke-width: 2;
  }
  .particle.ready {
    stroke: var(--primary-soft);
  }
  .vector line {
    stroke: currentColor;
    stroke-width: 2;
  }
  .vector path,
  .vector text {
    fill: currentColor;
  }
  .vector text {
    font: 600 12px var(--mono);
    paint-order: stroke;
    stroke: var(--bg);
    stroke-width: 3px;
  }
  .velocity,
  .velocity-key,
  .horizontal {
    color: var(--blue);
  }
  .force,
  .force-key {
    color: var(--red);
  }
  .energy,
  .vertical {
    color: var(--green);
  }
  .aim-handle {
    fill: transparent;
    cursor: grab;
    touch-action: none;
  }
  .aim-handle:hover,
  .aim-handle:focus-visible {
    stroke: var(--primary);
    stroke-dasharray: 3 3;
    outline: none;
  }
  .aim-handle:active {
    cursor: grabbing;
  }
  .scene-details {
    min-height: 34px;
    display: flex;
    align-content: start;
    flex-wrap: wrap;
    gap: 3px 13px;
    font-size: 11px;
    line-height: 15px;
  }
  .timeline {
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }
  .moments {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }
  .views {
    flex: 1;
    min-height: 160px;
  }
  .plot-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    height: 100%;
    min-height: 0;
    padding: 4px 0;
  }
  .plot {
    height: auto;
    aspect-ratio: 288 / 218;
    max-height: calc(100% - 22px);
  }
  .plot .scene-label {
    stroke: var(--surface);
  }
  .cursor {
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }
  .trace {
    stroke: currentColor;
    stroke-width: 1.7;
  }
  .trace.vertical {
    stroke-dasharray: 4 3;
  }
  .chart-point {
    fill: currentColor;
    stroke: var(--surface);
  }
  .plot-legend {
    display: flex;
    justify-content: center;
    gap: 12px;
    font-family: var(--mono);
  }
  .plot-unit {
    color: var(--muted);
  }
  .plot-legend span:not(.plot-unit)::before {
    content: "";
    display: inline-block;
    width: 12px;
    vertical-align: middle;
    margin-inline-end: 4px;
    border-top: 2px solid;
  }
  .plot-legend .vertical::before {
    border-top-style: dashed;
  }
  .readings {
    border-top: 1px solid var(--border);
  }
  .readings > div {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid var(--border);
  }
  .formula {
    display: grid;
    gap: 5px;
    min-height: 65px;
    padding: 8px;
    background: var(--subtle);
    border-radius: 3px;
  }
  .formula p {
    font-size: 12px;
    line-height: 1.35;
  }
  @media (max-height: 719px) {
    :host {
      overflow-y: auto;
    }
    .lab {
      min-height: 540px;
    }
  }
`;
