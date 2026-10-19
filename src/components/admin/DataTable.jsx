import EmptyState from "./EmptyState";
import { Inbox } from "lucide-react";

/**
 * columns: [{ key, header, render?: (row) => node, className? }]
 */
export default function DataTable({
  columns,
  data = [],
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "There's nothing here yet.",
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left font-medium text-muted-foreground text-xs uppercase tracking-wide px-4 py-3 whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="h-3.5 w-24 rounded bg-secondary animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading &&
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-foreground align-middle ${col.className || ""}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && data.length === 0 && (
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}