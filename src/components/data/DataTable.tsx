import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Applied to the <td> itself — status color lives in the cell, not beside it (§4). */
  cellClassName?: (row: T) => string | undefined;
  numeric?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription?: string;
}

/** One shared table pattern reused across Materials/Inventory/Procurement/Production (Odoo lesson, §3). */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyTitle, emptyDescription }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.numeric ? "text-right tabular-nums" : undefined}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? "cursor-pointer" : undefined}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(col.numeric && "text-right tabular-nums", col.cellClassName?.(row))}
                >
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
