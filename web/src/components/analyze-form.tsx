"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { MAX_TEXT, type AnalyzeInput } from "@/lib/api";
import { useTextBox, useTextareaHeight } from "./pretext-lines";

type Mode = "url" | "text";

const TABS: { id: Mode; label: string }[] = [
  { id: "url", label: "Article URL" },
  { id: "text", label: "Paste text" },
];

const EXAMPLES: { label: string; mode: Mode; value: string }[] = [
  { label: "bbc.com/news", mode: "url", value: "https://www.bbc.com/news" },
  {
    label: "Miracle cure",
    mode: "text",
    value:
      "SHOCKING: Scientists confirm that drinking lemon water every morning cures all forms of cancer, but big pharma is hiding the truth to protect its profits. Share this before it gets deleted!",
  },
  {
    label: "Rate decision",
    mode: "text",
    value:
      "The central bank held interest rates steady on Wednesday, saying inflation had eased to 2.8 percent over the previous quarter but remained above its target. Officials said future decisions would depend on incoming data.",
  },
];

export function AnalyzeForm({ busy, onSubmit }: { busy: boolean; onSubmit: (input: AnalyzeInput) => void }) {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const id = useId();
  const [areaRef, box] = useTextBox<HTMLTextAreaElement>();
  const areaHeight = useTextareaHeight(text, box, 5, 14);

  const value = mode === "url" ? url.trim() : text.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSubmit(mode === "url" ? { url: value } : { text: value });
      }}
    >
      <div role="tablist" aria-label="Input type" className="flex gap-6 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${id}-tab-${t.id}`}
            aria-selected={mode === t.id}
            aria-controls={`${id}-panel`}
            onClick={() => setMode(t.id)}
            className={`relative pb-3 font-mono text-xs uppercase tracking-[0.12em] transition-colors ${mode === t.id ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {t.label}
            {mode === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 bg-ink" />}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${mode}`} className="pt-5">
        {mode === "url" ? (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/news/story"
            aria-label="Article URL"
            autoComplete="off"
            spellCheck={false}
            className="w-full border border-rule bg-surface px-4 py-3.5 font-mono text-sm outline-none placeholder:text-muted focus:border-ink"
          />
        ) : (
          <>
            <textarea
              ref={areaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_TEXT}
              placeholder="Paste the article body or a headline and lede."
              aria-label="Article text"
              style={{ height: areaHeight === undefined ? undefined : areaHeight + 32 }}
              className="block min-h-40 w-full resize-none border border-rule bg-surface px-4 py-4 text-base leading-6 outline-none placeholder:text-muted focus:border-ink"
            />
            <p className="mt-2 text-right font-mono text-xs text-muted" aria-live="off">
              {text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}
            </p>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label mr-1">Try</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setMode(ex.mode);
                (ex.mode === "url" ? setUrl : setText)(ex.value);
              }}
              className="border border-rule px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-ink hover:text-ink"
            >
              {ex.label}
            </button>
          ))}
        </div>
        <motion.button
          type="submit"
          disabled={busy || !value}
          whileHover={{ x: 3 }}
          className="inline-flex items-center gap-2 bg-ink px-6 py-3 text-sm font-medium text-paper transition-opacity disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {busy ? "Analyzing" : "Analyze"}
          {!busy && <ArrowRight className="size-4" aria-hidden />}
        </motion.button>
      </div>
    </form>
  );
}
