import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/protocols/v2";
import { SingleSlitExperiment } from "./experiment";

export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = `phy-single-slit-diffraction-${context.buildId}`;
  if (!customElements.get(tag))
    customElements.define(tag, SingleSlitExperiment);
  const element = document.createElement(tag) as SingleSlitExperiment;
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
