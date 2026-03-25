import type { LocaleTranslationPack } from "./types";

export const LOCALE_PACK_PL: LocaleTranslationPack = {
  placeholder: "Wpisz, aby wyszukać...",
  statusInit: "Wpisz słowo kluczowe, aby rozpocząć wyszukiwanie.",
  statusError: "Nieznany błąd",
  statusSuggestNeedKeyword: "Wpisz słowo kluczowe przed testem autouzupełniania.",
  statusSearchNeedKeyword: "Wpisz słowo kluczowe przed wyszukiwaniem.",
  statusSearching: "Wyszukiwanie...",
  statusTrackNeedSearch: "Najpierw wyszukaj, a potem zarejestruj kliknięcie.",
  statusHotRefreshedTemplate: "Popularne treści odświeżone, zwrócono {count} rekordów.",
  statusSuggestRefreshedTemplate: "Autouzupełnianie zakończone, zwrócono {count} sugestii.",
  statusSearchRefreshedTemplate: "Wyszukiwanie zakończone, zwrócono {count} wyników.",
  statusClickRecordedTemplate:
    "Zarejestrowano kliknięcie: {title}. Lista trendów będzie aktualizowana co pełną godzinę.",
  hotContentsTitleTemplate: "Popularne (ostatnie {hours} godzin)",
  hotContentHitCountTemplate: "{count} odsłon",
  refreshLoading: "Odświeżanie",
  refreshNormal: "Odśwież",
  clearQuery: "Wyczyść",
  emptyHotContents: "Brak popularnych treści (agregacja co godzinę)",
  suggestTitle: "Czy chodziło Ci o...",
  emptySuggestions: "Brak sugestii",
  searchTitle: "Wyniki wyszukiwania",
  emptySearchResults: "Brak wyników wyszukiwania",
};
