"use client";

import { Check, Sparkles, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { useAuth } from "@/lib/auth";
import { formatCompactCurrency } from "@/lib/format";

function proposalSummary(type: "CREATE_EXPENSE" | "CREATE_PROJECT", payload: unknown) {
  const data = payload as Record<string, unknown>;
  if (type === "CREATE_EXPENSE") return `Record ${formatCompactCurrency(Number(data.amount))} paid to ${String(data.paidTo)} — ${String(data.description)}.`;
  return `Create project “${String(data.name)}”${data.description ? ` — ${String(data.description)}` : ""}.`;
}

export default function BimpeApprovalsPage() {
  const { user } = useAuth();
  const actions = trpc.bimpe.pendingActions.useQuery(undefined, { enabled: user?.role === "OWNER_ADMIN" });
  const decide = trpc.bimpe.decideAction.useMutation({ onSuccess: () => void actions.refetch() });

  if (user?.role !== "OWNER_ADMIN") return <EmptyState title="Owner approval required" description="Baymax AI write proposals are only available to an Owner/Admin." />;

  return <div className="mx-auto max-w-3xl"><div className="mb-6"><div className="flex items-center gap-2"><Sparkles className="size-5 text-primary" /><h1 className="font-heading text-2xl font-semibold">Baymax AI write approvals</h1></div><p className="mt-1 text-sm text-muted-foreground">Review exactly what Baymax AI will write before it becomes part of the business record.</p></div><div className="space-y-3">{actions.isLoading ? <p className="text-sm text-muted-foreground">Loading proposals...</p> : !actions.data?.length ? <EmptyState title="No Baymax AI proposals waiting" description="Approved proposals are executed and recorded in the audit log." /> : actions.data.map((action) => <article key={action.id} className="rounded-xl border bg-card p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-xs font-medium text-primary">{action.type === "CREATE_EXPENSE" ? "Expense proposal" : "Project proposal"}</p><p className="mt-1 font-medium">{proposalSummary(action.type, action.payload)}</p><p className="mt-2 text-xs text-muted-foreground">Requested by {action.requestedBy.name} · {new Date(action.createdAt).toLocaleString("en-GB")}</p></div><div className="flex shrink-0 items-center gap-2"><Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: action.id, approved: false })}><X className="size-4" /> Reject</Button><Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: action.id, approved: true })}><Check className="size-4" /> Approve</Button></div></div></article>)}</div></div>;
}
