"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, MapPin, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDateTime, formatQty } from "@/lib/format";

export default function ProjectOperationsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { siteTermLabel } = useCompanyConfig();
  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.project.getById.useQuery({ id });
  const createRoad = trpc.road.create.useMutation({ onSuccess: () => utils.project.getById.invalidate({ id }) });
  const [newRoadName, setNewRoadName] = useState("");

  const activity = useMemo(() => project?.roads.flatMap((road) => [
    ...road.usageLogs.map((item) => ({ kind: "usage" as const, id: item.id, timestamp: item.timestamp, road: road.name, title: `${formatQty(item.qty, item.material.unitOfMeasure)} of ${item.material.name} used`, detail: `${item.task} · ${item.location.name} · logged by ${item.loggedBy.name}` })),
    ...road.expenses.map((item) => ({ kind: "expense" as const, id: item.id, timestamp: item.paidAt, road: road.name, title: `${formatCurrency(item.amount)} paid to ${item.paidTo}`, detail: `${item.description} · recorded by ${item.recordedBy.name}` })),
    ...road.imprests.map((item) => ({ kind: "imprest" as const, id: item.id, timestamp: item.receivedAt, road: road.name, title: `${formatCurrency(item.amount)} received from ${item.source}`, detail: `${item.description} · recorded by ${item.recordedBy.name}` })),
    ...road.dailySiteNotes.map((item) => ({ kind: "note" as const, id: item.id, timestamp: item.date, road: road.name, title: "Daily site note", detail: `${item.note} · ${item.createdBy.name}` })),
  ]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) ?? [], [project]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading project operations…</p>;
  if (!project) return <EmptyState title="Project not found" description="This project may have been removed or you may not have access to it." />;
  const isComplete = project.status === "COMPLETED";
  const totalSpent = project.roads.flatMap((road) => road.expenses).reduce((sum, item) => sum + item.amount, 0);
  const totalReceived = project.roads.flatMap((road) => road.imprests).reduce((sum, item) => sum + item.amount, 0);

  return <div className="mx-auto flex max-w-6xl flex-col gap-6">
    <Link href="/site-operations" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Project operations</Link>
    <section className="rounded-xl border bg-card p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Building2 className="size-5 text-primary" /><h1 className="font-heading text-2xl font-semibold">{project.name}</h1></div><p className="mt-2 max-w-3xl text-sm text-muted-foreground">{project.description || "A complete operational record across this project’s sites."}</p></div><StatusBadge status={isComplete ? "good" : "neutral"} label={isComplete ? "Completed" : "Active project"} /></div><div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4"><p className="text-sm text-muted-foreground"><strong className="block text-xl text-foreground">{project.roads.length}</strong>{siteTermLabel}s</p><p className="text-sm text-muted-foreground"><strong className="block text-xl text-foreground">{activity.length}</strong>logged activities</p><p className="text-sm text-muted-foreground"><strong className="block text-xl text-foreground">{formatCurrency(totalReceived)}</strong>money in</p><p className="text-sm text-muted-foreground"><strong className="block text-xl text-foreground">{formatCurrency(totalSpent)}</strong>money out</p></div></section>

    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Roads</h2>
          <p className="text-sm text-muted-foreground">Each road has its own locations, daily notes and material usage.</p>
        </div>
      </div>
      {user?.role === "OWNER_ADMIN" && (
        <form className="mb-3 flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); if (newRoadName.trim()) { createRoad.mutate({ name: newRoadName.trim(), projectId: id }); setNewRoadName(""); } }}>
          <Input value={newRoadName} onChange={(event) => setNewRoadName(event.target.value)} placeholder="Add a road to this project" />
          <Button type="submit" disabled={!newRoadName.trim() || createRoad.isPending}><Plus className="size-4" /> Add road</Button>
        </form>
      )}
      {project.roads.length === 0 ? (
        <EmptyState title="No roads yet" description="Add a road to start tracking its operations." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {project.roads.map((road) => (
            <div key={road.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="size-5" /></span>
              <p className="mt-4 font-medium">{road.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{road.locations.length} locations</p>
              <Link href={`/site-operations/${road.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">View road operations <ArrowRight className="size-3.5" /></Link>
            </div>
          ))}
        </div>
      )}
    </section>

    <section><div className="mb-3"><h2 className="font-heading text-lg font-semibold">Project activity</h2><p className="text-sm text-muted-foreground">Everything logged across this project’s sites, in time order.</p></div>{activity.length === 0 ? <EmptyState title="No project activity yet" description="Usage, expenses, money received and daily notes will appear here as teams log them." /> : <ol className="divide-y rounded-xl border bg-card">{activity.map((item) => <li key={`${item.kind}-${item.id}`} className="flex gap-3 p-4"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.kind === "expense" ? "bg-status-bad" : item.kind === "imprest" ? "bg-status-good" : "bg-primary"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><p className="font-medium">{item.title}</p><time className="text-xs text-muted-foreground">{formatDateTime(item.timestamp)}</time></div><p className="mt-1 text-sm text-muted-foreground">{item.road} · {item.detail}</p></div></li>)}</ol>}</section>
  </div>;
}
