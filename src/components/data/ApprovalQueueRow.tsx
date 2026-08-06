import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/format";

export interface ApprovalQueueRowProps {
  vendorName: string;
  total: number;
  waitingSince: string | Date;
  onApprove: () => void;
  onReject: () => void;
  isPending?: boolean;
}

/** A queue to clear, not a workflow to visualize — flat list, one-tap decide (§7). */
export function ApprovalQueueRow({ vendorName, total, waitingSince, onApprove, onReject, isPending }: ApprovalQueueRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium">{vendorName}</p>
        <p className="text-xs text-muted-foreground">Waiting since {formatDateTime(waitingSince)}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular-nums font-medium">{formatCurrency(total)}</span>
        <Button variant="outline" size="sm" disabled={isPending} onClick={onReject}>
          Reject
        </Button>
        <Button size="sm" disabled={isPending} onClick={onApprove}>
          Approve
        </Button>
      </div>
    </div>
  );
}
