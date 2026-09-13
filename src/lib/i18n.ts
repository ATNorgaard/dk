/** Bilingual copy as stored in the database: {"da": "...", "en": "..."}. */
export type Lang = "da" | "en";

export type I18nText = Record<Lang, string>;
export type I18nList = Record<Lang, string[]>;

export const LANGS: readonly Lang[] = ["da", "en"] as const;
export const DEFAULT_LANG: Lang = "da";

export function t<T>(value: Record<Lang, T> | null | undefined, lang: Lang, fallback: T): T {
  if (!value) return fallback;
  return value[lang] ?? value[DEFAULT_LANG] ?? fallback;
}
