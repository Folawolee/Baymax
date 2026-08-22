"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge, type Status } from "@/components/data/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatQty, formatDateTime, formatDate, formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { useCompanyConfig } from "@/lib/companyConfig";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const WORK_ITEM_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "DONE", "BLOCKED"] as const;
type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

const STATUS_LABELS: Record<WorkItemStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  BLOCKED: "Blocked",
};

const STATUS_TO_BADGE: Record<WorkItemStatus, Status> = {
  DONE: "good",
  IN_PROGRESS: "warn",
  BLOCKED: "bad",
  NOT_STARTED: "neutral",
};

export default function SiteOperationsDayPage() {
  const { siteId: roadId } = useParams<{ siteId: string }>();
  const utils = trpc.useUtils();
  const { siteTermLabel } = useCompanyConfig();
  const [dateIso, setDateIso] = useState(todayIso());
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const { data: sites } = trpc.road.list.useQuery();
  const { data: summary, isLoading } = trpc.siteOperations.getDailySummary.useQuery({
    roadId,
    date: new Date(dateIso),
    locationId: selectedLocationId || undefined,
  });
  const setNote = trpc.siteOperations.setDailyNote.useMutation();
  const { data: locations } = trpc.location.list.useQuery();
  const createLocation = trpc.location.createForSite.useMutation();
  const [newLocationName, setNewLocationName] = useState("");

  const site = sites?.find((s) => s.id === roadId);
  const note = noteDraft ?? summary?.note?.note ?? "";
  const roadLocations = (locations ?? []).filter((location) => location.roadId === roadId);

  type UsageLogEntry = NonNullable<typeof summary>["usageLogs"][number];

  const byTask = useMemo(() => {
    const groups = new Map<string, UsageLogEntry[]>();
    for (const log of summary?.usageLogs ?? []) {
      const list = groups.get(log.task) ?? [];
      list.push(log);
      groups.set(log.task, list);
    }
    return [...groups.entries()];
  }, [summary]);

  async function saveNote() {
    await setNote.mutateAsync({ roadId, date: new Date(dateIso), note, locationId: selectedLocationId || undefined });
    await utils.siteOperations.getDailySummary.invalidate({
      roadId,
      date: new Date(dateIso),
      locationId: selectedLocationId || undefined,
    });
    setNoteDraft(null);
  }

  async function addLocation() {
    if (!newLocationName.trim()) return;
    await createLocation.mutateAsync({ name: newLocationName.trim(), typeLabel: "work_area", roadId });
    await utils.location.list.invalidate();
    setNewLocationName("");
  }

  // --- Work items -----------------------------------------------------

  const { data: users } = trpc.user.list.useQuery();
  const workItemsBySite = trpc.workItem.listByScope.useQuery({ roadId }, { enabled: !selectedLocationId });
  const workItemsByLocation = trpc.workItem.listByLocation.useQuery(
    { locationId: selectedLocationId },
    { enabled: !!selectedLocationId },
  );
  const workItems = selectedLocationId ? workItemsByLocation.data : workItemsBySite.data;
  const workItemsLoading = selectedLocationId ? workItemsByLocation.isLoading : workItemsBySite.isLoading;

  const createWorkItem = trpc.workItem.create.useMutation();
  const updateWorkItemProgress = trpc.workItem.updateProgress.useMutation();
  const completeWorkItem = trpc.workItem.complete.useMutation();

  const [wiTitle, setWiTitle] = useState("");
  const [wiAssignedTo, setWiAssignedTo] = useState("");
  const [wiDueDate, setWiDueDate] = useState("");
  const [wiPlannedQty, setWiPlannedQty] = useState("");
  const [wiUnit, setWiUnit] = useState("");
  const [wiBudget, setWiBudget] = useState("");

  async function invalidateWorkItems() {
    await utils.workItem.listByScope.invalidate({ roadId });
    if (selectedLocationId) await utils.workItem.listByLocation.invalidate({ locationId: selectedLocationId });
  }

  async function addWorkItem() {
    if (!wiTitle.trim() || !wiAssignedTo || !wiDueDate) return;
    await createWorkItem.mutateAsync({
      roadId,
      locationId: selectedLocationId || undefined,
      title: wiTitle.trim(),
      assignedToId: wiAssignedTo,
      dueDate: new Date(wiDueDate),
      plannedQty: wiPlannedQty ? Number(wiPlannedQty) : undefined,
      unitOfMeasure: wiUnit.trim() || undefined,
      budgetedCost: wiBudget ? Number(wiBudget) : undefined,
    });
    await invalidateWorkItems();
    setWiTitle("");
    setWiAssignedTo("");
    setWiDueDate("");
    setWiPlannedQty("");
    setWiUnit("");
    setWiBudget("");
  }

  async function changeWorkItemStatus(workItemId: string, status: WorkItemStatus) {
    await updateWorkItemProgress.mutateAsync({ workItemId, status });
    await invalidateWorkItems();
  }

  async function markWorkItemComplete(workItemId: string) {
    await completeWorkItem.mutateAsync({ workItemId });
    await invalidateWorkItems();
  }

  // --- Labor ------------------------------------------------------------

  const laborBySite = trpc.laborLog.listByScope.useQuery({ roadId }, { enabled: !selectedLocationId });
  const laborByLocation = trpc.laborLog.listByLocation.useQuery(
    { locationId: selectedLocationId },
    { enabled: !!selectedLocationId },
  );
  const laborLogs = selectedLocationId ? laborByLocation.data : laborBySite.data;
  const laborToday = (laborLogs ?? []).filter(
    (log) => new Date(log.date).toISOString().slice(0, 10) === dateIso,
  );

  const createLaborLog = trpc.laborLog.create.useMutation();
  const [laborTrade, setLaborTrade] = useState("");
  const [laborHeadcount, setLaborHeadcount] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");

  async function addLaborLog() {
    if (!laborTrade.trim() || !laborHeadcount) return;
    await createLaborLog.mutateAsync({
      roadId,
      locationId: selectedLocationId || undefined,
      date: new Date(dateIso),
      trade: laborTrade.trim(),
      headcount: Number(laborHeadcount),
      hoursWorked: laborHours ? Number(laborHours) : undefined,
      dailyRate: laborRate ? Number(laborRate) : undefined,
    });
    await utils.laborLog.listByScope.invalidate({ roadId });
    if (selectedLocationId) await utils.laborLog.listByLocation.invalidate({ locationId: selectedLocationId });
    setLaborTrade("");
    setLaborHeadcount("");
    setLaborHours("");
    setLaborRate("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-lg font-semibold">{site?.name ?? roadId}</h1>
          <p className="text-sm text-muted-foreground">{site?.project?.name} · {siteTermLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLocationId}
            onChange={(e) => {
              setSelectedLocationId(e.target.value);
              setNoteDraft(null);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Site-wide</option>
            {roadLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateIso}
            onChange={(e) => {
              setDateIso(e.target.value);
              setNoteDraft(null);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link href={`/site-operations/log?roadId=${roadId}`} className="rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">Log material usage</Link>
        <Link href={`/site-operations/expenses?roadId=${roadId}`} className="rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">Money in / out</Link>
        <a href="#locations" className="rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/[0.03]">Manage locations</a>
      </div>

      <section id="locations" className="rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading font-semibold">{siteTermLabel} locations</h2><p className="text-sm text-muted-foreground">Set the work areas where this {siteTermLabel.toLowerCase()} team operates.</p></div><div className="flex gap-2"><Input value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="e.g. Section 2 drainage" className="w-52" /><Button size="sm" onClick={() => void addLocation()} disabled={!newLocationName.trim() || createLocation.isPending}><Plus className="size-4" /> Add location</Button></div></div><div className="mt-3 flex flex-wrap gap-2">{roadLocations.map((location) => <span key={location.id} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{location.name}</span>)}{roadLocations.length === 0 && <p className="text-sm text-muted-foreground">No locations yet.</p>}</div></section>

      <div className="rounded-md border p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Daily note{selectedLocationId ? ` — ${roadLocations.find((l) => l.id === selectedLocationId)?.name ?? ""}` : ""}</p>
        <Textarea
          value={note}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={2}
          placeholder="Weather, headcount, general notes for the day…"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={saveNote} disabled={setNote.isPending || noteDraft === null}>
            {setNote.isPending ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Material usage by task / location</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : byTask.length === 0 ? (
          <EmptyState title="No usage logged for this day" description="Entries logged for this site on this date will show up grouped by task." />
        ) : (
          <div className="flex flex-col gap-3">
            {byTask.map(([task, logs]) => (
              <div key={task} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{task}</p>
                <ul className="flex flex-col gap-1.5">
                  {(logs ?? []).map((log) => (
                    <li key={log.id} className="flex items-center justify-between text-sm">
                      <span>
                        {formatQty(log.qty, log.material.unitOfMeasure)} of {log.material.name}
                        <span className="text-muted-foreground"> — {log.location.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {log.loggedBy.name} · {formatDateTime(log.timestamp)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            Work items{selectedLocationId ? ` — ${roadLocations.find((l) => l.id === selectedLocationId)?.name ?? ""}` : ""}
          </p>
        </div>

        {workItemsLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !workItems || workItems.length === 0 ? (
          <EmptyState title="No work items yet" description="Assign tasks with a due date to track progress against plan." />
        ) : (
          <ul className="flex flex-col gap-2">
            {workItems.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.assignedTo?.name ?? "Unassigned"} · Due {formatDate(item.dueDate)}
                    {item.plannedQty != null && (
                      <>
                        {" "}· {formatQty(item.actualQty ?? 0, item.unitOfMeasure ?? undefined)} of{" "}
                        {formatQty(item.plannedQty, item.unitOfMeasure ?? undefined)}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={STATUS_TO_BADGE[item.status as WorkItemStatus]} label={STATUS_LABELS[item.status as WorkItemStatus]} />
                  <select
                    value={item.status}
                    onChange={(e) => void changeWorkItemStatus(item.id, e.target.value as WorkItemStatus)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    disabled={updateWorkItemProgress.isPending}
                  >
                    {WORK_ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {item.status !== "DONE" && (
                    <Button size="sm" variant="outline" onClick={() => void markWorkItemComplete(item.id)} disabled={completeWorkItem.isPending}>
                      Complete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-6">
          <Input value={wiTitle} onChange={(e) => setWiTitle(e.target.value)} placeholder="Title" className="sm:col-span-2" />
          <select
            value={wiAssignedTo}
            onChange={(e) => setWiAssignedTo(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Assign to
            </option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={wiDueDate}
            onChange={(e) => setWiDueDate(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Input value={wiPlannedQty} onChange={(e) => setWiPlannedQty(e.target.value)} placeholder="Planned qty" type="number" />
          <Input value={wiUnit} onChange={(e) => setWiUnit(e.target.value)} placeholder="Unit" />
          <Input value={wiBudget} onChange={(e) => setWiBudget(e.target.value)} placeholder="Budgeted cost" type="number" className="sm:col-span-2" />
          <Button
            size="sm"
            onClick={() => void addWorkItem()}
            disabled={!wiTitle.trim() || !wiAssignedTo || !wiDueDate || createWorkItem.isPending}
            className="sm:col-span-2"
          >
            <Plus className="size-4" /> {createWorkItem.isPending ? "Adding…" : "New work item"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Labor today</p>

        {laborToday.length === 0 ? (
          <p className="text-sm text-muted-foreground">No labor logged for this date.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {laborToday.map((log) => (
              <li key={log.id} className="flex items-center justify-between text-sm">
                <span>
                  {log.trade} · {log.headcount} {log.headcount === 1 ? "worker" : "workers"}
                  {log.hoursWorked != null && <span className="text-muted-foreground"> · {log.hoursWorked}h</span>}
                </span>
                {log.totalCost != null && <span className="text-xs text-muted-foreground">{formatCurrency(log.totalCost)}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-5">
          <Input value={laborTrade} onChange={(e) => setLaborTrade(e.target.value)} placeholder="Trade (e.g. Mason)" />
          <Input value={laborHeadcount} onChange={(e) => setLaborHeadcount(e.target.value)} placeholder="Headcount" type="number" />
          <Input value={laborHours} onChange={(e) => setLaborHours(e.target.value)} placeholder="Hours worked" type="number" />
          <Input value={laborRate} onChange={(e) => setLaborRate(e.target.value)} placeholder="Daily rate" type="number" />
          <Button size="sm" onClick={() => void addLaborLog()} disabled={!laborTrade.trim() || !laborHeadcount || createLaborLog.isPending}>
            <Plus className="size-4" /> {createLaborLog.isPending ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}
