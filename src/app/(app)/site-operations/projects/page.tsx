"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge } from "@/components/data/StatusBadge";
import { useCompanyConfig } from "@/lib/companyConfig";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";

export default function ProjectsPage() {
  const { user } = useAuth();
  const { siteTermLabel } = useCompanyConfig();
  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.project.list.useQuery();
  const { data: expenses } = trpc.expense.list.useQuery();
  const { data: imprests } = trpc.imprest.list.useQuery();
  const create = trpc.project.create.useMutation({
    onSuccess: async () => {
      await utils.project.list.invalidate();
      setName("");
      setDescription("");
    },
  });
  const complete = trpc.project.complete.useMutation({ onSuccess: () => utils.project.list.invalidate() });
  const reopen = trpc.project.reopen.useMutation({ onSuccess: () => utils.project.list.invalidate() });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function moneyForProject(roadIds: Set<string>) {
    const totalImprest = (imprests ?? [])
      .filter((i) => i.roadId !== null && roadIds.has(i.roadId))
      .reduce((sum, i) => sum + i.amount, 0);
    const totalSpend = (expenses ?? [])
      .filter((e) => e.roadId !== null && roadIds.has(e.roadId))
      .reduce((sum, e) => sum + e.amount, 0);
    return { totalImprest, totalSpend, balance: totalImprest - totalSpend };
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Group {siteTermLabel.toLowerCase()}s under a project — e.g. a single contract spanning several{" "}
          {siteTermLabel.toLowerCase()}s.
        </p>
      </div>

      {user?.role === "OWNER_ADMIN" && (
        <form
          className="flex flex-col gap-3 rounded-md border p-4 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) {
              create.mutate({ name: name.trim(), description: description.trim() || undefined });
            }
          }}
        >
          <p className="text-sm font-medium">Add a project</p>
          <div className="space-y-1.5">
            <Label htmlFor="projectName">Name</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lekki-Epe Corridor Rehabilitation"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="projectDescription">Description (optional)</Label>
            <Input id="projectDescription" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? "Adding…" : "Add project"}
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={`Create a project to group ${siteTermLabel.toLowerCase()}s that belong to the same contract.`}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => {
            const roadIds = new Set(project.roads.map((s) => s.id));
            const money = moneyForProject(roadIds);
            const isCompleted = project.status === "COMPLETED";
            return (
              <li key={project.id} className="rounded-md border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/site-operations/projects/${project.id}`} className="font-medium text-primary hover:underline">{project.name}</Link>
                      <StatusBadge status={isCompleted ? "good" : "neutral"} label={isCompleted ? "Completed" : "Active"} />
                    </div>
                    {project.description && <p className="text-sm text-muted-foreground">{project.description}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {project.roads.length === 0
                        ? `No ${siteTermLabel.toLowerCase()}s assigned yet`
                        : project.roads.map((s) => s.name).join(", ")}
                    </p>
                    {(money.totalImprest > 0 || money.totalSpend > 0) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatCurrency(money.totalImprest)} received · {formatCurrency(money.totalSpend)} spent · balance{" "}
                        <span className={money.balance < 0 ? "text-status-bad" : "text-status-good"}>
                          {formatCurrency(money.balance)}
                        </span>
                      </p>
                    )}
                    <Link href={`/site-operations/projects/${project.id}`} className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">Open project operations →</Link>
                  </div>
                  {user?.role === "OWNER_ADMIN" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={complete.isPending || reopen.isPending}
                      onClick={() =>
                        isCompleted ? reopen.mutate({ id: project.id }) : complete.mutate({ id: project.id })
                      }
                    >
                      {isCompleted ? "Reopen" : "Mark complete"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Link href="/production/sites" className="text-sm text-muted-foreground underline underline-offset-2">
        Manage {siteTermLabel.toLowerCase()}s
      </Link>
    </div>
  );
}
