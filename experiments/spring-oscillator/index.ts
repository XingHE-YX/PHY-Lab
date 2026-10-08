import type { ExperimentContext, ExperimentInstance } from '../../src/infra/platform/contract';
export async function mount(context: ExperimentContext): Promise<ExperimentInstance> {
  const element = document.createElement('div');
  element.textContent = context.locale === 'zh-CN' ? '弹簧振子实验' : 'Spring oscillator';
  return {element, update() {}, pause() {}, snapshot() { return {}; }, dispose() { element.remove(); }};
}
