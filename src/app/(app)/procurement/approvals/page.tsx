"use client";

import { trpc } from "@/lib/trpc";
import { ApprovalQueueRow } from "@/components/data/ApprovalQueueRow";
import { EmptyState } from "@/components/data/EmptyState";

export default function ApprovalsPage() {
  const utils = trpc.useUtils();
  const { data: approvals, isLoading } = trpc.approval.listPending.useQuery();
  const decide = trpc.approval.decide.useMutation({
    onSuccess: async () => {
      await utils.approval.listPending.invalidate();
      await utils.purchaseOrder.list.invalidate();
      await utils.notification.list.invalidate();
    },
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div>
        <h1 className="font-heading text-lg font-semibold">Approvals</h1>
        <p className="text-sm text-muted-foreground">Who&rsquo;s waiting on my approval — answered instantly.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !approvals || approvals.length === 0 ? (
        <EmptyState title="Nothing is waiting on your approval" />
      ) : (
        <div className="rounded-md border">
          {approvals.map((a) => (
            <ApprovalQueueRow
              key={a.approvalId}
              title={a.vendorName}
              total={a.total}
              waitingSince={a.createdAt}
              isPending={decide.isPending}
              onApprove={() => decide.mutate({ approvalId: a.approvalId, decision: "APPROVED" })}
              onReject={() => decide.mutate({ approvalId: a.approvalId, decision: "REJECTED" })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
