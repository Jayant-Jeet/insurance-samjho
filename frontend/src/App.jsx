import { useState } from "react";
import { Languages, Lock, Quote } from "lucide-react";
import { tr } from "./LanguageContext.jsx";

const BADGES = [
  { icon: Lock, title: "Private when you choose Local", text: "We don't store or share your data." },
  { icon: Quote, title: "Exact-Quote Evidence", text: "Every claim links to the policy text." },
];
import InsuranceSamjhoLanding from "./components/InsuranceSamjhoLanding.jsx";
import PolicyDashboard from "./components/PolicyDashboard.jsx";
import SupportBanner from "./components/SupportBanner.jsx";
import { useLanguage } from "./LanguageContext.jsx";

export default function App() {
  const [documentId, setDocumentId] = useState(null);
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDocumentId(null)}
              aria-label="Insurance Samjho"
              className="rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <img src="/logo.png" alt="Insurance Samjho" className="h-10 w-auto" />
            </button>
          </div>
          <div
            role="group"
            aria-label="Language"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 text-sm"
          >
            <Languages className="ml-1.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            {[
              ["en", "English"],
              ["hi", "हिन्दी"],
            ].map(([code, label]) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`rounded-md px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  lang === code ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1">
        {documentId ? (
          <>
            <PolicyDashboard documentId={documentId} />
            <SupportBanner />
          </>
        ) : (
          <InsuranceSamjhoLanding onUploaded={setDocumentId} />
        )}
      </div>

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-3">
          {BADGES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-2 text-xs text-slate-600">
              <Icon className="h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
              <span className="font-semibold text-slate-800">{tr(title, lang)}</span>
              {text && <span className="hidden sm:inline">· {tr(text, lang)}</span>}
            </li>
          ))}
        </ul>
      </footer>
    </div>
  );
}
