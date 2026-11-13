import type { FormControlElement } from "./form-control";
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectElement extends FormControlElement {
  value: string;
  label: string;
  options: readonly SelectOption[];
}
