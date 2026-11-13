import type { FormControlElement } from "./form-control";
export interface InputElement extends FormControlElement {
  type: string;
  value: string;
  valueAsNumber: number;
  label: string;
  placeholder: string;
  readOnly: boolean;
  autocomplete: string;
  min: string;
  max: string;
  step: string;
  pattern: string;
  minLength: number;
  maxLength: number;
  select(): void;
  setSelectionRange(
    start: number | null,
    end: number | null,
    direction?: "forward" | "backward" | "none",
  ): void;
}
