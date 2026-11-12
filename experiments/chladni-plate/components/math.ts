import { renderToString } from "katex";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { unsafeCSS } from "lit";
import stylesheet from "katex/dist/katex.min.css?inline";
export const mathStyles = unsafeCSS(stylesheet);
const formulas = new Map<string, string>();
export function math(source: string) {
  if (!formulas.has(source))
    formulas.set(
      source,
      renderToString(source, {
        throwOnError: true,
        strict: "error",
        trust: false,
        output: "htmlAndMathml",
      }),
    );
  return unsafeHTML(formulas.get(source)!);
}
