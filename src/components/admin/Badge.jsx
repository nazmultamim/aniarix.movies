const VARIANTS = {
  admin: "bg-primary/10 text-primary border-primary-border/30",
  user: "bg-secondary text-secondary-foreground border-border",

  watching: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  on_hold: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  dropped: "bg-destructive/10 text-destructive border-destructive-border/20",
  plan_to_watch: "bg-secondary text-muted-foreground border-border",

  critical: "bg-destructive/10 text-destructive border-destructive-border/20",
  warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ok: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

  releasing: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  finished: "bg-secondary text-muted-foreground border-border",
};

const LABELS = {
  plan_to_watch: "Plan to Watch",
  on_hold: "On Hold",
};

export default function Badge({ variant = "user", children }) {
  const style = VARIANTS[variant] || VARIANTS.user;
  const label = children ?? LABELS[variant] ?? variant?.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${style}`}
    >
      {label}
    </span>
  );
}