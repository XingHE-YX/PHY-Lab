import { css } from "lit";

export const styles = css`
  :host {
    display: grid;
    grid-template-rows: 38px minmax(0, 1fr);
    gap: 10px;
    height: 100%;
    min-height: 650px;
    color: var(--text);
    font-family: var(--font);
    --screen-base: #10141b;
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
    font-weight: 550;
    letter-spacing: -0.3px;
  }
  h2,
  h3 {
    font-size: 13px;
    font-weight: 550;
  }
  p {
    color: var(--muted);
    font-size: 11.5px;
    line-height: 1.55;
  }
  output,
  dd {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .heading {
    display: flex;
    align-items: baseline;
    align-self: center;
    gap: 12px;
  }
  .heading span {
    color: var(--muted);
    font-size: 12px;
  }
  .lab {
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr) 350px;
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
    min-height: 42px;
    padding: 0 13px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .parameters,
  .reference-controls,
  .tools {
    display: grid;
    gap: 10px;
    padding: 12px 13px;
  }
  .parameters {
    gap: 14px;
  }
  .reference-controls,
  .tools {
    border-top: 1px solid var(--border);
  }
  .tools {
    margin-top: auto;
  }
  .parameter,
  .probe-controls {
    display: grid;
    gap: 5px;
  }
  .control-label,
  .limits {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    font-size: 12px;
  }
  .limits {
    color: var(--muted);
    font: 10.5px/14px var(--mono);
  }
  .shortcuts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }
  .screen-content,
  .chart-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 10px 12px;
    gap: 6px;
  }
  .screen-content {
    background: var(--bg);
  }
  .screen-content > p {
    text-align: center;
  }
  .screen-frame,
  .chart-frame {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr);
  }
  .fringe-screen,
  .intensity-chart {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    user-select: none;
  }
  .screen-base {
    fill: var(--screen-base);
  }
  .strip-label {
    fill: var(--text);
    font-size: 14px;
    font-weight: 550;
  }
  .axis-label {
    fill: var(--muted);
    font: 11px var(--mono);
  }
  .fringe-screen .axis-label {
    font-size: 12px;
  }
  .axis,
  .grid-line,
  .probe-light,
  .chart-probe,
  .minima-on-screen,
  .width-bracket,
  .trace {
    fill: none;
    vector-effect: non-scaling-stroke;
  }
  .axis {
    stroke: var(--muted);
  }
  .grid-line {
    stroke: var(--border);
  }
  .minima-on-screen {
    stroke: #d6dbe5;
    stroke-dasharray: 3 2;
  }
  .width-bracket,
  .trace.current {
    stroke: var(--primary);
  }
  .reference .width-bracket,
  .trace.reference {
    stroke: var(--muted);
    stroke-dasharray: 4 3;
  }
  .trace {
    stroke-width: 1.8;
    stroke-linejoin: round;
  }
  .central-region {
    fill: var(--primary-soft);
  }
  .probe-light {
    stroke: #f0f3f8;
    stroke-dasharray: 3 3;
  }
  .probe-indicator {
    fill: var(--text);
  }
  .chart-probe {
    stroke: var(--muted);
    stroke-dasharray: 2 3;
  }
  .reading.current {
    fill: var(--primary);
  }
  .reading.reference {
    fill: var(--surface);
    stroke: var(--muted);
    stroke-width: 1.5;
  }
  .position-hit {
    fill: transparent;
    cursor: ew-resize;
    touch-action: none;
  }
  .probe-controls {
    border-top: 1px solid var(--border);
    padding: 9px 12px;
    flex-shrink: 0;
  }
  .probe-controls .shortcuts {
    margin-top: 3px;
  }
  .readouts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .readouts > div {
    display: grid;
    gap: 3px;
    padding: 9px 12px;
  }
  .readouts > div + div {
    border-left: 1px solid var(--border);
  }
  .readouts span,
  dt,
  .legend {
    color: var(--muted);
    font-size: 11px;
  }
  .readouts output {
    font-size: 18px;
  }
  .readouts div:first-child output,
  .widths dl > div:first-child dd {
    color: var(--primary);
  }
  .legend {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
  }
  .legend span::before {
    content: "";
    display: inline-block;
    width: 16px;
    border-top: 2px solid var(--primary);
    margin: 0 5px 3px 0;
  }
  .legend .reference::before {
    border-top: 2px dashed var(--muted);
  }
  .widths,
  .formula {
    padding: 11px 13px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .widths dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 10px 0 7px;
  }
  .widths dl > div {
    display: grid;
    gap: 4px;
  }
  dd {
    font-size: 14px;
  }
  .formula {
    background: var(--bg);
  }
  .formula phy-math {
    display: block;
    font-size: 14px;
  }
  .formula phy-math::part(formula) {
    padding-bottom: 4px;
  }
  .formula p {
    margin-top: 6px;
  }
  @media (max-height: 760px) {
    :host {
      min-height: 580px;
    }
    .parameters,
    .reference-controls,
    .tools {
      gap: 8px;
      padding-block: 10px;
    }
    .widths,
    .formula {
      padding-block: 9px;
    }
  }
`;
