export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface TabsElement extends HTMLElement {
  value: string;
  items: readonly TabItem[];
  label: string;
  variant: string;
}
