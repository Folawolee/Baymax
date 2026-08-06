"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { EmptyState } from "@/components/data/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatQty, formatDateTime } from "@/lib/format";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SiteOperationsDayPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const utils = trpc.useUtils();
  const [dateIso, setDateIso] = useState(todayIso());
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const { data: sites } = trpc.site.list.useQuery();
  const { data: summary, isLoading } = trpc.siteOperations.getDailySummary.useQuery({
    siteId,
    date: new Date(dateIso),
  });
  const setNote = trpc.siteOperations.setDailyNote.useMutation();

  const site = sites?.find((s) => s.id === siteId);
  const note = noteDraft ?? summary?.note?.note ?? "";

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
    await setNote.mutateAsync({ siteId, date: new Date(dateIso), note });
    await utils.siteOperations.getDailySummary.invalidate({ siteId, date: new Date(dateIso) });
    setNoteDraft(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-lg font-semibold">{site?.name ?? siteId}</h1>
          <p className="text-sm text-muted-foreground">{site?.typeLabel}</p>
        </div>
        <input
          type="date"
          value={dateIso}
          onChange={(e) => setDateIso(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Daily note</p>
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
        <p className="mb-2 text-xs font-medium text-muted-foreground">Material usage by task / portion</p>
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
    </div>
  );
}
