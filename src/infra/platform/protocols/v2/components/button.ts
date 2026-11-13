export interface ButtonElement extends HTMLElement {
  variant: string;
  disabled: boolean;
  label: string;
  focus(options?: FocusOptions): void;
}
