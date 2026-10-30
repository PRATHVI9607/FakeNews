"use client";

import { useState } from "react";
import type { Article, Label } from "@/lib/api";
import { Panel } from "./panel";
import { PretextLines } from "./pretext-lines";

function formatDate(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString(undefined, { dateStyle: "long" });
}

export function ArticlePanel({ article, label }: { article: Article; label: Label | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = article.top_image && !imageFailed;
  const meta = [article.authors.join(", "), article.publish_date && formatDate(article.publish_date)].filter(Boolean);

  return (
    <Panel title="Extracted article">
      <div className={showImage ? "grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1fr)_16rem]" : undefined}>
        <div className="min-w-0">
          {article.title && (
            <PretextLines as="h4" text={article.title} mark={label === "fake"} delay={0.2} className="font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl" />
          )}
          {meta.length > 0 && <p className="mt-4 font-mono text-xs text-muted">{meta.join("  ·  ")}</p>}
          {article.summary && <PretextLines text={article.summary} delay={0.5} className="mt-5 max-w-2xl text-base leading-7" />}
          {article.keywords.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Keywords">
              {article.keywords.map((k) => (
                <li key={k} className="border border-rule px-2.5 py-1 font-mono text-xs text-muted">
                  {k}
                </li>
              ))}
            </ul>
          )}
        </div>
        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element -- remote host unknown, image optimization is off
          <img src={article.top_image!} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} className="aspect-4/3 w-full self-start border border-rule object-cover" />
        )}
      </div>
      {article.text && (
        <details className="group mt-8 border-t border-rule">
          <summary className="label cursor-pointer py-4 select-none hover:!text-ink">
            <span className="group-open:hidden">Show full text</span>
            <span className="hidden group-open:inline">Hide full text</span>
          </summary>
          <p className="max-h-96 max-w-2xl overflow-auto whitespace-pre-wrap pr-4 text-sm leading-7 text-muted" tabIndex={0}>
            {article.text}
          </p>
        </details>
      )}
    </Panel>
  );
}
