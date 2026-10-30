"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CircleAlert } from "lucide-react";
import { analyze, getModels, type AnalyzeInput, type AnalyzeResponse, type ModelInfo } from "@/lib/api";
import { stagger } from "@/lib/motion";
import { AnalyzeForm } from "@/components/analyze-form";
import { ArticlePanel } from "@/components/article-panel";
import { HowItWorks } from "@/components/how-it-works";
import { Masthead } from "@/components/masthead";
import { ModelBreakdown } from "@/components/model-breakdown";
import { SourcePanel } from "@/components/source-panel";
import { Verdict } from "@/components/verdict";
import { VirusTotalPanel } from "@/components/virustotal-panel";

export default function Home() {
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [modelsError, setModelsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(AnalyzeResponse & { run: number }) | null>(null);
  const runs = useRef(0);

  // Models load in the background on the server, so poll until none is still loading.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let live = true;
    const poll = async () => {
      try {
        const list = await getModels();
        if (!live) return;
        setModels(list);
        setModelsError(false);
        if (list.some((m) => m.status === "loading")) timer = setTimeout(poll, 3000);
      } catch {
        if (live) setModelsError(true);
      }
    };
    poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  async function run(input: AnalyzeInput) {
    setBusy(true);
    setError(null);
    try {
      setResult({ ...(await analyze(input)), run: ++runs.current });
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6 sm:px-8">
      <Masthead models={models} modelsError={modelsError} />

      <main className="flex-1 py-12">
        <motion.div layout="position" className="mx-auto max-w-3xl">
          <AnalyzeForm busy={busy} onSubmit={run} />
          <div aria-live="assertive">
            {error && (
              <p role="alert" className="mt-6 flex items-start gap-3 border border-fake/60 bg-fake/10 p-4 text-sm">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-fake" aria-hidden />
                {error}
              </p>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.run}
              variants={stagger}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="mt-16 space-y-14"
            >
              <Verdict result={result} />
              {result.warnings.length > 0 && (
                <motion.ul variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="space-y-2 border-l-2 border-warn bg-warn/10 p-4 text-sm">
                  {result.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                      {w}
                    </li>
                  ))}
                </motion.ul>
              )}
              {result.models.length > 0 && <ModelBreakdown models={result.models} catalog={models} />}
              {result.article && <ArticlePanel article={result.article} label={result.verdict?.label ?? null} />}
              {result.sources.length > 0 && <SourcePanel sources={result.sources} />}
              {result.virustotal && <VirusTotalPanel data={result.virustotal} />}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-24">
          <HowItWorks />
        </div>
      </main>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-rule pt-4 label">
        <span>Loki</span>
        <span>Output is a statistical estimate, not a ruling.</span>
      </footer>
    </div>
  );
}
