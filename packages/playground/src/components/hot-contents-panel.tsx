import type { HotContentItem } from "@mui-search/shared";

interface HotContentsPanelProps {
  hotContents: HotContentItem[];
}

export function HotContentsPanel(props: HotContentsPanelProps): React.JSX.Element {
  return (
    <section className="backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/70 dark:border-slate-700/50 rounded-[22px] shadow-[0_22px_56px_rgba(14,34,56,0.2)] dark:shadow-[0_22px_56px_rgba(0,0,0,0.4)] p-4 sm:p-[1.1rem] min-w-0">
      <h2 className="m-0 mb-3 text-[1.03rem]">Hourly Hot Content</h2>
      <ul className="list-none m-0 p-0 grid gap-[0.68rem] min-w-0">
        {props.hotContents.length === 0 ? (
          <li className="border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-[0.8rem] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60">
            No hot list data yet. Run a search and track clicks first.
          </li>
        ) : (
          props.hotContents.map(function renderHotContent(item) {
            return (
              <li
                key={`${item.hourBucket}-${item.locale}-${item.contentId}`}
                className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white/95 dark:bg-slate-800/95 p-[0.78rem] min-w-0"
              >
                <article className="min-w-0">
                  <h3 className="m-0 text-[1.02rem] break-words">{item.contentTitle}</h3>
                  <p className="mt-[0.4rem] mb-0 text-slate-600 dark:text-slate-400 text-[0.86rem] break-words">
                    Content ID: {item.contentId}
                  </p>
                  <p className="mt-[0.4rem] mb-0 text-slate-600 dark:text-slate-400 text-[0.86rem] break-words">
                    Hour Bucket: {new Date(item.hourBucket).toLocaleString()}
                  </p>
                  <p className="mt-[0.4rem] mb-0 text-slate-600 dark:text-slate-400 text-[0.86rem] break-words">
                    Locale: {item.locale}
                  </p>
                  <p className="mt-[0.4rem] mb-0 text-teal-700 dark:text-teal-400 font-bold text-[0.85rem] break-words">
                    Hits: {item.hitCount}
                  </p>
                </article>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
