import type { FormControlElement } from "./form-control";
export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface RadioGroupElement extends FormControlElement {
  value: string;
  options: readonly RadioOption[];
  label: string;
  variant: string;
}
