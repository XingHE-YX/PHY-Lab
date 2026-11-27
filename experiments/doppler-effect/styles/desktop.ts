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
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
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
  .fallback-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .lab {
    display: grid;
    grid-template-columns: 232px minmax(0, 1fr) 348px;
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
    gap: 12px;
    min-height: 43px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .motion-status {
    font-size: 11px;
    color: var(--muted);
  }
  .panel-heading phy-checkbox {
    margin-left: auto;
    font-size: 11px;
    color: var(--muted);
  }
  .parameters {
    display: grid;
    gap: 10px;
    padding: 12px;
  }
  .field-label,
  .parameter {
    display: grid;
    gap: 3px;
    font-size: 12px;
  }
  .parameter-label,
  .limits,
  .medium {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }
  .parameter-label {
    line-height: 18px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .medium {
    padding: 12px;
    color: var(--muted);
    border-block: 1px solid var(--border);
    font-size: 11px;
  }
  .medium output {
    color: var(--text);
  }
  .footer {
    display: grid;
    gap: 8px;
    padding: 12px;
    margin-top: auto;
  }
  .footer p {
    font-size: 11px;
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    padding: 8px;
    background: var(--bg);
  }
  .wave-field,
  .timing-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .field-edge,
  .field-grid,
  .track-axis,
  .track-tick,
  .wavefront,
  .motion-arrow,
  .glyph,
  .receive-pulse,
  .time-grid,
  .timing-axis,
  .crest-tick,
  .chart-cursor {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .field-edge,
  .field-grid,
  .time-grid {
    stroke: var(--border);
  }
  .field-edge {
    fill: var(--surface);
  }
  .track-axis,
  .track-tick,
  .timing-axis {
    stroke: var(--muted);
  }
  .track-axis,
  .chart-cursor {
    stroke-dasharray: 3 4;
  }
  .wavefront {
    stroke: var(--blue);
    stroke-opacity: 0.24;
  }
  .wavefront.hitting,
  .receive-pulse {
    stroke: var(--green);
    stroke-opacity: 1;
    stroke-width: 2;
  }
  .scene-note {
    fill: var(--muted);
    font-size: 12px;
  }
  .svg-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .actor-label {
    font-size: 13px;
    font-weight: 600;
    fill: currentColor;
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 4px;
  }
  .source,
  .emission-row {
    color: var(--blue);
  }
  .observer,
  .reception-row {
    color: var(--green);
  }
  .object-body {
    fill: var(--surface);
    stroke: currentColor;
    stroke-width: 2;
  }
  .object-hit {
    fill: transparent;
  }
  .scrubbable {
    cursor: ew-resize;
    outline: none;
    touch-action: none;
  }
  .scrubbable:focus-visible .object-hit {
    stroke: currentColor;
    stroke-width: 2;
  }
  .glyph,
  .motion-arrow {
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readouts > div {
    padding: 8px 10px;
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
  .emitted output {
    color: var(--blue);
  }
  .received output {
    color: var(--green);
  }
  .timeline {
    display: grid;
    gap: 6px;
    padding: 8px 12px;
    flex-shrink: 0;
  }
  .time-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
    line-height: 18px;
  }
  .time-label small {
    color: var(--muted);
    font-size: 11px;
  }
  .moments {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
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
  .timing,
  .comparison {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    min-height: 0;
    padding: 12px;
  }
  .timing > p,
  .comparison > p {
    min-height: 35px;
  }
  .row-label {
    fill: currentColor;
    font-size: 13px;
    font-weight: 600;
  }
  .crest-tick {
    stroke: currentColor;
    stroke-width: 1.6;
  }
  .crest-tick.highlighted {
    stroke-width: 4;
  }
  .chart-cursor {
    stroke: var(--text);
  }
  .comparison-list {
    align-self: center;
    display: grid;
    gap: 8px;
  }
  .comparison-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 55px;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  .comparison-row[data-active] {
    border-color: var(--primary);
  }
  .comparison-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    grid-column: 1 / -1;
    gap: 6px;
    font-size: 12px;
  }
  .comparison-label output {
    color: var(--green);
  }
  .bar {
    position: relative;
    height: 8px;
    align-self: center;
    border-radius: var(--radius);
    background: var(--subtle);
  }
  .bar::before {
    content: "";
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 1px;
    left: 50%;
    background: var(--muted);
  }
  .bar span {
    position: absolute;
    inset-block: 0;
    background: var(--green);
    opacity: 0.8;
  }
  .relative {
    text-align: right;
    font-size: 11px;
    color: var(--muted);
  }
  .comp-scale {
    display: flex;
    justify-content: space-between;
    margin-right: 70px;
    padding-left: 7px;
    color: var(--muted);
    font: 10px/14px var(--mono);
  }
  .model-formula {
    min-height: 92px;
    padding: 12px;
    border-top: 1px solid var(--border);
  }
  .model-formula p {
    margin-top: 6px;
  }
  .model-formula phy-math {
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
