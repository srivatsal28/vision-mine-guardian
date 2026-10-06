import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CameraPlayer, PageTitle, SeverityBadge, sensorState } from "@/components/kit";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — CoalGuard" },
      { name: "description", content: "Compliance score, cameras, sensor alerts and complaints at a glance." },
      { property: "og:title", content: "Overview — CoalGuard" },
      { property: "og:description", content: "Mine compliance at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const me = useMe();
  const { data } = useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const [c, s, cam] = await Promise.all([
        supabase.from("complaints").select("id,title,severity,status,created_at,analysis").order("created_at", { ascending: false }).limit(50),
        supabase.from("sensors").select("*"),
        supabase.from("cameras").select("*"),
      ]);
      return { complaints: c.data ?? [], sensors: s.data ?? [], cameras: cam.data ?? [] };
    },
  });
  const complaints = data?.complaints ?? [];
  const sensors = data?.sensors ?? [];
  const cameras = data?.cameras ?? [];
  const open = complaints.filter((c) => c.status !== "resolved");
  const critical = open.filter((c) => c.severity === "critical" || c.severity === "high").length;
  const alerts = sensors.filter((s) => sensorState(s.kind, Number(s.value), Number(s.safe_limit)).label !== "Safe").length;
  const score = Math.max(0, 100 - critical * 8 - (open.length - critical) * 3 - alerts * 5);
  const latest = complaints.find((c) => c.analysis) as (typeof complaints)[number] | undefined;
  const a = latest?.analysis as { summary?: string; violations?: { rule: string; source: string }[]; immediate_actions?: string[] } | null;

  return (
    <div>
      <PageTitle title={`Hello${me?.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}`} sub="Here is today's safety and compliance picture." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Compliance score", `${score}%`, score > 80 ? "text-success" : score > 60 ? "text-warning" : "text-destructive"],
          ["Open complaints", String(open.length), "text-foreground"],
          ["High-risk issues", String(critical), "text-destructive"],
          ["Sensor alerts", String(alerts), "text-accent"],
        ].map(([l, v, c]) => (
          <div key={l} className="glass-card p-5">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className={`mt-1 font-display text-4xl font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Latest AI analysis</h2>
            <Link to="/complaints" className="text-sm text-primary">All complaints →</Link>
          </div>
          {latest && a ? (
            <div className="mt-4 space-y-3">
              <div className="glass-tile p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Problem</p>
                <p className="mt-1 text-foreground">{latest.title} — {a.summary}</p>
              </div>
              {a.violations?.[0] && (
                <div className="glass-tile p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Rule applied</p>
                  <p className="mt-1 text-foreground">
                    <span className="font-mono text-primary">{a.violations[0].rule}</span> · {a.violations[0].source}
                  </p>
                </div>
              )}
              {a.immediate_actions?.[0] && (
                <div className="rounded-xl bg-accent/10 p-4 ring-1 ring-accent/30">
                  <p className="text-xs uppercase tracking-wider text-accent">Recommended solution</p>
                  <p className="mt-1 text-foreground">{a.immediate_actions[0]}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">No complaint has been analysed yet. File one on the Complaints page.</p>
          )}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-foreground">Sensors</h2>
          <div className="mt-4 space-y-3">
            {sensors.slice(0, 6).map((s) => {
              const st = sensorState(s.kind, Number(s.value), Number(s.safe_limit));
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{s.kind}</span>
                  <span className={`font-mono text-sm ${st.cls}`}>
                    {Number(s.value)} {s.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">My cameras</h2>
            <Link to="/cameras" className="text-sm text-primary">Connect a camera →</Link>
          </div>
          {cameras.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {cameras.slice(0, 2).map((c) => (
                <CameraPlayer key={c.id} url={c.stream_url} name={c.name} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">You have no cameras yet. Enter an access code on the Cameras page.</p>
          )}
        </div>
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-foreground">Recent complaints</h2>
          <div className="mt-4 space-y-3">
            {complaints.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-foreground">{c.title}</span>
                <SeverityBadge s={c.severity} />
              </div>
            ))}
            {!complaints.length && <p className="text-muted-foreground">No complaints yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
