import type { SuggestionItem } from "@mui-search/shared";

interface SuggestionPanelProps {
  suggestions: SuggestionItem[];
  onApplySuggestion(text: string): void;
}

export function SuggestionPanel(props: SuggestionPanelProps): React.JSX.Element {
  return (
    <section className="backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700/50 rounded-[22px] shadow-[0_22px_56px_rgba(14,34,56,0.2)] dark:shadow-[0_22px_56px_rgba(0,0,0,0.4)] p-4 sm:p-[1.1rem] min-w-0">
      <h2 className="m-0 mb-3 text-[1.03rem]">Suggestions</h2>
      <ul className="list-none m-0 p-0 grid gap-2 min-w-0">
        {props.suggestions.length === 0 ? (
          <li className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-[0.8rem] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60">
            No suggestions
          </li>
        ) : (
          props.suggestions.map(function renderSuggestion(item) {
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full text-left bg-white/98 dark:bg-slate-800/98 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 py-[0.62rem] px-[0.75rem] rounded-xl hover:border-slate-400 dark:hover:border-slate-500 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  onClick={function onSuggestionClick() {
                    props.onApplySuggestion(item.text);
                  }}
                >
                  {item.text}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
