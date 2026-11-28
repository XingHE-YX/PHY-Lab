import type {
  ExperimentContext,
  ExperimentInstance,
} from "../../src/infra/platform/protocols/v2";
import { ThinLensExperiment } from "./experiment";

export async function mount(
  context: ExperimentContext,
): Promise<ExperimentInstance> {
  const tag = `phy-thin-lens-imaging-${context.buildId}`;
  if (!customElements.get(tag)) customElements.define(tag, ThinLensExperiment);
  const element = document.createElement(tag) as ThinLensExperiment;
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
