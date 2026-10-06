import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, SeverityBadge, btnGhost, btnPrimary, inputCls } from "@/components/kit";
import { analyzeComplaint } from "@/lib/ai.functions";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints & AI Solutions — CoalGuard" },
      { name: "description", content: "File safety complaints and get AI solutions based on Indian mining law." },
      { property: "og:title", content: "Complaints & AI Solutions — CoalGuard" },
      { property: "og:description", content: "AI-checked complaint handling for coal mines." },
    ],
  }),
  component: Complaints,
});

type Analysis = {
  summary: string;
  severity: string;
  category: string;
  reasoning_steps: string[];
  violations: { rule: string; source: string; explanation: string }[];
  immediate_actions: string[];
  long_term_actions: string[];
  responsible_person: string;
  deadline: string;
};

const EXAMPLES = [
  "Methane level near Panel 6 reached 1.4% but work did not stop.",
  "No safety harness given to workers at height on the Shaft B gantry.",
  "Explosives were left in the open near the haul road overnight.",
];

function Complaints() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", description: "", location: "" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const { data: list = [] } = useQuery({
    queryKey: ["complaints"],
    queryFn: async () => (await supabase.from("complaints").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function run(id: string) {
    setBusyId(id);
    setOpenId(id);
    try {
      await analyzeComplaint({ data: { id } });
      toast.success("Analysis ready.");
      qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.from("complaints").insert({ ...f, created_by: me?.id ?? null }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setF({ title: "", description: "", location: "" });
    qc.invalidateQueries();
    run(data.id);
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("complaints").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries();
  }

  const shown = list.filter((c) => filter === "all" || c.status === filter);

  return (
    <div>
      <PageTitle title="Complaints and AI solutions" sub="The AI reads the matching mining rules first, then gives a clear solution." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="glass-card space-y-3 p-6">
          <h2 className="text-xl font-bold text-foreground">File a complaint</h2>
          <input className={inputCls} placeholder="Short title" required maxLength={150} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className={inputCls} placeholder="Location (e.g. Shaft 3)" maxLength={100} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
          <textarea className={`${inputCls} min-h-36`} placeholder="What happened? Give as much detail as you can." required maxLength={3000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <button className={`${btnPrimary} w-full`}>Submit and analyse</button>
          <div className="pt-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Try an example</p>
            {EXAMPLES.map((x) => (
              <button type="button" key={x} onClick={() => setF({ title: x.split(" ").slice(0, 6).join(" "), description: x, location: "" })} className="mt-2 block text-left text-sm text-primary hover:underline">
                {x}
              </button>
            ))}
          </div>
        </form>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {["all", "open", "analysed", "in progress", "resolved"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`${btnGhost} capitalize ${filter === s ? "bg-glass-strong" : ""}`}>{s}</button>
            ))}
          </div>
          {shown.length === 0 && <p className="text-muted-foreground">No complaints here.</p>}
          {shown.map((c) => {
            const a = c.analysis as Analysis | null;
            const open = openId === c.id;
            return (
              <div key={c.id} className="glass-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button onClick={() => setOpenId(open ? null : c.id)} className="text-left">
                    <p className="text-lg font-semibold text-foreground">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.location || "No location"} · {new Date(c.created_at).toLocaleString()} · <span className="capitalize">{c.status}</span>
                    </p>
                  </button>
                  <SeverityBadge s={c.severity} />
                </div>
                {open && (
                  <div className="mt-4 space-y-4">
                    <p className="text-foreground/90">{c.description}</p>
                    {busyId === c.id && (
                      <div className="glass-tile flex items-center gap-3 p-4 text-muted-foreground">
                        <span className="animate-softpulse size-2 rounded-full bg-primary" /> Reading the mining rules and thinking…
                      </div>
                    )}
                    {a && busyId !== c.id && <AnalysisView a={a} />}
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busyId === c.id} onClick={() => run(c.id)} className={btnGhost}>{a ? "Analyse again" : "Analyse with AI"}</button>
                      {(me?.role === "admin" || me?.role === "officer" || c.created_by === me?.id) && (
                        <>
                          <button onClick={() => setStatus(c.id, "in progress")} className={btnGhost}>Mark in progress</button>
                          <button onClick={() => setStatus(c.id, "resolved")} className={btnGhost}>Mark resolved</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AnalysisView({ a }: { a: Analysis }) {
  return (
    <div className="space-y-3">
      <div className="glass-tile p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Summary · {a.category}</p>
        <p className="mt-1 text-foreground">{a.summary}</p>
      </div>
      <details className="glass-tile p-4">
        <summary className="cursor-pointer text-sm font-medium text-primary">How the AI thought about it ({a.reasoning_steps.length} steps)</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {a.reasoning_steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </details>
      {a.violations.length > 0 && (
        <div className="glass-tile p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Rules involved</p>
          <ul className="mt-2 space-y-2">
            {a.violations.map((v, i) => (
              <li key={i} className="text-sm">
                <span className="font-mono text-primary">{v.rule}</span> <span className="text-muted-foreground">· {v.source}</span>
                <p className="text-foreground/90">{v.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl bg-accent/10 p-4 ring-1 ring-accent/30">
        <p className="text-xs uppercase tracking-wider text-accent">Do this now</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">{a.immediate_actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <p className="mt-3 text-xs uppercase tracking-wider text-accent">Long-term fixes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground/90">{a.long_term_actions.map((x, i) => <li key={i}>{x}</li>)}</ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Responsible: <span className="text-foreground">{a.responsible_person}</span> · Deadline: <span className="text-foreground">{a.deadline}</span>
        </p>
      </div>
    </div>
  );
}
