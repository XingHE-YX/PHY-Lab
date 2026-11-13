import { LitElement, type PropertyDeclarations } from "lit";
/** Native controls keep keyboard semantics; ElementInternals connects their host to forms. */
export abstract class FormControl extends LitElement {
  static formAssociated = true;
  static properties: PropertyDeclarations = {
    name: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
  };
  declare name: string;
  declare disabled: boolean;
  declare required: boolean;
  protected readonly internals: ElementInternals;
  protected formDisabled = false;
  private initialValue: unknown;
  constructor() {
    super();
    this.name = "";
    this.disabled = false;
    this.required = false;
    this.internals = this.attachInternals();
  }
  protected get nativeControl():
    HTMLInputElement | HTMLSelectElement | undefined {
    return (
      this.renderRoot.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input, select",
      ) ?? undefined
    );
  }
  protected get effectiveDisabled() {
    return this.disabled || this.formDisabled;
  }
  protected abstract get currentValue(): unknown;
  protected abstract restoreValue(value: unknown): void;
  protected get submissionValue(): string | null {
    return this.nativeControl?.value ?? null;
  }
  protected firstUpdated() {
    this.initialValue = this.currentValue;
  }
  protected updated() {
    this.syncForm();
  }
  protected syncForm() {
    const control = this.nativeControl;
    if (!control) return;
    this.internals.setFormValue(
      this.effectiveDisabled ? null : this.submissionValue,
      JSON.stringify(this.currentValue),
    );
    if (this.effectiveDisabled || control.validity.valid)
      this.internals.setValidity({});
    else
      this.internals.setValidity(
        control.validity,
        control.validationMessage,
        control,
      );
  }
  protected emit(type: "input" | "change") {
    this.syncForm();
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }
  formDisabledCallback(disabled: boolean) {
    this.formDisabled = disabled;
    this.requestUpdate();
  }
  formResetCallback() {
    this.restoreValue(this.initialValue);
  }
  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === "string") {
      try {
        this.restoreValue(JSON.parse(state));
      } catch {
        /* Ignore an invalid browser restoration payload. */
      }
    }
  }
  get form() {
    return this.internals.form;
  }
  get labels() {
    return this.internals.labels;
  }
  get validity() {
    return this.internals.validity;
  }
  get validationMessage() {
    return this.internals.validationMessage;
  }
  get willValidate() {
    return this.internals.willValidate;
  }
  checkValidity() {
    this.syncForm();
    return this.internals.checkValidity();
  }
  reportValidity() {
    this.syncForm();
    return this.internals.reportValidity();
  }
  focus(options?: FocusOptions) {
    this.nativeControl?.focus(options);
  }
}
