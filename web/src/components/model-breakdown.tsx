"use client";

import { motion } from "motion/react";
import { Info } from "lucide-react";
import type { ModelInfo, ModelResult } from "@/lib/api";
import { pct } from "@/lib/format";
import { Panel } from "./panel";

function Bar({ value, tone, delay }: { value: number; tone: "fake" | "real"; delay: number }) {
  return (
    <div className="relative h-1.5 bg-rule" role="img" aria-label={`P(fake) ${pct(value)}`}>
      <motion.div
        className={`h-full origin-left ${tone === "fake" ? "bg-fake" : "bg-real"}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: value }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
      <span className="absolute -top-1 left-1/2 h-3.5 w-px bg-ink" aria-hidden />
    </div>
  );
}

const ROW = "md:grid md:grid-cols-[minmax(0,1.3fr)_4.5rem_minmax(0,2fr)_4rem_4.5rem] md:items-center md:gap-6";

export function ModelBreakdown({ models, catalog }: { models: ModelResult[]; catalog: ModelInfo[] | null }) {
  return (
    <Panel title="Model breakdown" aside="Midline = 50%">
      <div className={`hidden pb-3 ${ROW} label border-b border-rule`}>
        <span>Model</span>
        <span>Accuracy</span>
        <span>P(fake)</span>
        <span>Label</span>
        <span className="text-right">Latency</span>
      </div>
      <ul>
        {models.map((m, i) => {
          const trainedOn = catalog?.find((c) => c.id === m.id)?.trained_on;
          const tone = m.label;
          return (
            <li key={m.id} className={`relative border-b border-rule py-4 ${ROW}`}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{m.name}</span>
                <span className="font-mono text-xs text-muted">{m.architecture}</span>
                {trainedOn && (
                  <span className="group/tip">
                    <button type="button" aria-label={`Training data for ${m.name}`} className="grid size-5 place-items-center text-muted hover:text-ink">
                      <Info className="size-3.5" aria-hidden />
                    </button>
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-64 max-w-full border border-rule bg-paper p-3 text-xs leading-snug text-muted opacity-0 shadow-lg transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100"
                    >
                      <span className="label mb-1.5 block">Trained on</span>
                      {trainedOn}
                    </span>
                  </span>
                )}
              </div>
              <span className="mt-1 block font-mono text-xs text-muted md:mt-0 md:text-sm md:text-ink">
                <span className="md:hidden">Accuracy </span>
                {m.accuracy === null ? "—" : pct(m.accuracy, 1)}
              </span>
              <div className="my-3 flex items-center gap-3 md:my-0">
                <div className="flex-1">
                  <Bar value={m.p_fake} tone={tone} delay={0.3 + i * 0.1} />
                </div>
                <span className="w-10 text-right font-mono text-sm">{pct(m.p_fake)}</span>
              </div>
              <div className="flex justify-between md:contents">
                <span className={`font-mono text-xs uppercase tracking-[0.12em] ${tone === "fake" ? "text-fake" : "text-real"}`}>{m.label}</span>
                <span className="font-mono text-xs text-muted md:text-right">{m.latency_ms} ms</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
