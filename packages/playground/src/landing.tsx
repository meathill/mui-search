import type { SVGProps } from "react";
import { useState } from "react";
import { type LandingTranslations, translations } from "./landing-i18n";

function getDefaultLocale(): "zh" | "en" {
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("zh")) return "zh";
  }
  return "en";
}

export function LandingPage(): React.JSX.Element {
  const [locale, setLocale] = useState<"zh" | "en">(getDefaultLocale);
  const t = translations[locale] as LandingTranslations;

  function handleToggleLocale() {
    setLocale((prev) => (prev === "zh" ? "en" : "zh"));
  }

  return (
    <div className="min-h-screen">
      <Nav t={t} onToggleLocale={handleToggleLocale} />
      <Hero t={t} />
      <Features t={t} />
      <Architecture t={t} />
      <QuickStart t={t} />
      <Footer t={t} />
    </div>
  );
}

function Nav({ t, onToggleLocale }: { t: LandingTranslations; onToggleLocale: () => void }): React.JSX.Element {
  return (
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
            {t.nav.playground}
          </a>
          <a
            href="/stat.html"
            className="text-slate-600 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            {t.nav.analytics}
          </a>
          <a
            href="/search-widget-demo.html"
            className="text-slate-600 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            {t.nav.widgetDemo}
          </a>
          <div className="group relative">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-sm font-medium text-slate-600 transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
            >
              {t.nav.examples}
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:rotate-180"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 min-w-40 -translate-x-1/2 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {t.nav.exampleItems.map(function renderItem(item) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-slate-600 no-underline transition-colors hover:bg-slate-50 hover:text-brand dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-brand-light"
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
          <a
            href="https://github.com/meathill/mui-search"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            {t.nav.github}
          </a>
          <button
            type="button"
            onClick={onToggleLocale}
            className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-light dark:hover:text-brand-light"
          >
            {t.nav.switchLang}
          </button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ t }: { t: LandingTranslations }): React.JSX.Element {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-sky-50 to-pink-50 px-6 pb-20 pt-24 text-center dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* 装饰圆 */}
      <div className="pointer-events-none absolute -right-[20%] -top-1/2 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(12,125,102,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(12,125,102,0.15)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -bottom-[30%] -left-[10%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.05)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto max-w-3xl">
        <span className="mb-6 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold tracking-wide text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
          {t.hero.badge}
        </span>
        <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-slate-900 dark:text-white">
          {t.hero.title}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          {t.hero.subtitle}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#quick-start"
            className="rounded-xl bg-brand px-7 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark"
          >
            {t.hero.ctaStart}
          </a>
          <a
            href="/playground.html"
            className="rounded-xl border border-slate-300 bg-white px-7 py-3 text-sm font-bold text-slate-700 no-underline shadow-sm transition-colors hover:border-brand hover:text-brand dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-light dark:hover:text-brand-light"
          >
            {t.hero.ctaPlayground}
          </a>
          <a
            href="https://deploy.workers.cloudflare.com/?url=https://github.com/meathill/mui-search&authed=true&fields={%22name%22:%22TIDB_DATABASE_URL%22,%22secret%22:true,%22descr%22:%22TiDB%20Cloud%20connection%20string%22}&apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-7 py-3 text-sm font-bold text-orange-700 no-underline shadow-sm transition-colors hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50"
          >
            <CloudflareIcon />
            {t.hero.ctaDeploy}
          </a>
        </div>
      </div>
    </section>
  );
}

function Features({ t }: { t: LandingTranslations }): React.JSX.Element {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">{t.features.title}</h2>
          <p className="text-base text-slate-500 dark:text-slate-400">{t.features.subtitle}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-4 text-3xl">{item.icon}</div>
              <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Architecture({ t }: { t: LandingTranslations }): React.JSX.Element {
  const steps = t.architecture.steps;

  return (
    <section className="bg-slate-50 px-6 py-20 dark:bg-slate-800/50">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">{t.architecture.title}</h2>
          <p className="text-base text-slate-500 dark:text-slate-400">{t.architecture.subtitle}</p>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={step} className="relative flex items-start gap-4 pb-3">
              {i < steps.length - 1 && (
                <div className="absolute left-5 top-12 -bottom-3 w-0.5 bg-gradient-to-b from-brand to-brand/20" />
              )}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-md shadow-brand/20">
                {i + 1}
              </div>
              <p className="pt-1.5 text-base text-slate-700 dark:text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStart({ t }: { t: LandingTranslations }): React.JSX.Element {
  return (
    <section id="quick-start" className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-slate-900 dark:text-white">{t.quickStart.title}</h2>
          <p className="text-base text-slate-500 dark:text-slate-400">{t.quickStart.subtitle}</p>
        </div>
        <div className="space-y-8">
          {t.quickStart.steps.map((step) => (
            <div key={step.label}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-lg bg-brand/10 px-3 py-1 text-xs font-bold text-brand dark:bg-brand/20 dark:text-brand-light">
                  {step.label}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
              </div>
              <pre className="overflow-x-auto whitespace-pre rounded-xl bg-slate-800 p-5 font-mono text-[0.84rem] leading-[1.7] text-slate-200 [tab-size:2] dark:bg-slate-900 dark:text-slate-300">
                {step.code}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: LandingTranslations }): React.JSX.Element {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-6">
          <a
            href="/playground.html"
            className="text-slate-500 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            Playground
          </a>
          <a
            href="/stat.html"
            className="text-slate-500 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            Analytics
          </a>
          <a
            href="/search-widget-demo.html"
            className="text-slate-500 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            Widget Demo
          </a>
          <a
            href="/docs-wordpress.html"
            className="text-slate-500 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            WordPress Example
          </a>
          <a
            href="https://github.com/meathill/mui-search"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 no-underline transition-colors hover:text-brand dark:text-slate-400 dark:hover:text-brand-light"
          >
            GitHub
          </a>
        </div>
        <p className="m-0">{t.footer.license}</p>
        <p className="m-0">{t.footer.builtWith}</p>
      </div>
    </footer>
  );
}

function CloudflareIcon(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.5 11.5c0-2.76-2.24-5-5-5a5 5 0 0 0-4.78 3.57A3.5 3.5 0 0 0 6.5 13.5H5a3 3 0 0 0 0 6h14a2.5 2.5 0 0 0 .5-4.95" />
    </svg>
  );
}
