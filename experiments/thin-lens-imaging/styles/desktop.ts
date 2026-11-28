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
    --center-ray: light-dark(#96602f, #e5a972);
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font: inherit;
    min-height: 36px;
    border: 1px solid var(--border);
    border-radius: 3px;
    padding: 5px 6px;
    color: var(--text);
    background: var(--surface);
    font-size: 11px;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s,
      color 0.15s;
  }
  button:hover:not(:disabled) {
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
    outline-offset: 2px;
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
    font-weight: 550;
    white-space: nowrap;
    letter-spacing: -0.5px;
  }
  h2,
  h3 {
    font-size: 12px;
    font-weight: 550;
  }
  p {
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }
  small {
    color: var(--muted);
  }
  .mono,
  output,
  dd {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
    min-width: 0;
  }
  .subtitle,
  .model-note {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
  }
  .lab {
    display: grid;
    grid-template-columns: 224px minmax(420px, 1fr) 350px;
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
    justify-content: space-between;
    gap: 8px;
    min-height: 41px;
    padding: 0 13px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    white-space: nowrap;
  }
  .status {
    font-size: 10.5px;
    color: var(--muted);
  }
  .regime {
    font-size: 10.5px;
    font-weight: 500;
    color: var(--primary);
  }
  .regime.virtual {
    color: var(--green);
  }
  .regime.afocal {
    color: var(--muted);
  }
  .parameters {
    display: grid;
    gap: 11px;
    padding: 11px 13px;
  }
  .parameter {
    display: grid;
    gap: 4px;
    font-size: 12px;
  }
  .parameter-label,
  .limits {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 4px;
  }
  .parameter-label output {
    font-size: 11.5px;
  }
  .limits {
    color: var(--muted);
    font: 10px/13px var(--mono);
  }
  .derived-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 2px 13px 0;
    padding: 10px 0;
    border-top: 1px solid var(--border);
  }
  .derived-metrics > div {
    font-size: 10px;
    line-height: 14px;
    min-width: 0;
  }
  .derived-metrics span {
    display: block;
    color: var(--muted);
    margin-bottom: 2px;
  }
  .derived-metrics output {
    font-size: 11.5px;
    color: var(--text);
  }
  .parameter-footer {
    display: grid;
    gap: 6px;
    margin-top: auto;
    padding: 10px 13px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .parameter-footer phy-button {
    display: block;
  }
  .parameter-footer small {
    font-size: 10px;
    line-height: 1.45;
  }
  .scene-wrap {
    position: relative;
    flex: 1;
    display: grid;
    min-height: 180px;
    grid-template-rows: minmax(0, 1fr);
    padding: 6px 8px;
    background: radial-gradient(
      circle at 50% 48%,
      var(--surface) 0%,
      var(--bg) 78%
    );
  }
  .notice {
    position: absolute;
    top: 8px;
    right: 12px;
    max-width: 56%;
    text-align: right;
    font-size: 10.5px;
    line-height: 15px;
    color: var(--muted);
    pointer-events: none;
  }
  .notice[data-offscreen="true"],
  .notice[data-alert="true"] {
    color: var(--text);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 3px 8px;
  }
  .ray-scene,
  .curve-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .optical-board {
    fill: transparent;
    stroke: var(--border);
    stroke-opacity: 0.7;
  }
  .optical-axis,
  .grid-line,
  .lens-plane,
  .incident,
  .outgoing,
  .direction,
  .backward,
  .object-arrow,
  .image-arrow,
  .ruler-line,
  .ruler-tick,
  .plot-grid,
  .plot-axis,
  .asymptote,
  .curve-trace,
  .curve-cursor {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .optical-axis,
  .plot-axis {
    stroke: var(--muted);
  }
  .grid-line,
  .plot-grid {
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
    stroke-opacity: 0.72;
    stroke-width: 1.25;
  }
  .scene-note {
    fill: var(--muted);
    font-size: 11px;
  }
  .axis-label,
  .focus-label {
    fill: var(--muted);
    font: 10.5px var(--mono);
  }
  .focus-label.secondary {
    opacity: 0.78;
  }
  .focus-dot {
    fill: var(--blue);
    stroke: var(--surface);
    stroke-width: 1.2;
  }
  .double-focus-dot {
    fill: var(--surface);
    stroke: var(--blue);
    stroke-width: 1.4;
  }
  .ruler-line,
  .ruler-tick {
    stroke: var(--muted);
    stroke-opacity: 0.75;
    stroke-width: 1.1;
  }
  .image-ruler .ruler-line,
  .image-ruler .ruler-tick {
    stroke: var(--blue);
    stroke-opacity: 0.72;
  }
  .ruler-label {
    fill: var(--muted);
    font: 10px var(--mono);
    paint-order: stroke;
    stroke: var(--surface);
    stroke-width: 3.5px;
  }
  .image-ruler .ruler-label {
    fill: var(--blue);
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
    stroke-width: 1.5;
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
  .object-grip {
    fill: var(--surface);
    stroke: var(--text);
    stroke-width: 1.6;
  }
  .object:hover .object-grip {
    fill: var(--primary);
    stroke: var(--primary);
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
    stroke-width: 3.5px;
    font-size: 11.5px;
    font-weight: 550;
    pointer-events: none;
  }
  .layer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface);
    font-size: 11px;
    color: var(--muted);
    flex-shrink: 0;
  }
  .layer-switches {
    display: flex;
    align-items: center;
    gap: 11px;
    white-space: nowrap;
  }
  .legend {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10px;
    line-height: 14px;
    white-space: nowrap;
  }
  .legend span::before {
    content: "";
    display: inline-block;
    width: 11px;
    border-top: 2px solid;
    margin: 0 4px 3px 0;
  }
  .legend .absent {
    opacity: 0.45;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    flex-shrink: 0;
    border-top: 1px solid var(--border);
  }
  .readouts > div {
    padding: 8px 10px;
    min-width: 0;
  }
  .readouts > div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span {
    display: block;
    font-size: 10px;
    line-height: 14px;
    color: var(--muted);
    margin-bottom: 3px;
  }
  .readouts output {
    display: block;
    font-size: 16.5px;
    line-height: 22px;
    font-weight: 500;
  }
  .distance output,
  .magnification output {
    color: var(--blue);
  }
  .shortcuts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .shortcuts button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 5px 4px;
    line-height: 1.25;
  }
  .shortcuts button small {
    font: 10px var(--mono);
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
  .exploring .observation-tabs {
    flex: 0 0 auto;
  }
  .observation {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .reading-panel,
  .comparison-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 10px 12px;
    gap: 8px;
  }
  .detail-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 10px;
    flex-shrink: 0;
  }
  .detail-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 7px;
  }
  .detail-head h3 {
    color: var(--primary);
    font-size: 12px;
  }
  .detail-head h3[data-kind="virtual"] {
    color: var(--green);
  }
  .detail-head h3[data-kind="afocal"] {
    color: var(--muted);
  }
  .detail-head span {
    font-size: 10.5px;
    color: var(--muted);
  }
  .detail-card dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    border-top: 1px solid var(--border);
    padding-top: 6px;
  }
  .detail-card dl > div {
    min-width: 0;
  }
  .detail-card dt {
    color: var(--muted);
    font-size: 10px;
    line-height: 14px;
  }
  .detail-card dd {
    font-size: 11.5px;
    line-height: 17px;
  }
  .curve-wrap {
    flex: 1;
    min-height: 152px;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .curve-chart {
    cursor: ew-resize;
    touch-action: none;
  }
  .asymptote {
    stroke: var(--muted);
    stroke-dasharray: 3 4;
    stroke-opacity: 0.7;
  }
  .asymptote-label {
    fill: var(--muted);
    font: 10px var(--mono);
  }
  .curve-trace {
    stroke: var(--blue);
    stroke-width: 2;
  }
  .curve-trace.virtual {
    stroke-dasharray: 4 3;
    stroke-opacity: 0.85;
  }
  .curve-cursor {
    stroke: var(--text);
    stroke-dasharray: 2 3;
    stroke-opacity: 0.55;
  }
  .curve-point {
    fill: var(--blue);
    stroke: var(--surface);
    stroke-width: 1.5;
  }
  .curve-point.virtual {
    fill: var(--green);
  }
  .curve-point.off {
    fill: var(--surface);
    stroke: var(--muted);
    stroke-width: 1.5;
  }
  .comparison {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 11.5px;
    margin-block: auto;
  }
  .comparison th,
  .comparison td {
    text-align: right;
    padding: 8px 6px;
    border-bottom: 1px solid var(--border);
  }
  .comparison th:first-child {
    width: 48%;
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
    line-height: 15px;
  }
  .comparison td {
    font: 11.5px var(--mono);
  }
  .clickable-row {
    cursor: pointer;
    transition: background 0.15s;
  }
  .clickable-row:hover {
    background: var(--subtle);
  }
  .comparison tr[data-current] {
    background: var(--primary-soft);
  }
  .panel-hint {
    flex-shrink: 0;
  }
  .support {
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .exploring .support {
    flex: 1;
    min-height: 0;
  }
  .exploring .support::part(panel) {
    display: flex;
    flex-direction: column;
  }
  .exploring .support-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }
  .support-tabs {
    --tab-height: 30px;
    --tab-font-size: 11px;
    --tab-flex: 0 0 auto;
    --tab-gap: 5px;
    --tab-padding: 4px 10px;
  }
  .support-tabs::part(tabs) {
    padding: 8px 12px 0;
  }
  .model-formula {
    padding: 9px 12px 11px;
  }
  .model-formula p {
    margin-top: 6px;
  }
  .model-formula phy-math {
    display: block;
    font-size: 13.5px;
  }
  .model-formula phy-math::part(formula) {
    padding-bottom: 6px;
  }
  .explore-content {
    padding: 10px 12px;
  }
  .explore-hint {
    margin-bottom: 10px;
  }
  .scenario-grid {
    display: grid;
    gap: 9px;
  }
  .scenario-card {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 9px 11px;
  }
  .scenario-card h3 {
    font-size: 12px;
    margin-bottom: 5px;
  }
  .scenario-card p {
    margin-bottom: 8px;
    line-height: 1.55;
  }
  .scenario-card button {
    min-height: 28px;
    padding: 4px 10px;
    font-size: 11px;
  }
  @media (max-height: 760px) {
    .parameters {
      gap: 8px;
      padding: 9px 13px;
    }
    .derived-metrics {
      padding: 8px 0;
      gap: 6px 8px;
    }
    .parameter-footer {
      padding: 8px 13px;
      gap: 5px;
    }
    .readouts > div {
      padding: 6px 9px;
    }
    .readouts output {
      font-size: 15px;
      line-height: 20px;
    }
    .shortcuts {
      padding: 6px 10px;
    }
    .shortcuts button {
      min-height: 32px;
      padding: 3px 4px;
    }
    .reading-panel,
    .comparison-panel {
      padding: 8px 11px;
      gap: 6px;
    }
    .detail-card {
      padding: 6px 9px;
    }
    .model-formula {
      padding: 7px 12px 9px;
    }
  }
  @media (max-height: 690px) {
    :host {
      height: auto;
      min-height: 590px;
      grid-template-rows: 38px minmax(540px, 1fr);
    }
  }
`;
