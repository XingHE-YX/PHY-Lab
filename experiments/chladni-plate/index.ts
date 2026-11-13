import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/protocols/v2";
import { ChladniExperiment } from "./experiment";
export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = "phy-chladni-" + context.buildId;
  if (!customElements.get(tag)) customElements.define(tag, ChladniExperiment);
  const element = document.createElement(tag) as ChladniExperiment;
  element.initialize(context);
  const pause = () => element.pause();
  context.signal.addEventListener("abort", pause, { once: true });
  return {
    element,
    update(next) {
      element.locale = next.locale;
      element.theme = next.theme;
    },
    pause,
    snapshot: () => element.snapshot(),
    dispose() {
      context.signal.removeEventListener("abort", pause);
      element.pause();
      element.remove();
    },
  };
}
