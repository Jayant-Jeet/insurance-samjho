import { useId, useState } from "react";
import { ChevronDown, Info, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { t, tr, useLanguage } from "../LanguageContext.jsx";

export const RISK = {
  high: { style: "bg-red-50 text-red-700 border-red-200", Icon: ShieldAlert, label: "High risk" },
  medium: { style: "bg-amber-50 text-amber-700 border-amber-200", Icon: Info, label: "Medium risk" },
  low: { style: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: ShieldCheck, label: "Low risk" },
};
const NEUTRAL = { style: "bg-slate-50 text-slate-700 border-slate-200", Icon: Info, label: "Note" };

const IMPACT = {
  pay_first_then_claim: "Pay first, then claim",
  not_payable: "Not payable",
  partly_payable: "Partly payable",
  no_extra_cost: "No extra cost",
  depends: "Depends",
};

export default function OutOfPocketCard({ card }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const risk = RISK[card.risk] ?? NEUTRAL;
  const { Icon } = risk;
  const items = (card.items ?? []).filter(Boolean);
  const evidence = items.flatMap((item) =>
    (item.evidence ?? []).filter(Boolean).map((ev) => ({ ...ev, label: t(item.label, lang) }))
  );

  return (
    <article className={`flex flex-col rounded-2xl border p-4 ${risk.style}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <Icon className="h-4 w-4" aria-hidden="true" /> {tr(risk.label, lang)}
        </span>
        {card.confidence === "verify" && (
          <span
            title={tr("We could not match the quote exactly. Please confirm with your insurer.", lang)}
            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300"
          >
            <TriangleAlert className="h-3 w-3" aria-hidden="true" /> {tr("Verify", lang)}
          </span>
        )}
      </div>

      <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">{t(card.headline, lang)}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-700">{t(card.explanation, lang)}</p>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mt-3 inline-flex items-center gap-1 self-start text-sm font-medium text-slate-900 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {open ? tr("Show less", lang) : tr("More details", lang)}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="mt-3 space-y-3 rounded-lg bg-white p-3 text-slate-800">
          <p className="text-sm">{t(card.explanation, lang)}</p>

          {items.length > 0 && (
            <ul className="space-y-1.5">
              {items.map((item, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <span>• {t(item.label, lang)}</span>
                  {item.impact && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                      {tr(IMPACT[item.impact] ?? item.impact, lang)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Quotes evidence={evidence} lang={lang} />
        </div>
      )}
    </article>
  );
}

function Quotes({ evidence, lang }) {
  const [show, setShow] = useState(false);
  const id = useId();
  if (evidence.length === 0) {
    return <p className="text-xs text-slate-500">{tr("No direct policy quote attached.", lang)}</p>;
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-expanded={show}
        aria-controls={id}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {tr("View Exact Policy Quotes", lang)}
      </button>
      {show && (
        <div id={id} className="mt-2 space-y-2">
          {evidence.map((ev, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-slate-500">
                {tr("Page", lang)} {ev.page}
                {ev.clause ? ` | ${tr("Clause", lang)} ${ev.clause}` : ""}
              </p>
              <blockquote className="mt-1 border-l-4 border-slate-300 bg-slate-50 p-2 font-mono text-xs leading-relaxed">
                {ev.quote}
              </blockquote>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
