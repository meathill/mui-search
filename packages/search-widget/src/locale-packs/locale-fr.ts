import type { LocaleTranslationPack } from "./types";

export const LOCALE_PACK_FR: LocaleTranslationPack = {
  placeholder: "Tapez pour rechercher...",
  statusInit: "Veuillez saisir un mot-clé pour lancer la recherche.",
  statusError: "Erreur inconnue",
  statusSuggestNeedKeyword: "Veuillez saisir un mot-clé avant de tester l’autocomplétion.",
  statusSearchNeedKeyword: "Veuillez saisir un mot-clé avant de rechercher.",
  statusSearching: "Recherche en cours...",
  statusTrackNeedSearch: "Veuillez d’abord effectuer une recherche avant d’enregistrer un clic.",
  statusHotRefreshedTemplate: "Contenu tendance actualisé, {count} enregistrements renvoyés.",
  statusSuggestRefreshedTemplate: "Autocomplétion terminée, {count} suggestions renvoyées.",
  statusSearchRefreshedTemplate: "Recherche terminée, {count} résultats renvoyés.",
  statusClickRecordedTemplate:
    "Clic enregistré : {title}. La liste des tendances sera mise à jour au début de chaque heure.",
  hotContentsTitleTemplate: "Tendances (dernières {hours} heures)",
  hotContentHitCountTemplate: "{count} vues",
  refreshLoading: "Actualisation...",
  refreshNormal: "Actualiser",
  clearQuery: "Effacer",
  emptyHotContents: "Aucun contenu tendance (agrégation horaire)",
  suggestTitle: "Vouliez-vous dire...",
  emptySuggestions: "Aucune suggestion trouvée",
  searchTitle: "Résultats de recherche",
  emptySearchResults: "Aucun résultat de recherche",
};
