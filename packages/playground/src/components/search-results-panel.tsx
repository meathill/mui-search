import type { HybridSearchResult } from "@mui-search/shared";

interface SearchResultsPanelProps {
  results: HybridSearchResult[];
  isTrackingResultId: string;
  onTrackResultClick(item: HybridSearchResult): void;
}

export function SearchResultsPanel(props: SearchResultsPanelProps): React.JSX.Element {
  return (
    <section className="backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700/50 rounded-[22px] shadow-[0_22px_56px_rgba(14,34,56,0.2)] dark:shadow-[0_22px_56px_rgba(0,0,0,0.4)] p-4 sm:p-[1.1rem] min-w-0">
      <h2 className="m-0 mb-3 text-[1.03rem]">Search Results</h2>
      <ul className="list-none m-0 p-0 grid gap-[0.68rem] min-w-0">
        {props.results.length === 0 ? (
          <li className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-[0.8rem] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60">
            No search results
          </li>
        ) : (
          props.results.map(function renderResult(item) {
            return (
              <li
                key={item.id}
                className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white/95 dark:bg-slate-800/95 p-[0.78rem] min-w-0"
              >
                <article className="min-w-0">
                  <h3 className="m-0 text-[1.02rem] break-words">{item.title}</h3>
                  <p className="mt-[0.4rem] mb-0 text-slate-600 dark:text-slate-400 break-words">{item.content}</p>
                  <p className="mt-[0.4rem] mb-0 text-teal-700 dark:text-teal-400 font-bold text-[0.85rem] break-words">
                    RRF Score: {item.score.toFixed(6)}
                  </p>
                  {item.locale ? (
                    <p className="inline-flex w-fit mt-2 px-2 py-0.5 rounded-full bg-teal-600/15 dark:bg-teal-400/15 text-teal-800 dark:text-teal-300 font-bold text-[0.78rem]">
                      Locale: {item.locale}
                    </p>
                  ) : null}
                  <div className="flex justify-end mt-[0.65rem]">
                    <button
                      type="button"
                      className="py-[0.48rem] px-[0.68rem] bg-white/95 dark:bg-slate-800/90 text-teal-800 dark:text-teal-300 border border-teal-800/25 dark:border-teal-400/25 text-[0.82rem] rounded-xl hover:bg-teal-600/10 hover:border-teal-800/45 dark:hover:bg-teal-400/10 dark:hover:border-teal-400/45 transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                      disabled={props.isTrackingResultId === item.id}
                      onClick={function onClickTrackResult() {
                        props.onTrackResultClick(item);
                      }}
                    >
                      {props.isTrackingResultId === item.id ? "Tracking..." : "Track Click"}
                    </button>
                  </div>
                </article>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
