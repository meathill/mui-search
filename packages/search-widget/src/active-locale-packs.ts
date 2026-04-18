import { LOCALE_PACK_EN } from "./locale-packs/locale-en";
import type { LocaleTranslationPack } from "./locale-packs/types";

export const ACTIVE_LOCALE_PACKS: Record<string, LocaleTranslationPack> = {
  en: LOCALE_PACK_EN,
};

type LocaleChangeListener = () => void;
const listeners = new Set<LocaleChangeListener>();

export function registerLocale(code: string, pack: LocaleTranslationPack): void {
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    throw new Error("[search-widget] registerLocale 需要非空 locale code");
  }
  ACTIVE_LOCALE_PACKS[normalized] = pack;
  for (const listener of listeners) {
    listener();
  }
}

export function onLocaleChange(listener: LocaleChangeListener): () => void {
  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}
