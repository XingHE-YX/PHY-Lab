import type { Locale, LocalizedValue } from "../platform/types";

export const locales: readonly Locale[] = ["zh-CN", "en", "ja"];

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}

export function localize<T>(value: LocalizedValue<T>, locale: Locale): T {
  return value[locale] ?? value.en;
}
