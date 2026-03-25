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
    <nav className="nav-blur sticky top-0 z-50 border-b border-slate-200/60 bg-white/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="/" className="text-lg font-bold text-slate-900 no-underline">
          MUI Search
        </a>
        <div className="flex items-center gap-5 text-sm font-medium">
          <a href="/playground.html" className="text-slate-600 no-underline hover:text-brand transition-colors">
            {t.nav.playground}
          </a>
          <a href="/stat.html" className="text-slate-600 no-underline hover:text-brand transition-colors">
            {t.nav.analytics}
          </a>
          <a href="/search-widget-demo.html" className="text-slate-600 no-underline hover:text-brand transition-colors">
            {t.nav.widgetDemo}
          </a>
          <a
            href="https://github.com/meathill/mui-search"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 no-underline hover:text-brand transition-colors"
          >
            {t.nav.github}
          </a>
          <button
            type="button"
            onClick={onToggleLocale}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand transition-colors cursor-pointer"
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
    <section className="hero-gradient px-6 pb-20 pt-24 text-center">
      <div className="relative z-10 mx-auto max-w-3xl">
        <span className="mb-6 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold tracking-wide text-emerald-700">
          {t.hero.badge}
        </span>
        <h1 className="mb-6 text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-tight text-slate-900">
          {t.hero.title}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-600">{t.hero.subtitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#quick-start"
            className="rounded-xl bg-brand px-7 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-brand/25 hover:bg-brand-dark transition-colors"
          >
            {t.hero.ctaStart}
          </a>
          <a
            href="/playground.html"
            className="rounded-xl border border-slate-300 bg-white px-7 py-3 text-sm font-bold text-slate-700 no-underline shadow-sm hover:border-brand hover:text-brand transition-colors"
          >
            {t.hero.ctaPlayground}
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
          <h2 className="mb-3 text-3xl font-bold text-slate-900">{t.features.title}</h2>
          <p className="text-base text-slate-500">{t.features.subtitle}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.items.map((item) => (
            <div key={item.title} className="feature-card rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-4 text-3xl">{item.icon}</div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Architecture({ t }: { t: LandingTranslations }): React.JSX.Element {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold text-slate-900">{t.architecture.title}</h2>
          <p className="text-base text-slate-500">{t.architecture.subtitle}</p>
        </div>
        <div className="space-y-3">
          {t.architecture.steps.map((step, i) => (
            <div key={step} className="arch-step flex items-start gap-4 pb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white shadow-md shadow-brand/20">
                {i + 1}
              </div>
              <p className="pt-1.5 text-base text-slate-700">{step}</p>
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
          <h2 className="mb-3 text-3xl font-bold text-slate-900">{t.quickStart.title}</h2>
          <p className="text-base text-slate-500">{t.quickStart.subtitle}</p>
        </div>
        <div className="space-y-8">
          {t.quickStart.steps.map((step) => (
            <div key={step.label}>
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-lg bg-brand/10 px-3 py-1 text-xs font-bold text-brand">{step.label}</span>
                <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              </div>
              <div className="code-block">{step.code}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ t }: { t: LandingTranslations }): React.JSX.Element {
  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center text-sm text-slate-500">
        <div className="flex items-center gap-6">
          <a href="/playground.html" className="text-slate-500 no-underline hover:text-brand transition-colors">
            Playground
          </a>
          <a href="/stat.html" className="text-slate-500 no-underline hover:text-brand transition-colors">
            Analytics
          </a>
          <a href="/search-widget-demo.html" className="text-slate-500 no-underline hover:text-brand transition-colors">
            Widget Demo
          </a>
          <a
            href="https://github.com/meathill/mui-search"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 no-underline hover:text-brand transition-colors"
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
