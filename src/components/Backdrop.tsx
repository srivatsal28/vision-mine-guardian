export function Backdrop() {
  return <div className="pointer-events-none fixed inset-0 z-0 bg-background" />;
}

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid bg-primary size-10 place-items-center rounded-xl text-lg font-bold text-primary-foreground">
        ◈
      </div>
      <div>
        <p className="font-display text-lg font-bold leading-none text-foreground">CoalGuard</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Governance & Compliance</p>
      </div>
    </div>
  );
}
