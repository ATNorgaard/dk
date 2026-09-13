/** Bilingual copy as stored in the database: {"da": "...", "en": "..."}. */
export type Lang = "da" | "en";

export type I18nText = Record<Lang, string>;
export type I18nList = Record<Lang, string[]>;

export const LANGS: readonly Lang[] = ["da", "en"] as const;
export const DEFAULT_LANG: Lang = "da";

export function isLang(value: string | undefined | null): value is Lang {
  return value === "da" || value === "en";
}

export function otherLang(lang: Lang): Lang {
  return lang === "da" ? "en" : "da";
}

/** Pick one language from a bilingual value, falling back to Danish. */
export function t<T>(
  value: Record<Lang, T> | null | undefined,
  lang: Lang,
  fallback: T,
): T {
  if (!value) return fallback;
  return value[lang] ?? value[DEFAULT_LANG] ?? fallback;
}

/** Build a path under the language prefix: href("da", "/domaener/ai-it"). */
export function href(lang: Lang, path = "") {
  const clean = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `/${lang}${clean}`;
}

/** Swap the language prefix on a current pathname. */
export function switchLangPath(pathname: string, to: Lang) {
  const parts = pathname.split("/");
  if (isLang(parts[1])) parts[1] = to;
  else parts.splice(1, 0, to);
  return parts.join("/") || `/${to}`;
}

export const htmlLang: Record<Lang, string> = { da: "da-DK", en: "en-GB" };
