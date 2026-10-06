import type { ReactNode } from "react";
import mineFeed from "@/assets/mine-feed.jpg";

export const inputCls =
  "w-full rounded-xl bg-glass px-4 py-2.5 text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground/60 focus:ring-primary";
export const btnPrimary = "rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-glow disabled:opacity-60";
export const btnGhost = "rounded-full px-4 py-2 text-sm text-foreground ring-1 ring-border hover:bg-glass disabled:opacity-60";

export function PageTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const SEV: Record<string, string> = {
  low: "bg-success/15 text-success ring-success/30",
  medium: "bg-warning/15 text-warning ring-warning/30",
  high: "bg-destructive/15 text-destructive ring-destructive/30",
  critical: "bg-destructive/25 text-destructive ring-destructive/50",
};
export function SeverityBadge({ s }: { s?: string | null }) {
  if (!s) return <span className="rounded-full px-2.5 py-0.5 text-xs text-muted-foreground ring-1 ring-border">Not analysed</span>;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ${SEV[s] ?? SEV['medium']}`}>{s}</span>;
}

/** Plays a camera stream: HLS/MP4 video, YouTube/embed page, MJPEG/snapshot image, or the demo feed when no URL is set. */
export function CameraPlayer({ url, name }: { url: string; name: string }) {
  const u = url.trim();
  let body: ReactNode;
  if (!u) body = <img src={mineFeed} alt={`${name} demo feed`} className="h-full w-full object-cover" />;
  else if (/\.(m3u8|mp4|webm)(\?|$)/i.test(u))
    body = <video src={u} autoPlay muted playsInline controls className="h-full w-full bg-background object-cover" />;
  else if (/youtube\.com|youtu\.be|\/embed|player\./i.test(u))
    body = <iframe src={u} title={name} allow="autoplay; fullscreen" className="h-full w-full" />;
  else body = <img src={u} alt={name} className="h-full w-full object-cover" />;
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-card ring-1 ring-border">
      {body}
      <div className="animate-scan pointer-events-none absolute inset-x-0 h-px bg-primary/60" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-background/70 px-2 py-1 font-mono text-xs text-foreground">
        <span className="animate-softpulse size-1.5 rounded-full bg-destructive" /> {name}
        {!u && <span className="text-muted-foreground">· demo</span>}
      </div>
    </div>
  );
}

export const isMinLimit = (kind: string) => /oxygen|air/i.test(kind);
export function sensorState(kind: string, value: number, limit: number) {
  const ratio = isMinLimit(kind) ? limit / value : value / limit;
  if (ratio >= 1) return { label: "Unsafe", cls: "text-destructive", bar: "bg-destructive" };
  if (ratio >= 0.8) return { label: "Warning", cls: "text-warning", bar: "bg-warning" };
  return { label: "Safe", cls: "text-success", bar: "bg-success" };
}
