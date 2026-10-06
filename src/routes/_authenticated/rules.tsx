import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageTitle, btnPrimary, inputCls } from "@/components/kit";
import { askRules } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/rules")({
  head: () => ({
    meta: [
      { title: "Rule Assistant — CoalGuard" },
      { name: "description", content: "Ask questions about the Mines Act, Mines Rules, Explosives Rules, CEA Regulations and OSH Code." },
      { property: "og:title", content: "Rule Assistant — CoalGuard" },
      { property: "og:description", content: "AI answers about Indian mining law with sources." },
    ],
  }),
  component: Rules,
});

const SAMPLES = [
  "What are the working hour limits for workers below ground?",
  "Who must be informed after a fatal accident in a mine?",
  "How should explosives be stored in a magazine?",
];

function Rules() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ answer: string; sources: { source: string; text: string }[] } | null>(null);

  async function ask(question: string) {
    setBusy(true);
    setRes(null);
    try {
      setRes((await askRules({ data: { question } })) ?? null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle title="Rule assistant" sub="Ask any question. The AI answers only from the five mining laws you uploaded." />
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="glass-card flex flex-col gap-3 p-6 sm:flex-row">
        <input className={inputCls} placeholder="Type your question…" value={q} onChange={(e) => setQ(e.target.value)} required />
        <button disabled={busy} className={btnPrimary}>{busy ? "Thinking…" : "Ask"}</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s} onClick={() => { setQ(s); ask(s); }} className="rounded-full bg-glass px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border hover:text-foreground">
            {s}
          </button>
        ))}
      </div>
      {busy && <p className="mt-6 text-muted-foreground">Searching the rule books and thinking…</p>}
      {res && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="glass-card whitespace-pre-wrap p-6 text-foreground lg:col-span-2">{res.answer}</div>
          <div className="glass-card p-6">
            <p className="font-semibold text-foreground">Sources used</p>
            <div className="mt-3 space-y-3">
              {res.sources.map((s, i) => (
                <details key={i} className="glass-tile p-3">
                  <summary className="cursor-pointer text-sm text-primary">{s.source}</summary>
                  <p className="mt-2 text-xs text-muted-foreground">{s.text}…</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
