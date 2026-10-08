import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop, Logo } from "@/components/Backdrop";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: Layout,
});

const NAV = [
  { to: "/dashboard", label: "Overview" },
  { to: "/cameras", label: "Cameras" },
  { to: "/snapshots", label: "Hazard check" },
  { to: "/complaints", label: "Complaints" },
  { to: "/sensors", label: "Sensors" },
  { to: "/rules", label: "Rule assistant" },
] as const;

function Layout() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  }
  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
            <Link to="/">
              <Logo />
            </Link>
            <nav className="flex flex-wrap items-center gap-1 lg:ml-6">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="rounded-full px-4 py-2 text-[15px] text-muted-foreground hover:bg-glass"
                  activeProps={{ className: "bg-glass-strong text-foreground ring-1 ring-border" }}
                >
                  {n.label}
                </Link>
              ))}
              {me?.role === "admin" && (
                <Link
                  to="/users"
                  className="rounded-full px-4 py-2 text-[15px] text-muted-foreground hover:bg-glass"
                  activeProps={{ className: "bg-glass-strong text-foreground ring-1 ring-border" }}
                >
                  Users
                </Link>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-glass py-1 pl-1 pr-3 ring-1 ring-border">
                <div className="bg-ember-gradient grid size-8 place-items-center rounded-full text-sm font-bold text-accent-foreground">
                  {(me?.full_name || me?.username || "?").charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-foreground">{me?.full_name || me?.username || "…"}</p>
                  <p className="text-xs capitalize text-muted-foreground">{me?.role}</p>
                </div>
              </div>
              <button onClick={signOut} className="rounded-full px-3 py-2 text-sm text-muted-foreground ring-1 ring-border hover:bg-glass">
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
