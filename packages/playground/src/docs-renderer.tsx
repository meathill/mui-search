import { useMemo, useState } from "react";
import { Marked } from "marked";

const marked = new Marked();

function getDefaultLocale(): "zh" | "en" {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("zh")) return "zh";
  }
  return "en";
}

interface DocsPageProps {
  markdownZh: string;
  markdownEn: string;
}

export function DocsPage({ markdownZh, markdownEn }: DocsPageProps): React.JSX.Element {
  const [locale, setLocale] = useState<"zh" | "en">(getDefaultLocale);

  const html = useMemo(() => {
    const source = locale === "zh" ? markdownZh : markdownEn;
    return marked.parse(source) as string;
  }, [locale, markdownZh, markdownEn]);

  function handleToggleLocale() {
    setLocale((prev) => (prev === "zh" ? "en" : "zh"));
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="text-lg font-bold text-slate-900 no-underline dark:text-white">
            MUI Search
          </a>
          <div className="flex items-center gap-5 text-sm font-medium">
            <a
              href="/playground.html"
              className="text-slate-600 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
            >
              {locale === "zh" ? "\u6d4b\u8bd5\u53f0" : "Playground"}
            </a>
            <a
              href="https://github.com/meathill/mui-search"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={handleToggleLocale}
              className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-light dark:hover:text-brand-light"
            >
              {locale === "zh" ? "EN" : "\u4e2d\u6587"}
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <article
          className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-brand prose-code:rounded prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none dark:prose-a:text-brand-light dark:prose-code:bg-slate-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <a
          href="/"
          className="text-sm font-medium text-brand no-underline hover:text-brand-dark dark:text-brand-light dark:hover:text-white"
        >
          &larr; {locale === "zh" ? "\u8fd4\u56de\u9996\u9875" : "Back to Home"}
        </a>
      </footer>
    </div>
  );
}
