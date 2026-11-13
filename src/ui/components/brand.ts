import { css, html } from "lit";
import { base } from "../../infra/platform/registry";
export const brandStyles = css`
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: var(--brand-font-size, 17px);
    font-weight: 650;
    letter-spacing: -0.6px;
    white-space: nowrap;
  }
  .brand-wordmark {
    color: var(--text);
  }
  .brand-wordmark span {
    color: var(--primary);
  }
  .brand-logo {
    width: var(--brand-logo-size, 44px);
    height: var(--brand-logo-size, 44px);
  }
`;
export function brand(withLogo = false) {
  return html`<span class="brand"
    >${withLogo ? html`<img class="brand-logo" src=${base + "favicon.svg"} alt="" />` : ""}<span
      class="brand-wordmark"
      >PHY<span> Lab</span></span
    ></span
  >`;
}
