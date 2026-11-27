import { css } from "lit";

export const styles = css`
  :host {
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr);
    gap: 8px;
    height: 100%;
    min-height: 0;
    color: var(--text);
    font-family: var(--font);
    --positive: light-dark(#ad5436, #ef9c77);
    --positive-body: light-dark(#a94831, #a34e38);
    --negative-body: light-dark(#3261a9, #486fb7);
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
    font-weight: 600;
  }
  h2,
  h3 {
    font-size: 12px;
    font-weight: 600;
  }
  p {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }
  output {
    font: 12px/18px var(--mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .heading {
    display: flex;
    align-self: center;
    align-items: baseline;
    gap: 12px;
  }
  .lab {
    display: grid;
    grid-template-columns: 215px minmax(0, 1fr) 348px;
    gap: 8px;
    min-height: 0;
  }
  .panel {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .panel-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 43px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .coordinates {
    color: var(--muted);
    font: 10px/16px var(--mono);
    white-space: nowrap;
  }
  .switches {
    display: flex;
    gap: 10px;
    margin-left: auto;
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
  }
  .parameters {
    display: grid;
    gap: 13px;
    padding: 12px;
  }
  .parameter {
    display: grid;
    gap: 5px;
  }
  .parameter + .parameter {
    border-top: 1px solid var(--border);
    padding-top: 12px;
  }
  .parameter-label,
  .limits {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .charge-position {
    color: var(--muted);
    font-size: 11px;
  }
  .presets,
  .footer {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
  }
  .presets {
    border-top: 1px solid var(--border);
  }
  .footer {
    margin-top: auto;
  }
  .positive {
    color: var(--positive);
  }
  .negative {
    color: var(--blue);
  }
  .zero,
  .neutral {
    color: var(--muted);
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    min-height: 0;
    grid-template-rows: minmax(0, 1fr);
    padding: 8px;
    background: var(--bg);
  }
  .field-scene,
  .slice-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .field-layers {
    pointer-events: none;
  }
  .field-board {
    fill: var(--surface);
    stroke: var(--border);
    cursor: crosshair;
  }
  .grid-line,
  .world-axis,
  .contour,
  .field-arrows,
  .probe-arrow,
  .slice-guide,
  .profile-trace,
  .profile-cursor {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .grid-line {
    stroke: var(--border);
    stroke-opacity: 0.72;
  }
  .world-axis {
    stroke: var(--muted);
    stroke-opacity: 0.5;
    stroke-dasharray: 3 4;
  }
  .axis-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .contour {
    stroke: currentColor;
    stroke-width: 1.25;
    stroke-opacity: 0.72;
  }
  .contour.negative {
    stroke-dasharray: 3 3;
  }
  .contour.zero {
    stroke: var(--text);
    stroke-width: 2;
    stroke-opacity: 0.88;
  }
  .field-arrows {
    stroke: var(--muted);
    opacity: 0.62;
    stroke-width: 1.1;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .probe-arrow {
    stroke: var(--green);
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .slice-guide,
  .profile-cursor {
    stroke: var(--green);
    stroke-dasharray: 4 5;
    stroke-opacity: 0.7;
  }
  .excluded-zone {
    fill: var(--bg);
    stroke: var(--muted);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }
  .handle {
    cursor: grab;
    touch-action: none;
    outline: none;
  }
  .handle:active {
    cursor: grabbing;
  }
  .handle-hit {
    fill: transparent;
    stroke: transparent;
  }
  .handle:focus-visible .handle-hit {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .handle-core {
    stroke: var(--surface);
    stroke-width: 1.2;
  }
  .handle.positive .handle-core {
    fill: var(--positive-body);
  }
  .handle.negative .handle-core {
    fill: var(--negative-body);
  }
  .handle.neutral .handle-core {
    fill: var(--muted);
  }
  .handle-label {
    fill: var(--text);
    stroke: var(--surface);
    stroke-width: 3px;
    paint-order: stroke;
    font: 600 11px var(--mono);
    pointer-events: none;
  }
  .sign {
    fill: white;
    font: 700 13px var(--mono);
    pointer-events: none;
  }
  .probe .handle-core {
    fill: var(--surface);
    stroke: var(--green);
    stroke-width: 2;
  }
  .probe .probe-dot {
    fill: var(--green);
  }
  .probe.masked .handle-core {
    stroke: var(--red);
    stroke-dasharray: 3 2;
  }
  .probe.masked .probe-dot {
    fill: var(--red);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 12px;
    align-items: center;
    border-block: 1px solid var(--border);
    padding: 8px 10px;
    font-size: 11px;
    line-height: 16px;
  }
  .legend span:not(.arrow-note)::before {
    content: "";
    display: inline-block;
    width: 14px;
    border-top: 1px solid;
    margin: 0 4px 3px 0;
  }
  .legend span.negative::before {
    border-top-style: dashed;
  }
  .legend span.zero::before {
    border-top-width: 2px;
    color: var(--text);
  }
  .arrow-note {
    color: var(--muted);
    margin-left: auto;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    flex-shrink: 0;
  }
  .readouts > div {
    padding: 9px 10px;
  }
  .readouts > div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span {
    display: block;
    font-size: 11px;
    line-height: 16px;
    color: var(--muted);
  }
  .readouts output {
    display: block;
    font-size: 16px;
    line-height: 24px;
  }
  .readouts small {
    font-size: 10px;
  }
  .readouts .strength output {
    color: var(--green);
  }
  .readouts .potential output {
    color: var(--blue);
  }
  .observation-tabs {
    flex: 1;
    min-height: 0;
    --tab-height: 42px;
  }
  .observation-tabs::part(panel) {
    display: flex;
    flex-direction: column;
  }
  .observation {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    flex: 1;
    min-height: 0;
  }
  .contribution-panel,
  .slice-panel {
    min-height: 0;
    padding: 12px;
    display: grid;
  }
  .contribution-panel {
    align-content: center;
    gap: 16px;
  }
  .contributions {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }
  .contributions th,
  .contributions td {
    border-bottom: 1px solid var(--border);
    padding: 9px 4px;
    line-height: 18px;
    text-align: right;
  }
  .contributions th:first-child {
    width: 21%;
    text-align: left;
  }
  .contributions thead th,
  .contributions small {
    color: var(--muted);
  }
  .contributions small {
    font-size: 9px;
  }
  .contributions td {
    font: 12px var(--mono);
  }
  .contributions tr[data-contribution="total"] {
    background: var(--subtle);
  }
  .slice-panel {
    grid-template-rows: minmax(0, 1fr) auto;
  }
  .slice-panel.empty {
    align-content: center;
    justify-content: center;
  }
  .profile-trace {
    stroke: var(--blue);
    stroke-width: 2;
  }
  .profile-probe {
    fill: var(--green);
    stroke: var(--surface);
    stroke-width: 1.1;
  }
  .model-formula {
    min-height: 112px;
    padding: 12px;
    border-top: 1px solid var(--border);
  }
  .model-formula strong {
    color: var(--green);
    font-size: 13px;
  }
  .model-formula strong[data-case="masked"] {
    color: var(--red);
  }
  .model-formula p {
    margin: 6px 0;
  }
  .model-formula phy-math {
    display: block;
    font-size: 14px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 6px;
  }
  @media (max-height: 690px) {
    :host {
      height: auto;
      min-height: 590px;
      grid-template-rows: 38px minmax(540px, 1fr);
    }
  }
`;
