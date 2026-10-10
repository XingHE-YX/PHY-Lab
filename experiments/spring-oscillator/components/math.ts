import { renderToString } from "katex";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { unsafeCSS } from "lit";
import stylesheet from "katex/dist/katex.min.css?inline";

export const mathStyles = unsafeCSS(stylesheet);
const formulas = new Map<string, string>();

// Only fixed, experiment-authored TeX is cached; live values stay in Lit text nodes.
export function math(source: string) {
  let markup = formulas.get(source);
  if (!markup) {
    markup = renderToString(source, {
      throwOnError: true,
      strict: "error",
      trust: false,
      output: "htmlAndMathml",
    });
    formulas.set(source, markup);
  }
  return unsafeHTML(markup);
}
