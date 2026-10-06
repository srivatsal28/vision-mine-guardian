import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageTitle, btnGhost, btnPrimary, inputCls } from "@/components/kit";
import { createUser, deleteUser, listUsers, updateUser } from "@/lib/admin.functions";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "Users & Access — CoalGuard" },
      { name: "description", content: "Create usernames and passwords for each person and set their role." },
      { property: "og:title", content: "Users & Access — CoalGuard" },
      { property: "og:description", content: "Account access control for mine staff." },
    ],
  }),
  component: Users,
});

const ROLES = [
  ["admin", "Administrator — full control"],
  ["officer", "Safety officer — manage complaints"],
  ["inspector", "Inspector — review and audit"],
  ["viewer", "Viewer — read only"],
];
const empty = { username: "", password: "", full_name: "", designation: "", site_scope: "", role: "officer" };

function Users() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const { data: users = [], error } = useQuery({ queryKey: ["users"], queryFn: () => listUsers(), enabled: me?.role === "admin" });

  if (me && me.role !== "admin") return <p className="text-muted-foreground">Only administrators can open this page.</p>;

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await act(() => createUser({ data: f }), `Account "${f.username}" created.`);
    setF(empty);
    setBusy(false);
  }

  return (
    <div>
      <PageTitle title="Users and access" sub="Create a personal username and password for each person. Share the details with them privately." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} className="glass-card space-y-3 p-6">
          <h2 className="text-xl font-bold text-foreground">New account</h2>
          <input className={inputCls} placeholder="Full name" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
          <input className={inputCls} placeholder="Username (e.g. m.das)" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required />
          <div className="flex gap-2">
            <input className={`${inputCls} font-mono`} placeholder="Password (min 8)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
            <button type="button" className={btnGhost} onClick={() => setF({ ...f, password: Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!" })}>Generate</button>
          </div>
          <input className={inputCls} placeholder="Job title" value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} />
          <input className={inputCls} placeholder="Site / area (e.g. Shaft 3)" value={f.site_scope} onChange={(e) => setF({ ...f, site_scope: e.target.value })} />
          <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            {ROLES.map(([v, l]) => <option key={v} value={v} className="bg-card">{l}</option>)}
          </select>
          <button disabled={busy} className={`${btnPrimary} w-full`}>{busy ? "Creating…" : "Create account"}</button>
        </form>

        <div className="glass-card overflow-hidden lg:col-span-2">
          {error && <p className="p-6 text-destructive">{(error as Error).message}</p>}
          <div className="grid grid-cols-12 bg-glass px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="col-span-3">Username</span><span className="col-span-4">Name & area</span><span className="col-span-2">Role</span><span className="col-span-3 text-right">Actions</span>
          </div>
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-12 items-center gap-2 border-t border-border px-5 py-3">
              <div className="col-span-3">
                <p className="font-mono text-primary">{u.username}</p>
                <p className={`text-xs ${u.active ? "text-success" : "text-muted-foreground"}`}>{u.active ? "Active" : "Locked"}</p>
              </div>
              <div className="col-span-4">
                <p className="text-foreground">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{[u.designation, u.site_scope].filter(Boolean).join(" · ")}</p>
              </div>
              <select
                className="col-span-2 rounded-lg bg-glass px-2 py-1 text-sm capitalize ring-1 ring-border"
                value={u.role}
                onChange={(e) => act(() => updateUser({ data: { id: u.id, role: e.target.value } }), "Role updated.")}
              >
                {ROLES.map(([v]) => <option key={v} value={v} className="bg-card">{v}</option>)}
              </select>
              <div className="col-span-3 flex flex-wrap justify-end gap-1">
                <button
                  className="rounded-md px-2 py-1 text-xs ring-1 ring-border hover:bg-glass"
                  onClick={() => {
                    const p = prompt(`New password for ${u.username} (min 8 characters):`);
                    if (p) act(() => updateUser({ data: { id: u.id, password: p } }), "Password changed.");
                  }}
                >
                  Password
                </button>
                <button className="rounded-md px-2 py-1 text-xs ring-1 ring-border hover:bg-glass" onClick={() => act(() => updateUser({ data: { id: u.id, active: !u.active } }), u.active ? "Account locked." : "Account unlocked.")}>
                  {u.active ? "Lock" : "Unlock"}
                </button>
                <button
                  className="rounded-md px-2 py-1 text-xs text-destructive ring-1 ring-destructive/40 hover:bg-destructive/10"
                  onClick={() => confirm(`Delete ${u.username}?`) && act(() => deleteUser({ data: { id: u.id } }), "Account deleted.")}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
