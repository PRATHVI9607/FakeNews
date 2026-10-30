import type { ModelInfo } from "@/lib/api";
import { ThemeToggle } from "./theme-toggle";

const dot = {
  ready: "bg-real",
  loading: "bg-warn animate-pulse",
  unavailable: "bg-fake",
} as const;

export function Masthead({ models, modelsError }: { models: ModelInfo[] | null; modelsError: boolean }) {
  return (
    <header className="border-b border-ink pb-6">
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <span className="label">Fake-news classifier</span>
        <ThemeToggle />
      </div>
      <div className="grid gap-8 pt-8 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <h1 className="font-serif text-7xl leading-[0.9] tracking-tight sm:text-8xl">Loki</h1>
          <p className="mt-4 max-w-xl text-lg leading-snug text-muted">
            Paste an article or a link. Four fine-tuned transformers vote on whether it reads as fake, and the source is checked against known lists.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 md:max-w-xs md:flex-col md:gap-y-2" aria-label="Model status">
          {modelsError && <li className="label text-fake">API unreachable</li>}
          {!models && !modelsError && <li className="label">Loading models…</li>}
          {models?.map((m) => (
            <li key={m.id} title={m.error ?? undefined} className="flex items-center gap-2 font-mono text-xs">
              <span className={`size-1.5 rounded-full ${dot[m.status]}`} aria-hidden />
              <span>{m.name}</span>
              <span className="text-muted">{m.status === "ready" && m.accuracy !== null ? `${(m.accuracy * 100).toFixed(1)}%` : m.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
