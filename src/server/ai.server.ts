import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import chunks from "./regulations.json";

type Chunk = { s: string; t: string };
const DOCS = chunks as Chunk[];

const STOP = new Set(
  "the of and to in a is for be or by on with as any shall that this at an are from such which it may not all have has was were under said other than".split(" "),
);
function tokens(text: string) {
  return text.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((w) => !STOP.has(w)) ?? [];
}

let index: { tf: Map<string, number>[]; df: Map<string, number> } | null = null;
function getIndex() {
  if (index) return index;
  const df = new Map<string, number>();
  const tf = DOCS.map((d) => {
    const m = new Map<string, number>();
    for (const w of tokens(d.t)) m.set(w, (m.get(w) ?? 0) + 1);
    for (const w of m.keys()) df.set(w, (df.get(w) ?? 0) + 1);
    return m;
  });
  index = { tf, df };
  return index;
}

export function searchRules(query: string, k = 10) {
  const { tf, df } = getIndex();
  const q = [...new Set(tokens(query))];
  const N = DOCS.length;
  const scored = tf.map((m, i) => {
    let s = 0;
    for (const w of q) {
      const f = m.get(w);
      if (f) s += (1 + Math.log(f)) * Math.log(N / (df.get(w) ?? 1));
    }
    return { i, s };
  });
  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => ({ source: DOCS[x.i]!.s, text: DOCS[x.i]!.t, score: Math.round(x.s * 10) / 10 }));
}

const analysisSchema = z.object({
  summary: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.string(),
  reasoning_steps: z.array(z.string()),
  violations: z.array(z.object({ rule: z.string(), source: z.string(), explanation: z.string() })),
  immediate_actions: z.array(z.string()),
  long_term_actions: z.array(z.string()),
  responsible_person: z.string(),
  deadline: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;

function provider() {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured yet.");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

const OPTS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "medium",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

function friendly(err: unknown): never {
  const status = (err as { statusCode?: number })?.statusCode;
  if (status === 429) throw new Error("Too many requests right now. Please wait a moment and try again.");
  if (status === 402) throw new Error("AI credits are used up. Please add credits in your workspace settings.");
  throw err instanceof Error ? err : new Error("AI analysis failed.");
}

function context(q: string) {
  return searchRules(q, 10)
    .map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`)
    .join("\n\n");
}

export async function analyzeWithAI(input: { title: string; description: string; location: string }) {
  const q = `${input.title} ${input.description}`;
  const rules = context(q);
  try {
    const result = streamText({
      model: provider().responses("openai/gpt-6-astra"),
      system:
        "You are a senior mining safety and compliance officer in India. Think step by step before answering. " +
        "Analyse the complaint ONLY against the regulation excerpts given (Mines Act 1952, Mines Rules 1955, Explosives Rules 2008, CEA Safety Regulations 2023, OSH Code 2020). " +
        "Cite the section or rule number exactly as it appears in the excerpts. If the excerpts do not cover it, say so instead of guessing. " +
        "Write in simple, clear English with short sentences. No spelling mistakes.",
      prompt: `COMPLAINT\nTitle: ${input.title}\nLocation: ${input.location || "Not given"}\nDetails: ${input.description}\n\nREGULATION EXCERPTS\n${rules}`,
      output: Output.object({ schema: analysisSchema }),
      providerOptions: OPTS,
    });
    return (await result.output) as Analysis;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      try {
        return JSON.parse(err.text) as Analysis;
      } catch {
        /* fall through */
      }
    }
    friendly(err);
  }
}

export async function askRulesAI(question: string) {
  const hits = searchRules(question, 8);
  const rules = hits.map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`).join("\n\n");
  try {
    const result = streamText({
      model: provider().responses("openai/gpt-6-astra"),
      system:
        "You answer questions about Indian mining law using ONLY the excerpts given. Think carefully first. " +
        "Answer in simple English, using short paragraphs or bullet points. Cite the act and section/rule number. " +
        "If the excerpts do not answer the question, say that clearly.",
      prompt: `QUESTION: ${question}\n\nEXCERPTS\n${rules}`,
      providerOptions: OPTS,
    });
    const answer = await result.text;
    return { answer, sources: hits.slice(0, 5).map((h) => ({ source: h.source, text: h.text.slice(0, 400) })) };
  } catch (err) {
    friendly(err);
  }
}
