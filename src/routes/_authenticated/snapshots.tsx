import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeSnapshot } from "@/lib/ai.functions";
import { PageTitle, SeverityBadge, btnPrimary, inputCls } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/snapshots")({
  head: () => ({
    meta: [
      { title: "CCTV Hazard Check — CoalGuard" },
      { name: "description", content: "Upload a CCTV snapshot to find visible hazards, matching mining rules and corrective actions." },
      { property: "og:title", content: "CCTV Hazard Check — CoalGuard" },
      { property: "og:description", content: "AI hazard detection on mine CCTV snapshots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Snapshots,
});

type Report = Awaited<ReturnType<typeof analyzeSnapshot>>;

function Snapshots() {
  const run = useServerFn(analyzeSnapshot);
  const [image, setImage] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  function pick(f?: File) {
    if (!f) return;
    if (f.size > 5_000_000) return setErr("Image is too large (max 5 MB).");
    const r = new FileReader();
    r.onload = () => { setImage(String(r.result)); setReport(null); setErr(""); };
    r.readAsDataURL(f);
  }

  async function submit() {
    setBusy(true); setErr("");
    try { setReport(await run({ data: { image, notes, location } })); }
    catch (e) { setErr(e instanceof Error ? e.message : "Analysis failed."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageTitle title="CCTV hazard check" sub="Upload a camera snapshot. The AI lists visible hazards, the rule each one breaks, and what to fix." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card space-y-4 p-6">
          <label className="block cursor-pointer rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground hover:bg-glass">
            {image ? <img src={image} alt="Snapshot" className="mx-auto max-h-80 rounded-lg" /> : "Click to choose a snapshot (PNG, JPG, WEBP)"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          <input className={inputCls} placeholder="Location (e.g. Pit 3, haul road)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <textarea className={inputCls} rows={3} placeholder="Notes for the inspector (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className={btnPrimary} disabled={!image || busy} onClick={submit}>
            {busy ? "Analysing… (can take a minute)" : "Analyse snapshot"}
          </button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <div className="glass-card p-6">
          {!report ? (
            <p className="text-muted-foreground">Results will appear here.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-foreground">Findings</h2>
                <SeverityBadge s={report.overall_risk} />
              </div>
              <p className="text-foreground">{report.summary}</p>
              {report.hazards.length === 0 && <p className="text-success">No visible hazards found.</p>}
              {report.hazards.map((h, i) => (
                <div key={i} className="glass-tile space-y-1 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{h.hazard}</p>
                    <SeverityBadge s={h.severity} />
                  </div>
                  <p className="text-sm text-muted-foreground">Where: {h.where_in_image}</p>
                  <p className="text-sm text-foreground"><span className="font-mono text-primary">{h.rule}</span> · {h.source}</p>
                  <p className="text-sm text-foreground">Fix: {h.corrective_action}</p>
                </div>
              ))}
              {report.immediate_actions.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Immediate actions</p>
                  <ul className="mt-1 list-disc pl-5 text-foreground">
                    {report.immediate_actions.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
