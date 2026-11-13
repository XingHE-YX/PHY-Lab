export type DialogWidth = "sm" | "md" | "lg" | "xl" | "full" | number;
export interface DialogOptions {
  title: string;
  content: HTMLElement;
  footer?: HTMLElement;
  width?: DialogWidth;
  closeOnBackdrop?: boolean;
  initialFocus?: HTMLElement;
  returnFocus?: HTMLElement;
}
export interface DialogResult {
  reason: "close" | "escape" | "backdrop" | "abort";
  value?: string;
}
export type DialogUpdate = Partial<
  Pick<
    DialogOptions,
    "title" | "content" | "footer" | "width" | "closeOnBackdrop"
  >
>;
export interface DialogHandle {
  update(options: DialogUpdate): void;
  close(value?: string): void;
  readonly closed: Promise<DialogResult>;
}
export interface DialogApi {
  open(options: DialogOptions): DialogHandle;
}
