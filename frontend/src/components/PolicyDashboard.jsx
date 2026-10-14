import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { AlertCircle, ChevronDown, Loader2 } from "lucide-react";
import OutOfPocketCard from "./OutOfPocketCard.jsx";
import { t, tr, useLanguage } from "../LanguageContext.jsx";

const POLICY_QUERY = gql`
  query Policy($documentId: ID!) {
    getOutOfPocketMap(documentId: $documentId) {
      scenario
      risk
      confidence
      headline { en hi }
      explanation { en hi }
      items {
        label { en hi }
        impact
        evidence { page clause quote }
      }
    }
    getPolicyFindings(documentId: $documentId) {
      id
      type
      severity
      title { en hi }
      detail { en hi }
      suggestedQuestionForInsurer { en hi }
    }
  }
`;

const SEVERITY_DOT = {
  warning: "bg-amber-500",
  notice: "bg-sky-500",
  info: "bg-slate-400",
};
const RISK_ORDER = { high: 0, medium: 1, low: 2 };

export default function PolicyDashboard({ documentId }) {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState("all");
  const { data, loading, error } = useQuery(POLICY_QUERY, { variables: { documentId } });

  if (loading) {
    return (
      <div role="status" className="flex flex-col items-center py-24 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" aria-hidden="true" />
        <p className="mt-3">{tr("Loading your Out-of-Pocket Map…", lang)}</p>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="mx-auto mt-12 flex max-w-xl items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" /> {error.message}
      </p>
    );
  }

  const allCards = [...data.getOutOfPocketMap].sort(
    (a, b) => (RISK_ORDER[a.risk] ?? 9) - (RISK_ORDER[b.risk] ?? 9)
  );
  const findings = data.getPolicyFindings;
  const count = (r) => allCards.filter((c) => c.risk === r).length;
  const cards = filter === "all" ? allCards : allCards.filter((c) => c.risk === filter);

  const tabs = [
    { key: "all", label: "All", n: allCards.length, cls: "bg-slate-900 text-white" },
    { key: "high", label: "High risk", n: count("high"), cls: "bg-red-600 text-white" },
    { key: "medium", label: "Medium", n: count("medium"), cls: "bg-amber-500 text-white" },
    { key: "low", label: "Low", n: count("low"), cls: "bg-emerald-600 text-white" },
  ];

  const high = count("high");
  const summary =
    lang === "hi"
      ? high > 0
        ? `देखने योग्य ${high} बड़ी बात${high > 1 ? "ें" : ""}। लाल कार्ड से शुरू करें।`
        : tr("No high-risk items found. Review the cards below.", lang)
      : high > 0
        ? `${high} big thing${high > 1 ? "s" : ""} to watch out for. Start with the red cards.`
        : "No high-risk items found. Review the cards below.";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">{tr("Where you may pay from your pocket", lang)}</h1>
      <p className="mt-1 text-sm text-slate-600">{summary}</p>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={tr("Filter by risk", lang)}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              filter === tab.key ? tab.cls : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tr(tab.label, lang)} ({tab.n})
          </button>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
        {cards.map((card, i) => (
          <OutOfPocketCard key={`${card.scenario}-${i}`} card={card} />
        ))}
        {cards.length === 0 && <p className="text-sm text-slate-600">{tr("Nothing in this category.", lang)}</p>}
      </div>

      <section className="mt-10" aria-labelledby="findings-heading">
        <h2 id="findings-heading" className="text-lg font-bold">
          {tr("⚠️ Automated Policy Findings", lang)}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{tr("Questions worth asking your insurer before you need to claim.", lang)}</p>
        {findings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">{tr("No findings were reported.", lang)}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {findings.map((f, i) => (
              <li key={`${f.id}-${i}`}>
                <details className="group p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[f.severity] ?? SEVERITY_DOT.info}`}
                        aria-hidden="true"
                      />
                      {t(f.title, lang)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm text-slate-700">{t(f.detail, lang)}</p>
                  {f.suggestedQuestionForInsurer && (
                    <p className="mt-2 rounded-lg bg-indigo-50 p-2 text-sm text-indigo-900">
                      <span className="font-medium">{tr("Ask: ", lang)}</span>
                      {t(f.suggestedQuestionForInsurer, lang)}
                    </p>
                  )}
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
