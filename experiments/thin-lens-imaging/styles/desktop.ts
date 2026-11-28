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
    --center-ray: light-dark(#96602f, #e5a972);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  h1,
  h2,
  h3,
  p,
  dl,
  dd {
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
  output,
  dd {
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
    grid-template-columns: 220px minmax(0, 1fr) 348px;
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
  .panel-heading phy-checkbox {
    margin-left: auto;
    color: var(--muted);
    font-size: 11px;
    white-space: nowrap;
  }
  .regime {
    font-size: 11px;
    color: var(--primary);
  }
  .parameters,
  .presets,
  .footer {
    display: grid;
    gap: 9px;
    padding: 12px;
  }
  .presets {
    border-top: 1px solid var(--border);
  }
  .presets h3 {
    color: var(--muted);
  }
  .footer {
    margin-top: auto;
  }
  .parameter {
    display: grid;
    gap: 4px;
    font-size: 12px;
  }
  .parameter-label,
  .limits,
  .object-height {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .object-height {
    color: var(--muted);
    font-size: 12px;
  }
  .scene-wrap {
    flex: 1;
    display: grid;
    min-height: 0;
    grid-template-rows: minmax(0, 1fr);
    padding: 8px;
    background: var(--bg);
  }
  .ray-scene {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .optical-board {
    fill: var(--surface);
    stroke: var(--border);
  }
  .optical-axis,
  .grid-line,
  .lens-plane,
  .incident,
  .outgoing,
  .direction,
  .backward,
  .object-arrow,
  .image-arrow {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .optical-axis {
    stroke: var(--muted);
  }
  .grid-line {
    stroke: var(--border);
    stroke-opacity: 0.6;
  }
  .lens-plane {
    stroke: var(--blue);
    stroke-dasharray: 3 3;
    stroke-opacity: 0.55;
  }
  .glass-edge {
    stop-color: var(--primary-soft);
  }
  .glass-light {
    stop-color: var(--surface);
  }
  .lens-glass {
    fill: url(#lens-glass);
    stroke: var(--blue);
    stroke-opacity: 0.7;
    stroke-width: 1.2;
  }
  .scene-note {
    fill: var(--muted);
    font-size: 12px;
  }
  .axis-label,
  .focus-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .focus-dot {
    fill: var(--blue);
    stroke: var(--surface);
    stroke-width: 1;
  }
  .parallel {
    color: var(--blue);
  }
  .center {
    color: var(--center-ray);
  }
  .frontFocus {
    color: var(--green);
  }
  .incident,
  .outgoing,
  .direction {
    stroke: currentColor;
    stroke-width: 1.45;
    stroke-linejoin: round;
  }
  .direction {
    stroke-linecap: round;
  }
  .backward {
    stroke: currentColor;
    stroke-width: 1.3;
    stroke-dasharray: 4 4;
    opacity: 0.76;
  }
  .object {
    cursor: ew-resize;
    touch-action: none;
    outline: none;
  }
  .object-hit {
    fill: transparent;
    stroke: transparent;
  }
  .object:focus-visible .object-hit {
    stroke: var(--primary);
    stroke-width: 2;
  }
  .object-arrow {
    stroke: var(--text);
    stroke-width: 2.4;
    stroke-linecap: round;
    pointer-events: none;
  }
  .image-arrow {
    stroke: var(--red);
    stroke-width: 2.3;
    stroke-linecap: round;
  }
  .image.virtual .image-arrow {
    stroke-dasharray: 4 2;
  }
  .object-label {
    fill: var(--text);
    stroke: var(--surface);
    paint-order: stroke;
    stroke-width: 3px;
    font-size: 12px;
    pointer-events: none;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 8px 14px;
    padding: 8px 12px 0;
    border-top: 1px solid var(--border);
    font-size: 11px;
    line-height: 16px;
  }
  .legend span::before {
    content: "";
    display: inline-block;
    width: 12px;
    border-top: 2px solid;
    margin: 0 4px 3px 0;
  }
  .legend .absent {
    opacity: 0.55;
  }
  .notice {
    min-height: 42px;
    padding: 6px 12px;
    line-height: 16px;
  }
  .notice[data-offscreen="true"] {
    color: var(--text);
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    flex-shrink: 0;
    border-top: 1px solid var(--border);
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
    font-size: 15px;
    line-height: 24px;
  }
  .distance output,
  .magnification output {
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
  .detail-card,
  .comparison-panel {
    align-self: center;
    margin: 12px;
    min-height: 0;
  }
  .detail-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
  }
  .detail-card h3 {
    color: var(--primary);
    font-size: 14px;
    margin-bottom: 12px;
  }
  .detail-card dl {
    display: grid;
    gap: 8px;
  }
  .detail-card dl > div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 6px 0;
    border-top: 1px solid var(--border);
  }
  .detail-card dt {
    color: var(--muted);
    font-size: 12px;
  }
  .comparison {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 12px;
  }
  .comparison th,
  .comparison td {
    text-align: right;
    padding: 8px 4px;
    border-bottom: 1px solid var(--border);
  }
  .comparison th:first-child {
    width: 49%;
    text-align: left;
  }
  .comparison thead th,
  .comparison small {
    color: var(--muted);
  }
  .comparison small {
    display: block;
    font-size: 10px;
    font-weight: 400;
    line-height: 16px;
  }
  .comparison td {
    font: 12px var(--mono);
  }
  .comparison tr[data-current] {
    background: var(--subtle);
  }
  .comparison-panel p {
    margin-top: 10px;
  }
  .model-formula {
    min-height: 107px;
    padding: 12px;
    border-top: 1px solid var(--border);
  }
  .model-formula p {
    margin-top: 6px;
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
