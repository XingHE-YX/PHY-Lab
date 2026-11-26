import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/protocols/v2";
import { PendulumExperiment } from "./experiment";

export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = `phy-simple-pendulum-${context.buildId}`;
  if (!customElements.get(tag)) customElements.define(tag, PendulumExperiment);
  const element = document.createElement(tag) as PendulumExperiment;
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
