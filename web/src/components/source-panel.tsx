import type { SourceCheck } from "@/lib/api";
import { Panel } from "./panel";

export function SourcePanel({ sources }: { sources: SourceCheck[] }) {
  return (
    <Panel title="Source reputation" aside="Domain lookup">
      <ul className="grid gap-px bg-rule sm:grid-cols-2">
        {sources.map((s) => (
          <li key={s.source} className="bg-paper py-1 sm:px-0 sm:odd:pr-6 sm:even:pl-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-medium">{s.source}</span>
              <span className={`font-mono text-xs uppercase tracking-[0.12em] ${s.found ? "text-fake" : "text-muted"}`}>
                {s.found ? "Listed" : "Not listed"}
              </span>
            </div>
            {s.found && (
              <div className="mt-3 space-y-2 text-sm leading-snug">
                {s.category && <p className="label !text-fake">{s.category}</p>}
                {s.description && <p>{s.description}</p>}
                {s.notes && <p className="text-muted">{s.notes}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
