import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Me = { id: string; username: string; full_name: string; designation: string; role: string };

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return alive && setMe(null);
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("username,full_name,designation").eq("id", u.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.id),
      ]);
      if (!alive) return;
      const roles = (r ?? []).map((x) => x.role);
      setMe({
        id: u.id,
        username: p?.username ?? u.email?.split("@")[0] ?? "user",
        full_name: p?.full_name ?? "",
        designation: p?.designation ?? "",
        role: roles.includes("admin") ? "admin" : roles[0] ?? "viewer",
      });
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return me;
}
