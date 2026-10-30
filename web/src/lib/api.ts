const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ModelStatus = "loading" | "ready" | "unavailable";
export type Label = "fake" | "real";

export interface ModelInfo {
  id: string;
  name: string;
  architecture: string;
  accuracy: number | null;
  trained_on: string;
  status: ModelStatus;
  error: string | null;
}

export interface Article {
  title: string | null;
  authors: string[];
  publish_date: string | null;
  top_image: string | null;
  text: string;
  summary: string | null;
  keywords: string[];
}

export interface Verdict {
  label: Label;
  p_fake: number;
  confidence: number;
}

export interface ModelResult {
  id: string;
  name: string;
  architecture: string;
  p_fake: number;
  label: Label;
  accuracy: number | null;
  latency_ms: number;
}

export interface SourceCheck {
  source: "OpenSources" | "Fake News Site DB";
  found: boolean;
  category: string | null;
  description: string | null;
  notes: string | null;
}

export interface VirusTotal {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  engines: { name: string; category: string; result: string }[];
}

export interface AnalyzeResponse {
  input: { kind: "url" | "text"; url: string | null; domain: string | null };
  article: Article | null;
  verdict: Verdict | null;
  models: ModelResult[];
  sources: SourceCheck[];
  virustotal: VirusTotal | null;
  warnings: string[];
}

export type AnalyzeInput = { url: string } | { text: string };

export const MAX_TEXT = 50_000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, init);
  } catch {
    throw new Error("Cannot reach the API. Check that the server is running.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg: string }) => d.msg).join("; ")
          : `Request failed (${res.status}).`,
    );
  }
  return res.json();
}

export const getModels = () => request<ModelInfo[]>("/api/models");

export const analyze = (input: AnalyzeInput) =>
  request<AnalyzeResponse>("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: null, text: null, ...input }),
  });
