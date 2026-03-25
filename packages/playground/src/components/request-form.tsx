import type { SubmitEvent } from "react";
import { LOCALE_OPTIONS } from "../constants";

interface RequestFormProps {
  apiBaseUrl: string;
  localeFilter: string;
  query: string;
  suggestLimitInput: string;
  searchLimitInput: string;
  hotLimitInput: string;
  hotHoursInput: string;
  isSearching: boolean;
  isLoadingHot: boolean;
  onSubmitSearch(event: SubmitEvent<HTMLFormElement>): void;
  onClickSuggest(): void;
  onClickRefreshHot(): void;
  onApiBaseUrlChange(value: string): void;
  onLocaleChange(value: string): void;
  onQueryChange(value: string): void;
  onSuggestLimitChange(value: string): void;
  onSearchLimitChange(value: string): void;
  onHotLimitChange(value: string): void;
  onHotHoursChange(value: string): void;
}

const inputClass =
  "rounded-xl border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 py-2.5 px-[0.8rem] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600/30 dark:focus:ring-teal-400/30 focus:border-teal-600/60 dark:focus:border-teal-400/60 font-inherit";
const buttonClass =
  "py-[0.72rem] px-[0.8rem] rounded-xl cursor-pointer font-bold bg-[#0c7d66] dark:bg-[#0d9479] text-white transition-all duration-120 hover:bg-[#086755] dark:hover:bg-[#0a7a63] hover:-translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed disabled:transform-none border-0";

export function RequestForm(props: RequestFormProps): React.JSX.Element {
  return (
    <form className="grid grid-cols-1 sm:grid-cols-2 gap-[0.7rem]" autoComplete="off" onSubmit={props.onSubmitSearch}>
      <label className="grid gap-[0.35rem] min-w-0">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">API Base URL</span>
        <input
          type="text"
          className={inputClass}
          value={props.apiBaseUrl}
          placeholder="https://your-worker.example.workers.dev"
          onChange={function onApiBaseUrlInputChange(event) {
            props.onApiBaseUrlChange(event.currentTarget.value);
          }}
        />
      </label>

      <label className="grid gap-[0.35rem] min-w-0">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">Locale</span>
        <select
          className={inputClass}
          value={props.localeFilter}
          onChange={function onLocaleSelectChange(event) {
            props.onLocaleChange(event.currentTarget.value);
          }}
        >
          {LOCALE_OPTIONS.map(function renderLocaleOption(item) {
            return (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </select>
      </label>

      <label className="grid gap-[0.35rem] min-w-0 col-span-1 sm:col-span-full">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">Query</span>
        <input
          type="text"
          className={inputClass}
          value={props.query}
          placeholder="e.g. Does TiDB support AI?"
          onChange={function onQueryInputChange(event) {
            props.onQueryChange(event.currentTarget.value);
          }}
        />
      </label>

      <label className="grid gap-[0.35rem] min-w-0">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">Suggest Limit</span>
        <input
          type="number"
          className={inputClass}
          min="1"
          max="20"
          value={props.suggestLimitInput}
          onChange={function onSuggestLimitInputChange(event) {
            props.onSuggestLimitChange(event.currentTarget.value);
          }}
        />
      </label>

      <label className="grid gap-[0.35rem] min-w-0">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">Search Limit</span>
        <input
          type="number"
          className={inputClass}
          min="1"
          max="20"
          value={props.searchLimitInput}
          onChange={function onSearchLimitInputChange(event) {
            props.onSearchLimitChange(event.currentTarget.value);
          }}
        />
      </label>

      <label className="grid gap-[0.35rem] min-w-0">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">Hot Limit</span>
        <input
          type="number"
          className={inputClass}
          min="1"
          max="20"
          value={props.hotLimitInput}
          onChange={function onHotLimitInputChange(event) {
            props.onHotLimitChange(event.currentTarget.value);
          }}
        />
      </label>

      <label className="grid gap-[0.35rem] min-w-0">
        <span className="text-[0.86rem] text-slate-600 dark:text-slate-400 font-bold">Hot Hours</span>
        <input
          type="number"
          className={inputClass}
          min="1"
          max="168"
          value={props.hotHoursInput}
          onChange={function onHotHoursInputChange(event) {
            props.onHotHoursChange(event.currentTarget.value);
          }}
        />
      </label>

      <div className="col-span-1 sm:col-span-full grid grid-cols-1 sm:grid-cols-3 gap-[0.7rem]">
        <button type="button" className={buttonClass} onClick={props.onClickSuggest}>
          Test Suggestions
        </button>
        <button type="submit" className={buttonClass} disabled={props.isSearching}>
          {props.isSearching ? "Searching..." : "Test Search"}
        </button>
        <button type="button" className={buttonClass} disabled={props.isLoadingHot} onClick={props.onClickRefreshHot}>
          {props.isLoadingHot ? "Refreshing Hot List..." : "Refresh Hot List"}
        </button>
      </div>
    </form>
  );
}
