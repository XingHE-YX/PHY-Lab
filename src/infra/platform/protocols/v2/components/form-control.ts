export interface FormControlElement extends HTMLElement {
  name: string;
  disabled: boolean;
  required: boolean;
  readonly form: HTMLFormElement | null;
  readonly labels: NodeList;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;
  focus(options?: FocusOptions): void;
}
