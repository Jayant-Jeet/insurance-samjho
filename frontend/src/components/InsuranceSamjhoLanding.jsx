import { useCallback, useEffect, useRef, useState } from "react";
import { tr, useLanguage } from "../LanguageContext.jsx";
import { API_BASE_URL } from "../config.js";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Copy,
  FileUp,
  Loader2,
  RefreshCw,
  Terminal,
} from "lucide-react";

const HEALTH_URL = "http://localhost:8001/health/local-models";

const STEPS = [
  "Segmenting PDF pages...",
  "Extracting coverage...",
  "Cross-checking quotes...",
  "Building Out-of-Pocket Map...",
];

const LOCAL_SERVICES = [
  {
    key: "gemma",
    title: "Policy Parser",
    model: "google/gemma-2-9b-it",
    port: 8000,
    commands: {
      windows:
        "# In WSL2 Ubuntu terminal:\nvllm serve google/gemma-2-9b-it --host 0.0.0.0 --port 8000 --max-model-len 4096 --dtype bfloat16",
      mac: "vllm serve google/gemma-2-9b-it --port 8000 --max-model-len 4096 --device cpu",
      linux: "vllm serve google/gemma-2-9b-it --port 8000 --max-model-len 4096 --dtype bfloat16",
    },
  },
  {
    key: "indictrans",
    title: "Indic Translation",
    model: "ai4bharat/indictrans2-en-indic-1B",
    port: 8002,
    commands: {
      windows: "python -m app.serve_indictrans --port 8002",
      mac: "python -m app.serve_indictrans --port 8002",
      linux: "python -m app.serve_indictrans --port 8002",
    },
  },
];

const OS_TABS = [
  { key: "windows", label: "Windows (WSL2)" },
  { key: "mac", label: "macOS (Apple Silicon)" },
  { key: "linux", label: "Linux (CUDA)" },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy command"
      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function StatusBadge({ ready, lang }) {
  return ready ? (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {tr("Running", lang)}
    </span>
  ) : (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
      {tr("Offline", lang)}
    </span>
  );
}

export default function InsuranceSamjhoLanding({ onUploaded }) {
  const { lang } = useLanguage();
  const [mode, setMode] = useState("online"); // 'online' | 'local'
  const [activeOs, setActiveOs] = useState("windows"); // 'windows' | 'mac' | 'linux'
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const isLocal = mode === "local";
  const allReady = !isLocal || health?.all_ready === true;
  const locked = isLocal && !allReady;

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(HEALTH_URL);
      setHealth(res.ok ? await res.json() : { all_ready: false, models: {} });
    } catch {
      setHealth({ all_ready: false, models: {} });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocal) return undefined;
    checkHealth();
    const id = setInterval(checkHealth, 4000);
    return () => clearInterval(id);
  }, [isLocal, checkHealth]);

  // The backend call is a single request, so steps advance on a timer and hold on the last one.
  useEffect(() => {
    if (!loading) return undefined;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    return () => clearInterval(id);
  }, [loading]);

  async function upload(file) {
    if (!file || locked) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_BASE_URL}/api/policy/upload?mode=${mode}`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.documentId) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      onUploaded(data.documentId);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (!loading && !locked) upload(e.dataTransfer.files?.[0]);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="mb-8 flex justify-center">
        <div role="group" aria-label="Engine mode" className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-sm">
          {[
            { id: "online", label: "Online LLM", Icon: Cloud },
            { id: "local", label: "Local LLM (Private)", Icon: Terminal },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              disabled={loading}
              aria-pressed={mode === id}
              onClick={() => {
                setMode(id);
                setError(null);
              }}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
                mode === id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tr(label, lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {tr("Understand your health insurance,", lang)}{" "}
          <span className="text-indigo-700">{tr("in plain language", lang)}</span>
        </h1>
        <p className="mt-3 text-slate-600">
          {tr("Upload your policy PDF and see exactly where you could end up paying out of pocket.", lang)}
        </p>
      </div>

      {isLocal && !loading && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Active Local AI Environment">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-semibold">{tr("Active Local AI Environment", lang)}</h2>
            <button
              type="button"
              onClick={checkHealth}
              disabled={checking}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} aria-hidden="true" />
              {tr("Refresh Status", lang)}
            </button>
          </div>
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            ⚠️ <strong>{tr("First-time setup:", lang)}</strong> {tr("Gemma requires running", lang)}{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-xs">huggingface-cli login</code>{" "}
            {tr("with an approved Hugging Face token.", lang)}
          </p>
          <div role="tablist" aria-label="Operating system" className="mb-4 flex flex-wrap gap-2">
            {OS_TABS.map((o) => (
              <button
                key={o.key}
                type="button"
                role="tab"
                aria-selected={activeOs === o.key}
                onClick={() => setActiveOs(o.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  activeOs === o.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {LOCAL_SERVICES.map((s) => (
              <div key={s.key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{tr(s.title, lang)}</p>
                  <StatusBadge ready={health?.models?.[s.key]?.ready === true} lang={lang} />
                </div>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {s.model} · {tr("Port", lang)} {s.port}
                </p>
                <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-slate-900 px-3 py-2">
                  <code className="whitespace-pre-wrap break-all font-mono text-xs text-slate-100">{s.commands[activeOs]}</code>
                  <CopyButton text={s.commands[activeOs]} />
                </div>
              </div>
            ))}
          </div>
          {locked ? (
            <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tr("Start both local services above. The dropzone will unlock automatically once detected.", lang)}
            </p>
          ) : (
            <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {tr("Local environment ready. Upload enabled.", lang)}
            </p>
          )}
        </section>
      )}

      <div className="mt-8">
        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-hidden="true" />
              <p className="font-medium">{tr("Analysing your policy locally…", lang)}</p>
            </div>
            <ol className="space-y-3">
              {STEPS.map((label, i) => (
                <li
                  key={label}
                  className={`flex items-center gap-3 text-sm ${
                    i <= step ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  ) : i === step ? (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" aria-hidden="true" />
                  ) : (
                    <span className="h-5 w-5 rounded-full border-2 border-slate-200" aria-hidden="true" />
                  )}
                  {tr(label, lang)}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!locked) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !locked && inputRef.current?.click()}
            onKeyDown={(e) => !locked && (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-disabled={locked}
            aria-label="Upload policy PDF. Drop a file here or press Enter to browse."
            className={`flex flex-col items-center rounded-2xl border-2 border-dashed p-10 text-center transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              locked
                ? "cursor-not-allowed border-slate-300 bg-white opacity-50"
                : dragging
                  ? "cursor-pointer border-indigo-500 bg-indigo-50"
                  : "cursor-pointer border-slate-300 bg-white hover:border-indigo-400"
            }`}
          >
            <FileUp className="h-10 w-10 text-indigo-600" aria-hidden="true" />
            <p className="mt-3 font-medium">{tr("Drag & drop your policy PDF here", lang)}</p>
            <p className="text-sm text-slate-500">{tr("or click to browse", lang)}</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={locked}
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {tr(error, lang)}
          </p>
        )}
      </div>
    </main>
  );
}
