"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import type { AnalyzeResponse } from "@/lib/api";
import { reveal } from "@/lib/motion";
import { pct } from "@/lib/format";
import { PretextLines } from "./pretext-lines";

function CountUp({ to }: { to: number }) {
  const value = useMotionValue(0);
  const text = useTransform(value, (v) => Math.round(v).toString());
  const reduce = useReducedMotion();
  useEffect(() => {
    const controls = animate(value, to, { duration: reduce ? 0 : 1.3, delay: 0.25, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [to, value, reduce]);
  return <motion.tspan>{text}</motion.tspan>;
}

function Gauge({ pFake, tone }: { pFake: number; tone: "fake" | "real" }) {
  return (
    <figure className="w-full max-w-xs">
      <svg viewBox="0 0 200 120" role="img" aria-label={`Fake probability ${pct(pFake)}`} className="w-full overflow-visible">
        <path d="M10 100A90 90 0 0 1 190 100" fill="none" strokeWidth="10" className="stroke-rule" />
        <motion.path
          d="M10 100A90 90 0 0 1 190 100"
          fill="none"
          strokeWidth="10"
          pathLength={1}
          className={tone === "fake" ? "stroke-fake" : "stroke-real"}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pFake }}
          transition={{ duration: 1.3, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
        <line x1="100" y1="-4" x2="100" y2="22" strokeWidth="1.5" className="stroke-ink" />
        <text x="100" y="86" textAnchor="middle" className="fill-ink font-serif text-[54px]">
          <CountUp to={pFake * 100} />
          <tspan className="fill-muted text-[20px]">%</tspan>
        </text>
        <text x="100" y="108" textAnchor="middle" className="fill-muted font-mono text-[8px] uppercase tracking-[0.14em]">
          mean P(fake)
        </text>
        <text x="10" y="120" textAnchor="middle" className="fill-muted font-mono text-[8px] uppercase tracking-[0.14em]">Real</text>
        <text x="190" y="120" textAnchor="middle" className="fill-muted font-mono text-[8px] uppercase tracking-[0.14em]">Fake</text>
      </svg>
    </figure>
  );
}

export function Verdict({ result }: { result: AnalyzeResponse }) {
  const { verdict, input } = result;
  const subject = input.domain ?? "Pasted text";

  if (!verdict) {
    return (
      <motion.section variants={reveal} aria-live="polite">
        <p className="label">{subject}</p>
        <h2 className="mt-3 font-serif text-5xl leading-none tracking-tight sm:text-6xl">No model verdict</h2>
        <p className="mt-4 max-w-lg text-muted">No model could score this input. Details are listed below.</p>
      </motion.section>
    );
  }

  const tone = verdict.label;
  return (
    <motion.section variants={reveal} aria-live="polite" className="grid items-center gap-10 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <p className="label">{subject}</p>
        <PretextLines
          as="h2"
          text={tone === "fake" ? "Likely fake" : "Likely real"}
          mark={tone === "fake"}
          className={`mt-3 font-serif text-7xl leading-[1] tracking-tight sm:text-8xl ${tone === "fake" ? "text-fake" : "text-real"}`}
        />
        <dl className="mt-6 flex gap-10">
          <div>
            <dt className="label">Confidence</dt>
            <dd className="mt-2 font-mono text-xl">{pct(verdict.confidence)}</dd>
          </div>
          <div>
            <dt className="label">Models agreeing</dt>
            <dd className="mt-2 font-mono text-xl">
              {result.models.filter((m) => m.label === verdict.label).length}/{result.models.length}
            </dd>
          </div>
        </dl>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted">
          A machine-learning signal about writing style and content, not a fact-check. Verify important claims with primary sources.
        </p>
      </div>
      <Gauge pFake={verdict.p_fake} tone={tone} />
    </motion.section>
  );
}
