export function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="animate-drift absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[130px]" />
      <div className="animate-drift absolute -right-24 top-1/3 h-[440px] w-[440px] rounded-full bg-violet/15 blur-[130px] [animation-duration:24s]" />
      <div className="animate-drift absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full bg-accent/10 blur-[130px] [animation-duration:20s]" />
      <div className="grid-lines absolute inset-0" />
      <div className="coal-strata absolute inset-0" />
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-brand-gradient shadow-glow grid size-10 place-items-center rounded-xl text-lg font-bold text-primary-foreground">
        ◈
      </div>
      <div>
        <p className="font-display text-lg font-bold leading-none text-foreground">CoalGuard</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Governance & Compliance</p>
      </div>
    </div>
  );
}
