import { PhyDialog } from "../ui/components/dialog";
import { dialogWidth } from "../ui/components/dialog-width";
import type {
  DialogApi,
  DialogOptions,
  DialogHandle,
  DialogResult,
} from "../infra/platform/protocols/v2/api/dialog";
function activeElement(): HTMLElement | undefined {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement)
    element = element.shadowRoot.activeElement;
  return element instanceof HTMLElement ? element : undefined;
}
function validate(options: DialogOptions) {
  if (typeof options.title !== "string" || !options.title.trim())
    throw new TypeError("Dialog title is required");
  if (
    !(options.content instanceof HTMLElement) ||
    (options.footer !== undefined && !(options.footer instanceof HTMLElement))
  )
    throw new TypeError("Dialog content and footer must be HTMLElements");
  dialogWidth(options.width);
}
function open(options: DialogOptions, signal?: AbortSignal): DialogHandle {
  if (signal?.aborted)
    throw new DOMException("The experiment has exited", "AbortError");
  validate(options);
  const element = document.createElement("phy-dialog") as PhyDialog;
  element.options = { ...options };
  const returnFocus = options.returnFocus ?? activeElement();
  let settled = false;
  let resolve!: (result: DialogResult) => void;
  const closed = new Promise<DialogResult>((done) => {
    resolve = done;
  });
  const localize = () => {
    element.closeLabel =
      document.documentElement.lang === "zh-CN" ? "关闭" : "Close";
  };
  const observer = new MutationObserver(localize);
  const finish = (reason: DialogResult["reason"], value?: string) => {
    if (settled) return;
    settled = true;
    signal?.removeEventListener("abort", abort);
    observer.disconnect();
    element.nativeDialog?.close();
    element.remove();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    resolve({ reason, ...(value === undefined ? {} : { value }) });
  };
  const abort = () => finish("abort");
  element.addEventListener("dialog-dismiss", (event) =>
    finish((event as CustomEvent<DialogResult["reason"]>).detail),
  );
  signal?.addEventListener("abort", abort, { once: true });
  localize();
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang"],
  });
  document.body.append(element);
  void element.updateComplete.then(() => {
    if (!settled) element.show(options.initialFocus);
  });
  return {
    closed,
    update(patch) {
      if (settled) return;
      const next = { ...element.options, ...patch };
      validate(next);
      element.options = next;
    },
    close(value) {
      finish("close", value);
    },
  };
}
export const dialogs = {
  open(options: DialogOptions): DialogHandle {
    return open(options);
  },
  scope(signal: AbortSignal): DialogApi {
    return { open: (options) => open(options, signal) };
  },
};
