import type { FormControlElement } from "./form-control";
export interface SliderElement extends FormControlElement {
  value: number;
  valueAsNumber: number;
  min: number;
  max: number;
  step: number;
  label: string;
  valueText: string;
}
