export default function StatCard({ label, value, delta, deltaType = "up", icon: Icon }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-foreground tabular-nums">
            {value}
          </p>
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px] text-primary" />
          </div>
        )}
      </div>
      {delta && (
        <p
          className={`mt-3 text-xs font-medium ${
            deltaType === "up" ? "text-emerald-400" : "text-destructive"
          }`}
        >
          {deltaType === "up" ? "↑" : "↓"} {delta}
        </p>
      )}
    </div>
  );
}