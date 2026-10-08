import type { ExperimentContext, ExperimentInstance } from '../../src/infra/platform/contract';
import {SpringExperiment} from './experiment';
export async function mount(context: ExperimentContext): Promise<ExperimentInstance> {
  const tag='phy-spring-'+context.buildId;
  if(!customElements.get(tag))customElements.define(tag,SpringExperiment);
  const element=document.createElement(tag) as SpringExperiment;
  element.initialize(context);
  return {element,update(next){element.locale=next.locale;},pause(){element.pause();},snapshot(){return element.snapshot();},dispose(){element.pause();element.remove();}};
}
