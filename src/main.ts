import { html, LitElement } from 'lit';
class App extends LitElement {
  render() { return html`<h1>PHY Lab</h1><p>Interactive physics · ${__APP_VERSION__}</p>`; }
}
customElements.define('phy-app', App);
