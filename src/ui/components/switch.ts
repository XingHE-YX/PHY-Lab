import { css } from "lit";
import { PhyCheckbox } from "./checkbox";
export class PhySwitch extends PhyCheckbox {
  protected get controlRole() {
    return "switch";
  }
  static styles = [
    ...PhyCheckbox.styles,
    css`
      input {
        width: 32px;
        height: 18px;
        border-radius: var(--radius);
        background: var(--subtle);
        border-color: var(--border);
      }
      input::after,
      input:checked::after {
        content: "";
        position: absolute;
        left: 3px;
        top: 3px;
        width: 10px;
        height: 10px;
        border: 0;
        border-radius: 1px;
        background: var(--muted);
        transform: none;
        transition:
          transform 0.15s,
          background 0.15s;
      }
      input:checked {
        background: var(--primary-soft);
        border-color: var(--primary);
      }
      input:checked::after {
        transform: translateX(14px);
        background: var(--primary);
      }
      @media (prefers-reduced-motion: reduce) {
        input::after {
          transition: none;
        }
      }
    `,
  ];
}
customElements.define("phy-switch", PhySwitch);
