import { HotContentsPanel } from "./components/hot-contents-panel";
import { RequestForm } from "./components/request-form";
import { SearchResultsPanel } from "./components/search-results-panel";
import { SuggestionPanel } from "./components/suggestion-panel";
import { usePlaygroundState } from "./use-playground-state";
import { cn } from "./utils";

export function App(): React.JSX.Element {
  const state = usePlaygroundState();

  return (
    <section className="grid gap-4">
      <header className="grid gap-[0.45rem] px-[0.35rem] py-[0.1rem]">
        <p className="m-0 inline-flex w-fit items-center gap-2 px-[0.68rem] py-[0.36rem] rounded-full text-[0.75rem] font-bold tracking-[0.1em] uppercase text-[#084f42] bg-[#d3fff4] dark:bg-teal-900/30 dark:text-teal-300">
          <span>MUI Search Playground</span>
          <span className="opacity-60 normal-case tracking-normal font-mono">v{process.env.APP_VERSION}</span>
        </p>
        <h1 className="m-0 text-[clamp(1.58rem,4.3vw,2.4rem)] leading-[1.1]">Hybrid Search API Playground</h1>
        <p className="m-0 text-slate-600 dark:text-slate-400">
          Call <code className="font-mono">/api/suggest</code>, <code className="font-mono">/api/search</code>,{" "}
          <code className="font-mono">/api/click</code>, and <code className="font-mono">/api/hot</code> directly to
          inspect responses.
        </p>
        <p className="mt-[0.2rem] mb-0 flex flex-wrap gap-2">
          <a
            className="inline-flex items-center px-[0.72rem] py-[0.36rem] rounded-full border border-teal-700/30 dark:border-teal-400/30 bg-white/70 dark:bg-slate-800/70 text-[#0b5e4f] dark:text-teal-300 text-[0.84rem] font-bold no-underline hover:border-teal-800/45 dark:hover:border-teal-400/45 hover:bg-teal-600/10 dark:hover:bg-teal-400/10 transition-colors"
            href="/stat.html"
            target="_blank"
            rel="noreferrer"
          >
            Open Analytics Dashboard
          </a>
          <a
            className="inline-flex items-center px-[0.72rem] py-[0.36rem] rounded-full border border-teal-700/30 dark:border-teal-400/30 bg-white/70 dark:bg-slate-800/70 text-[#0b5e4f] dark:text-teal-300 text-[0.84rem] font-bold no-underline hover:border-teal-800/45 dark:hover:border-teal-400/45 hover:bg-teal-600/10 dark:hover:bg-teal-400/10 transition-colors"
            href="/search-widget-demo.html"
            target="_blank"
            rel="noreferrer"
          >
            Open Widget Demo
          </a>
        </p>
      </header>

      <section className="backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700/50 rounded-[22px] shadow-[0_22px_56px_rgba(14,34,56,0.2)] dark:shadow-[0_22px_56px_rgba(0,0,0,0.4)] p-4 sm:p-[1.1rem] min-w-0 grid gap-[0.9rem]">
        <h2 className="m-0 text-[1.03rem]">Request Parameters</h2>
        <RequestForm
          apiBaseUrl={state.apiBaseUrl}
          localeFilter={state.localeFilter}
          query={state.query}
          suggestLimitInput={state.suggestLimitInput}
          searchLimitInput={state.searchLimitInput}
          hotLimitInput={state.hotLimitInput}
          hotHoursInput={state.hotHoursInput}
          isSearching={state.isSearching}
          isLoadingHot={state.isLoadingHot}
          onSubmitSearch={state.onSubmitSearch}
          onClickSuggest={state.onClickSuggest}
          onClickRefreshHot={state.onClickRefreshHot}
          onApiBaseUrlChange={state.onApiBaseUrlChange}
          onLocaleChange={state.onLocaleChange}
          onQueryChange={state.onQueryChange}
          onSuggestLimitChange={state.onSuggestLimitChange}
          onSearchLimitChange={state.onSearchLimitChange}
          onHotLimitChange={state.onHotLimitChange}
          onHotHoursChange={state.onHotHoursChange}
        />

        <p
          className={cn(
            "m-0 px-[0.78rem] py-[0.65rem] rounded-xl bg-white/62 dark:bg-slate-800/60 border border-dashed",
            state.isStatusError
              ? "text-red-900 border-red-900/30 bg-red-100/70 dark:text-red-300 dark:border-red-400/30 dark:bg-red-900/30"
              : "text-slate-600 border-slate-300 dark:text-slate-400 dark:border-slate-600",
          )}
        >
          {state.statusText}
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SuggestionPanel suggestions={state.suggestions} onApplySuggestion={state.onApplySuggestion} />
        <SearchResultsPanel
          results={state.results}
          isTrackingResultId={state.isTrackingResultId}
          onTrackResultClick={state.onTrackResultClick}
        />
      </section>

      <HotContentsPanel hotContents={state.hotContents} />
    </section>
  );
}
