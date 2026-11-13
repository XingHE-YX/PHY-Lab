import type { FormControlElement } from "./form-control";
export interface CheckboxElement extends FormControlElement {
  checked: boolean;
  indeterminate: boolean;
  value: string;
  label: string;
}
