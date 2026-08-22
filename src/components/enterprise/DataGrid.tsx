import { cn } from "@/lib/utils";

export interface GridColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Right-aligns and tabular-numbers the column. */
  numeric?: boolean;
  /** Hides the column below `lg` so tables stay usable on laptops and tablets. */
  secondary?: boolean;
  className?: string;
  headerClassName?: string;
}

/**
 * The executive table: horizontal rules and whitespace, no rounded card, no
 * per-cell borders. Distinct from components/data/DataTable, which is the
 * boxed operational grid used inside the Materials/Procurement modules — this
 * one is for portfolio-level reading where the page itself is the container.
 */
export function DataGrid<T>({
  columns,
  rows,
  rowKey,
  minWidth = 880,
  className,
}: {
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto border-y", className)}>
      <table className="w-full text-left" style={{ minWidth }}>
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "py-2 pr-4 font-medium last:pr-0",
                  col.numeric && "text-right",
                  col.secondary && "hidden lg:table-cell",
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="align-top hover:bg-muted/40">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3 pr-4 last:pr-0",
                    col.numeric && "text-right tabular-nums",
                    col.secondary && "hidden lg:table-cell",
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
