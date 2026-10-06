import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const USERNAME_DOMAIN = "coalguard.local";
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${USERNAME_DOMAIN}`;

type Role = "admin" | "officer" | "inspector" | "viewer";
const ROLES: Role[] = ["admin", "officer", "inspector", "viewer"];

function cleanUsername(u: unknown) {
  const v = String(u ?? "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(v)) throw new Error("Username must be 3–30 characters: letters, numbers, dot, dash or underscore.");
  return v;
}
function cleanPassword(p: unknown) {
  const v = String(p ?? "");
  if (v.length < 8 || v.length > 72) throw new Error("Password must be 8–72 characters.");
  return v;
}

async function createAccount(input: { username: string; password: string; full_name: string; designation: string; site_scope: string; role: Role }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: usernameToEmail(input.username),
    password: input.password,
    email_confirm: true,
    user_metadata: { username: input.username, full_name: input.full_name },
  });
  if (error || !data.user) throw new Error(error?.message?.includes("already") ? "This username is already taken." : error?.message ?? "Could not create user.");
  const id = data.user.id;
  const p = await supabaseAdmin.from("profiles").insert({
    id,
    username: input.username,
    full_name: input.full_name,
    designation: input.designation,
    site_scope: input.site_scope || "All sites",
  });
  if (p.error) {
    await supabaseAdmin.auth.admin.deleteUser(id);
    throw new Error(p.error.message.includes("duplicate") ? "This username is already taken." : p.error.message);
  }
  await supabaseAdmin.from("user_roles").insert({ user_id: id, role: input.role });
  return id;
}

/** Public: only works while no admin exists yet (first-time setup). */
export const needsSetup = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return { needsSetup: (count ?? 0) === 0 };
});

export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; password: string; full_name: string }) => ({
    username: cleanUsername(d.username),
    password: cleanPassword(d.password),
    full_name: String(d.full_name ?? "").slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Setup is already complete. Please sign in.");
    await createAccount({ ...data, designation: "Administrator", site_scope: "All sites", role: "admin" });
    return { ok: true };
  });

async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: Role }) => PromiseLike<{ data: boolean | null }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can do this.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { data: profiles } = await context.supabase.from("profiles").select("*").order("created_at");
    const { data: roles } = await context.supabase.from("user_roles").select("user_id,role");
    return (profiles ?? []).map((p) => ({ ...p, role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "viewer" }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string; password: string; full_name: string; designation: string; site_scope: string; role: string }) => {
    if (!ROLES.includes(d.role as Role)) throw new Error("Pick a valid role.");
    return {
      username: cleanUsername(d.username),
      password: cleanPassword(d.password),
      full_name: String(d.full_name ?? "").slice(0, 80),
      designation: String(d.designation ?? "").slice(0, 80),
      site_scope: String(d.site_scope ?? "").slice(0, 80),
      role: d.role as Role,
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    await createAccount(data);
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; active?: boolean; password?: string; role?: string }) => {
    if (d.role && !ROLES.includes(d.role as Role)) throw new Error("Pick a valid role.");
    return { id: String(d.id), active: d.active, password: d.password ? cleanPassword(d.password) : undefined, role: d.role as Role | undefined };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id === context.userId && (data.active === false || (data.role && data.role !== "admin")))
      throw new Error("You cannot lock or demote your own account.");
    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
      if (error) throw new Error(error.message);
    }
    if (typeof data.active === "boolean") {
      await supabaseAdmin.from("profiles").update({ active: data.active }).eq("id", data.id);
      await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.active ? "none" : "876000h" });
    }
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    if (data.id === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
