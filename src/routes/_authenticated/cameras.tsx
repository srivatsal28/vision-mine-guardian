import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CameraPlayer, PageTitle, btnGhost, btnPrimary, inputCls } from "@/components/kit";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/cameras")({
  head: () => ({
    meta: [
      { title: "CCTV Cameras — CoalGuard" },
      { name: "description", content: "Connect CCTV cameras with a secret access code and watch live feeds." },
      { property: "og:title", content: "CCTV Cameras — CoalGuard" },
      { property: "og:description", content: "Live CCTV feeds unlocked by access code." },
    ],
  }),
  component: Cameras,
});

function makeCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
  return `CGV-${part()}-${part()}`;
}

function Cameras() {
  const me = useMe();
  const qc = useQueryClient();
  const isAdmin = me?.role === "admin";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", location: "", stream_url: "", access_code: makeCode() });
  const { data: cams = [] } = useQuery({
    queryKey: ["cameras", me?.id],
    queryFn: async () => (await supabase.from("cameras").select("*").order("created_at")).data ?? [],
  });

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("redeem_camera_code", { _code: code });
    setBusy(false);
    if (error) return toast.error(error.message.includes("not valid") ? "This access code is not valid." : error.message);
    toast.success("Camera connected.");
    setCode("");
    qc.invalidateQueries();
  }

  async function addCamera(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("cameras").insert(f);
    if (error) return toast.error(error.message.includes("duplicate") ? "That code is already used." : error.message);
    toast.success(`Camera added. Share code ${f.access_code} with people who need it.`);
    setF({ name: "", location: "", stream_url: "", access_code: makeCode() });
    qc.invalidateQueries();
  }

  async function remove(id: string) {
    if (isAdmin) {
      if (!confirm("Delete this camera for everyone?")) return;
      await supabase.from("cameras").delete().eq("id", id);
    } else {
      await supabase.from("camera_access").delete().eq("camera_id", id).eq("user_id", me!.id);
    }
    qc.invalidateQueries();
  }

  return (
    <div>
      <PageTitle title="CCTV cameras" sub="Every camera is protected by its own access code. Enter the code to add the feed." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={redeem} className="glass-card space-y-3 p-6">
          <h2 className="text-xl font-bold text-foreground">Connect with a code</h2>
          <p className="text-sm text-muted-foreground">Ask your administrator for the camera code, for example CGV-7F2K-QM40.</p>
          <input className={`${inputCls} font-mono uppercase`} placeholder="CGV-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} required />
          <button disabled={busy} className={`${btnPrimary} w-full`}>{busy ? "Checking…" : "Connect camera"}</button>
        </form>

        <DeviceCamera />

        {isAdmin && (
          <form onSubmit={addCamera} className="glass-card space-y-3 p-6">
            <h2 className="text-xl font-bold text-foreground">Add a new camera</h2>
            <input className={inputCls} placeholder="Camera name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input className={inputCls} placeholder="Location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <input className={inputCls} placeholder="Stream link (HLS .m3u8, MJPEG or embed link)" value={f.stream_url} onChange={(e) => setF({ ...f, stream_url: e.target.value })} />
            <div className="flex gap-2">
              <input className={`${inputCls} font-mono`} value={f.access_code} onChange={(e) => setF({ ...f, access_code: e.target.value.toUpperCase() })} />
              <button type="button" onClick={() => setF({ ...f, access_code: makeCode() })} className={btnGhost}>New</button>
            </div>
            <button className={`${btnPrimary} w-full`}>Save camera</button>
          </form>
        )}
      </div>

      <h2 className="mb-4 mt-10 text-xl font-bold text-foreground">Live feeds ({cams.length})</h2>
      {cams.length === 0 && <p className="text-muted-foreground">No cameras connected yet.</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {cams.map((c) => (
          <div key={c.id} className="glass-card p-4">
            <CameraPlayer url={c.stream_url} name={c.name} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.location}</p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && <span className="rounded-lg bg-glass px-2 py-1 font-mono text-xs text-accent ring-1 ring-border">{c.access_code}</span>}
                <button onClick={() => remove(c.id)} className={btnGhost}>{isAdmin ? "Delete" : "Remove"}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeviceCamera() {
  const ref = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (ref.current) ref.current.srcObject = s;
    } catch {
      toast.error("Camera permission was denied or no camera was found.");
    }
  }
  return (
    <div className="glass-card space-y-3 p-6">
      <h2 className="text-xl font-bold text-foreground">This device's camera</h2>
      <p className="text-sm text-muted-foreground">Use a laptop or phone camera as a quick site camera.</p>
      <div className="aspect-video overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <video ref={ref} autoPlay muted playsInline className="h-full w-full object-cover" />
      </div>
      {stream ? (
        <button onClick={() => { stream.getTracks().forEach((t) => t.stop()); setStream(null); }} className={`${btnGhost} w-full`}>Stop</button>
      ) : (
        <button onClick={start} className={`${btnGhost} w-full`}>Start camera</button>
      )}
    </div>
  );
}
