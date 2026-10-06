import { createFileRoute, Link } from "@tanstack/react-router";
import { Backdrop, Logo } from "@/components/Backdrop";
import mineFeed from "@/assets/mine-feed.jpg";
import anthracite from "@/assets/anthracite.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CoalGuard — AI Governance & Compliance for Coal Mines" },
      { name: "description", content: "Watch CCTV feeds, track sensors and get AI solutions for complaints, checked against Indian mining law." },
      { property: "og:title", content: "CoalGuard — AI Governance & Compliance for Coal Mines" },
      { property: "og:description", content: "Smart, AI-based compliance monitoring for coal mines in India." },
    ],
  }),
  component: Landing,
});

const LAWS = [
  ["Mines Act", "1952"],
  ["Mines Rules", "1955"],
  ["Explosives Rules", "2008"],
  ["CEA Safety Regulations", "2023"],
  ["OSH Code", "2020"],
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Backdrop />
      <div className="relative z-10">
        <header className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-5">
          <Logo />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full bg-glass px-3 py-1.5 text-sm ring-1 ring-border sm:flex">
              <span className="animate-softpulse size-2 rounded-full bg-success" /> System online
            </span>
            <Link to="/login" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-glow">
              Sign in
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 pb-14 pt-10">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-5">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-glass px-3 py-1 text-sm text-primary ring-1 ring-primary/30">
                <span className="size-1.5 rounded-full bg-primary" /> AI compliance engine
              </span>
              <h1 className="mt-5 text-5xl font-extrabold leading-[1.08] text-foreground lg:text-6xl">
                Safer mines with AI that <span className="text-primary">checks the rules</span> first.
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground">
                CoalGuard reads Indian mining laws, watches your CCTV cameras and sensors, and gives clear solutions for every complaint.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/dashboard" className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow">
                  Open dashboard
                </Link>
              </div>
              <div className="mt-9 flex gap-8">
                {[
                  ["5", "Laws studied"],
                  ["1,000+", "Rule sections"],
                  ["24/7", "Monitoring"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <p className="font-display text-3xl font-bold text-foreground">{v}</p>
                    <p className="text-sm text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 shadow-2xl lg:col-span-7">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">Live feed · Shaft 3, North Face</p>
                <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive ring-1 ring-destructive/30">● REC</span>
              </div>
              <div className="relative mt-4 overflow-hidden rounded-xl ring-1 ring-border">
                <img src={mineFeed} alt="Underground coal conveyor tunnel" width={1088} height={608} className="w-full" />
                <div className="animate-scan pointer-events-none absolute inset-x-0 h-px bg-primary/70" />
                <div className="absolute bottom-3 left-3 rounded bg-background/70 px-2 py-1 font-mono text-xs text-foreground">
                  Methane 0.38% · Dust 2.4 mg/m³
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[
                  ["0.38%", "Methane", "text-success"],
                  ["2.4", "Dust mg/m³", "text-accent"],
                  ["4", "Workers", "text-primary"],
                  ["OK", "Safety gear", "text-foreground"],
                ].map(([v, l, c]) => (
                  <div key={l} className="glass-tile p-3">
                    <p className={`font-mono text-lg ${c}`}>{v}</p>
                    <p className="text-xs text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Coal detailing */}
        <section className="mx-auto max-w-7xl px-6 pb-14">
          <div className="glass-card relative overflow-hidden">
            <img src={anthracite} alt="Polished anthracite coal" loading="lazy" width={1280} height={720} className="absolute inset-0 h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
            {[10, 28, 46, 64].map((l, i) => (
              <span key={l} className="animate-ember absolute bottom-6 size-1.5 rounded-full bg-accent" style={{ left: `${l + 20}%`, animationDelay: `${i * 1.4}s` }} />
            ))}
            <div className="relative max-w-xl p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Black diamond</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground">Coal powers about 70% of India's electricity.</h2>
              <p className="mt-4 text-muted-foreground">
                Formed over 300 million years from ancient forests, coal is mined in layers called seams. Every tonne brought to the surface should come with
                safe air, safe blasting and safe workers. CoalGuard helps you keep that promise.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  ["Anthracite", "Highest carbon"],
                  ["Bituminous", "Most common"],
                  ["Lignite", "Brown coal"],
                ].map(([a, b]) => (
                  <div key={a} className="glass-tile p-3">
                    <p className="font-semibold text-foreground">{a}</p>
                    <p className="text-xs text-muted-foreground">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              ["AI complaint solutions", "Write a complaint. The AI thinks step by step, finds the matching rules and gives actions with deadlines."],
              ["CCTV by access code", "Each camera has its own secret code. Enter the code to add the live feed to your dashboard."],
              ["Personal logins", "The administrator creates a username and password for every person, with a role and site."],
            ].map(([t, d]) => (
              <div key={t} className="glass-card p-6">
                <h3 className="text-xl font-bold text-foreground">{t}</h3>
                <p className="mt-2 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 glass-card flex flex-wrap items-center gap-3 p-6">
            <p className="mr-2 font-semibold text-foreground">Rule library:</p>
            {LAWS.map(([n, y]) => (
              <span key={n} className="rounded-full bg-glass px-3 py-1 text-sm ring-1 ring-border">
                {n} <span className="font-mono text-accent">{y}</span>
              </span>
            ))}
          </div>
        </section>

        <footer className="mx-auto max-w-7xl px-6 pb-10">
          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
            <p>© 2026 CoalGuard · Governance and compliance for coal mines</p>
            <p>Based on Indian mining laws</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
