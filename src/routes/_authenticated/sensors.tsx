import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageTitle, btnGhost, isMinLimit, sensorState } from "@/components/kit";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/sensors")({
  head: () => ({
    meta: [
      { title: "Sensors — CoalGuard" },
      { name: "description", content: "Gas, dust, oxygen, temperature and airflow readings with safe limits." },
      { property: "og:title", content: "Sensors — CoalGuard" },
      { property: "og:description", content: "Live mine sensor monitoring." },
    ],
  }),
  component: Sensors,
});

function Sensors() {
  const me = useMe();
  const qc = useQueryClient();
  const [live, setLive] = useState(true);
  const [jitter, setJitter] = useState<Record<string, number>>({});
  const { data: sensors = [] } = useQuery({
    queryKey: ["sensors"],
    queryFn: async () => (await supabase.from("sensors").select("*").order("name")).data ?? [],
  });

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setJitter(Object.fromEntries(sensors.map((s) => [s.id, 1 + (Math.random() - 0.5) * 0.08])));
    }, 2000);
    return () => clearInterval(t);
  }, [live, sensors]);

  async function edit(id: string, current: number) {
    const v = prompt("New reading:", String(current));
    if (v === null || isNaN(Number(v))) return;
    const { error } = await supabase.from("sensors").update({ value: Number(v), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message);
    qc.invalidateQueries();
  }

  return (
    <div>
      <PageTitle
        title="Sensors"
        sub="Readings are compared with safe limits. Values move slightly in live view to show how alerts react."
        right={<button onClick={() => setLive(!live)} className={btnGhost}>{live ? "Pause live view" : "Resume live view"}</button>}
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {sensors.map((s) => {
          const value = Math.round(Number(s.value) * (live ? jitter[s.id] ?? 1 : 1) * 100) / 100;
          const limit = Number(s.safe_limit);
          const st = sensorState(s.kind, value, limit);
          const pct = Math.min(100, (isMinLimit(s.kind) ? limit / value : value / limit) * 100);
          return (
            <div key={s.id} className="glass-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{s.kind}</p>
                  <p className="text-sm text-muted-foreground">{s.location}</p>
                </div>
                <span className={`text-sm font-semibold ${st.cls}`}>{st.label}</span>
              </div>
              <p className={`mt-4 font-mono text-4xl ${st.cls}`}>
                {value}
                <span className="ml-1 text-lg text-muted-foreground">{s.unit}</span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-glass">
                <div className={`h-full rounded-full ${st.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                <span>{isMinLimit(s.kind) ? "Minimum" : "Limit"}: {limit} {s.unit}</span>
                {me?.role === "admin" && <button onClick={() => edit(s.id, Number(s.value))} className="text-primary">Update</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
