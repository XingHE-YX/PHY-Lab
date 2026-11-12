import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/contract";
import { WaveExperiment } from "./experiment";
export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = "phy-waves-" + context.buildId;
  if (!customElements.get(tag)) customElements.define(tag, WaveExperiment);
  const element = document.createElement(tag) as WaveExperiment;
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
