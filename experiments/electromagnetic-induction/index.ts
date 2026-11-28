import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/protocols/v2";
import { InductionExperiment } from "./experiment";

export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = `phy-electromagnetic-induction-${context.buildId}`;
  if (!customElements.get(tag)) customElements.define(tag, InductionExperiment);
  const element = document.createElement(tag) as InductionExperiment;
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
