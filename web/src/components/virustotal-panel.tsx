import type { VirusTotal } from "@/lib/api";
import { Panel } from "./panel";

const SEGMENTS = [
  { key: "malicious", label: "Malicious", color: "bg-fake" },
  { key: "suspicious", label: "Suspicious", color: "bg-warn" },
  { key: "harmless", label: "Harmless", color: "bg-real" },
  { key: "undetected", label: "Undetected", color: "bg-muted/50" },
] as const;

export function VirusTotalPanel({ data }: { data: VirusTotal }) {
  const total = SEGMENTS.reduce((n, s) => n + data[s.key], 0);
  return (
    <Panel title="VirusTotal" aside={`${total} engines`}>
      <div className="flex h-2 gap-px bg-rule" role="img" aria-label={SEGMENTS.map((s) => `${data[s.key]} ${s.label.toLowerCase()}`).join(", ")}>
        {SEGMENTS.map((s) => (
          <div key={s.key} className={s.color} style={{ width: `${total ? (data[s.key] / total) * 100 : 0}%` }} />
        ))}
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`size-2 ${s.color}`} aria-hidden />
            <dt className="text-sm text-muted">{s.label}</dt>
            <dd className="font-mono text-sm">{data[s.key]}</dd>
          </div>
        ))}
      </dl>
      {data.engines.length > 0 && (
        <ul tabIndex={0} aria-label="Engine results" className="mt-5 max-h-48 divide-y divide-rule overflow-auto border-y border-rule font-mono text-xs">
          {data.engines.map((e) => (
            <li key={e.name} className="grid grid-cols-[1fr_auto_1fr] gap-4 py-2">
              <span>{e.name}</span>
              <span className={e.category === "malicious" ? "text-fake" : e.category === "suspicious" ? "text-warn" : "text-muted"}>{e.category}</span>
              <span className="truncate text-right text-muted">{e.result}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
