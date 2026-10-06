import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Backdrop, Logo } from "@/components/Backdrop";
import { needsSetup, setupFirstAdmin, usernameToEmail } from "@/lib/admin.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CoalGuard" },
      { name: "description", content: "Sign in to the CoalGuard compliance dashboard with your username and password." },
      { property: "og:title", content: "Sign in — CoalGuard" },
      { property: "og:description", content: "Secure sign in for mine staff." },
    ],
  }),
  component: Login,
});

const inputCls = "w-full rounded-xl bg-glass px-4 py-3 text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/60 focus:ring-primary";

function Login() {
  const nav = useNavigate();
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ username: "", password: "", full_name: "" });

  useEffect(() => {
    needsSetup().then((r) => setSetup(r.needsSetup)).catch(() => {});
    supabase.auth.getSession().then(({ data }) => data.session && nav({ to: "/dashboard", replace: true }));
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (setup) {
        await setupFirstAdmin({ data: f });
        toast.success("Admin account created.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(f.username), password: f.password });
      if (error) throw new Error(error.message.includes("banned") ? "This account is locked. Contact your administrator." : "Wrong username or password.");
      nav({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <Backdrop />
      <form onSubmit={submit} className="glass-card relative z-10 w-full max-w-md space-y-4 p-8">
        <Logo />
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-foreground">{setup ? "Create the first admin" : "Welcome back"}</h1>
          <p className="mt-1 text-muted-foreground">
            {setup ? "No accounts exist yet. This admin can create logins for everyone else." : "Sign in with the username and password given by your administrator."}
          </p>
        </div>
        {setup && (
          <input className={inputCls} placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
        )}
        <input className={inputCls} placeholder="Username" autoComplete="username" required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <input className={inputCls} placeholder="Password" type="password" autoComplete={setup ? "new-password" : "current-password"} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {busy ? "Please wait…" : setup ? "Create admin and sign in" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
