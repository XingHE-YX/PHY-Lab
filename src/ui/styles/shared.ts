import { css } from 'lit';
export const baseStyles = css`
  :host{font-family:var(--font);color:var(--text);box-sizing:border-box}*,*::before,*::after{box-sizing:border-box}
  button,input,select{font:inherit}button,a,input,select{outline-offset:3px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--primary)}
  button{color:inherit;cursor:pointer}button:disabled{cursor:default;opacity:.45}a{color:inherit;text-decoration:none}
  .muted{color:var(--muted)}.mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
`;
export const buttonStyles = css`
  button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:7px 13px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);font-size:13px;line-height:1.3;transition:background .15s}
  button:hover:not(:disabled){background:var(--subtle)}button.primary{background:var(--primary);color:var(--surface);border-color:var(--primary)}
`;
