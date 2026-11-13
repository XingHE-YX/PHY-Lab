import type { ExperimentContext } from "./context";
export interface ExperimentInstance {
  element: HTMLElement;
  update(context: Pick<ExperimentContext, "locale" | "theme">): void;
  pause(): void;
  snapshot(): unknown;
  dispose(): void;
}
export interface ExperimentModule {
  mount(context: ExperimentContext): Promise<ExperimentInstance>;
}
