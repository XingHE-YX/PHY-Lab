import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/contract";
import { LCExperiment } from "./experiment";
export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = "phy-lc-" + context.buildId;
  if (!customElements.get(tag)) customElements.define(tag, LCExperiment);
  const element = document.createElement(tag) as LCExperiment;
  element.initialize(context);
  const pause = () => element.pause();
  context.signal.addEventListener("abort", pause, { once: true });
  return {
    element,
    update(next) {
      element.locale = next.locale;
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
