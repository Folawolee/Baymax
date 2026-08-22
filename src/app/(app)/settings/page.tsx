"use client";

import { Fragment, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useScopeOptions, scopeArgs } from "@/lib/scopes";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/data/EmptyState";
import { StatusBadge } from "@/components/data/StatusBadge";
import { ROLE_LABELS, type Role } from "@/lib/types";

type ConfigurableRole = Exclude<Role, "OWNER_ADMIN">;
const CONFIGURABLE_ROLES: ConfigurableRole[] = ["SITE_LEAD", "PROCUREMENT_OFFICER", "WAREHOUSE_KEEPER", "FINANCE", "VIEWER"];
const ASSIGNABLE_ROLES: Role[] = [
  "OWNER_ADMIN",
  "SITE_LEAD",
  "PROCUREMENT_OFFICER",
  "WAREHOUSE_KEEPER",
  "FINANCE",
  "VIEWER",
];

function TeamManagement() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.user.list.useQuery();
  const scopes = useScopeOptions();

  const updateRole = trpc.user.updateRole.useMutation({
    onSuccess: () => utils.user.list.invalidate(),
  });
  const setActive = trpc.user.setActive.useMutation({
    onSuccess: () => utils.user.list.invalidate(),
  });
  const createUser = trpc.user.create.useMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("SITE_LEAD");
  const [scopeKey, setScopeKey] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) return;
    try {
      await createUser.mutateAsync({ name, email, role, ...scopeArgs(scopeKey), password });
      await utils.user.list.invalidate();
      setName("");
      setEmail("");
      setPassword("");
      setScopeKey("");
      setRole("SITE_LEAD");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">Team</p>
        <p className="text-sm text-muted-foreground">Manage who has access, their role and which site they&rsquo;re assigned to.</p>
      </div>

      {isLoading || !users ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-2 text-left font-medium">Name</th>
                <th className="px-2 py-2 text-left font-medium">Email</th>
                <th className="px-2 py-2 text-left font-medium">Role</th>
                <th className="px-2 py-2 text-left font-medium">Site</th>
                <th className="px-2 py-2 text-left font-medium">Status</th>
                <th className="px-2 py-2 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">{u.name}</td>
                  <td className="px-2 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-2 py-2">
                    <select
                      value={u.role}
                      disabled={updateRole.isPending}
                      onChange={(e) =>
                        updateRole.mutate({ userId: u.id, role: e.target.value as Role, roadId: u.roadId ?? undefined, facilityId: u.facilityId ?? undefined })
                      }
                      className="h-8 rounded-md border border-input bg-background px-1 text-xs"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={u.roadId ? `road:${u.roadId}` : u.facilityId ? `facility:${u.facilityId}` : ""}
                      disabled={updateRole.isPending}
                      onChange={(e) =>
                        updateRole.mutate({ userId: u.id, role: u.role as Role, ...scopeArgs(e.target.value) })
                      }
                      className="h-8 rounded-md border border-input bg-background px-1 text-xs"
                    >
                      <option value="">— none —</option>
                      {scopes.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <StatusBadge status={u.active ? "good" : "neutral"} label={u.active ? "Active" : "Deactivated"} />
                  </td>
                  <td className="px-2 py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ userId: u.id, active: !u.active })}
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleInvite} className="flex flex-col gap-3 border-t pt-4">
        <p className="text-sm font-medium">Invite user</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newName">Name</Label>
            <Input id="newName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newEmail">Email</Label>
            <Input id="newEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newRole">Role</Label>
            <select
              id="newRole"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newSite">Site</Label>
            <select
              id="newSite"
              value={scopeKey}
              onChange={(e) => setScopeKey(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— none —</option>
              {scopes.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Password</Label>
            <Input id="newPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-status-bad">{error}</p>}

        <div>
          <Button type="submit" disabled={!name || !email || !password || createUser.isPending}>
            {createUser.isPending ? "Creating…" : "Invite user"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RolePermissionsMatrix() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.permissions.list.useQuery();
  const setPermission = trpc.permissions.set.useMutation({
    onSuccess: () => utils.permissions.list.invalidate(),
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const modules = Array.from(new Set(Object.values(data.labels).map((l) => l.module)));
  const keysByModule = (moduleName: string) =>
    (Object.keys(data.labels) as Array<keyof typeof data.labels>).filter((k) => data.labels[k].module === moduleName);

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div>
        <p className="text-sm font-medium">Role permissions</p>
        <p className="text-sm text-muted-foreground">
          Choose which roles can perform each action. Owner/Admin always has full access and can&apos;t be restricted.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-2 text-left font-medium">Action</th>
              <th className="px-2 py-2 text-center font-medium text-muted-foreground">Owner/Admin</th>
              {CONFIGURABLE_ROLES.map((role) => (
                <th key={role} className="px-2 py-2 text-center font-medium">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((moduleName) => (
              <Fragment key={moduleName}>
                <tr>
                  <td colSpan={2 + CONFIGURABLE_ROLES.length} className="bg-muted/40 px-2 py-1 text-xs font-medium uppercase text-muted-foreground">
                    {moduleName}
                  </td>
                </tr>
                {keysByModule(moduleName).map((key) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <p>{data.labels[key].label}</p>
                      <p className="text-xs text-muted-foreground">{data.labels[key].description}</p>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input type="checkbox" checked disabled className="accent-muted-foreground" />
                    </td>
                    {CONFIGURABLE_ROLES.map((role) => (
                      <td key={role} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={data.matrix[key][role]}
                          disabled={setPermission.isPending}
                          onChange={(e) => setPermission.mutate({ key, role, allowed: e.target.checked })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.company.getMine.useQuery();
  const updateConfig = trpc.company.updateConfig.useMutation({
    onSuccess: () => utils.company.getMine.invalidate(),
  });

  const [siteTermLabel, setSiteTermLabel] = useState("");
  const [productionUnitLabel, setProductionUnitLabel] = useState("");
  const [behindPlanThresholdPct, setBehindPlanThresholdPct] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!config) return;
    // Genuinely syncing local editable state from data that arrives after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSiteTermLabel(config.siteTermLabel);
    setProductionUnitLabel(config.productionUnitLabel);
    setBehindPlanThresholdPct(String(config.behindPlanThresholdPct));
  }, [config]);

  if (user && user.role !== "OWNER_ADMIN") {
    return <EmptyState title="Admin only" description="Settings can only be changed by an Owner/Admin." />;
  }

  async function saveTerminology(e: React.FormEvent) {
    e.preventDefault();
    await updateConfig.mutateAsync({
      siteTermLabel: siteTermLabel.trim() || undefined,
      productionUnitLabel: productionUnitLabel.trim() || undefined,
      behindPlanThresholdPct: behindPlanThresholdPct ? Number(behindPlanThresholdPct) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleProduction(enabled: boolean) {
    await updateConfig.mutateAsync({ productionEnabled: enabled });
  }

  async function toggleSiteOperations(enabled: boolean) {
    await updateConfig.mutateAsync({ siteOperationsEnabled: enabled });
  }

  if (isLoading || !config) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Company settings</h1>
        <p className="text-sm text-muted-foreground">Terminology and module configuration for {config.name}.</p>
      </div>

      <form onSubmit={saveTerminology} className="flex flex-col gap-3 rounded-md border p-4">
        <p className="text-sm font-medium">Terminology</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="siteTermLabel">What do you call a site?</Label>
            <Input id="siteTermLabel" value={siteTermLabel} onChange={(e) => setSiteTermLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="productionUnitLabel">Production unit</Label>
            <Input id="productionUnitLabel" value={productionUnitLabel} onChange={(e) => setProductionUnitLabel(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="threshold">Behind-plan threshold (%)</Label>
          <Input
            id="threshold"
            type="number"
            min="0"
            max="100"
            value={behindPlanThresholdPct}
            onChange={(e) => setBehindPlanThresholdPct(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? "Saving…" : "Save"}
          </Button>
          {saved && <span className="text-sm text-status-good">Saved</span>}
        </div>
      </form>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <p className="text-sm font-medium">Production tracking</p>
        {config.productionEnabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              Production tracking is on — the Production module is visible in the nav and sites can log plans, output or
              weighbridge batches.
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={() => toggleProduction(false)} disabled={updateConfig.isPending}>
                Turn off production tracking
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Production tracking is off — the Production module is hidden. Turn it on if you start producing something you
              want to track.
            </p>
            <div>
              <Button size="sm" onClick={() => toggleProduction(true)} disabled={updateConfig.isPending}>
                Turn on production tracking
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-4">
        <p className="text-sm font-medium">Site operations</p>
        {config.siteOperationsEnabled ? (
          <>
            <p className="text-sm text-muted-foreground">
              Project operations is on — the Project Operations module is visible in the nav for logging usage, daily notes,
              expenses and imprest.
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={() => toggleSiteOperations(false)} disabled={updateConfig.isPending}>
                Turn off project operations
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Project operations is off — the Project Operations module is hidden. Turn it on if you have separate field/site
              work to track (not needed for a pure production operation).
            </p>
            <div>
              <Button size="sm" onClick={() => toggleSiteOperations(true)} disabled={updateConfig.isPending}>
                Turn on project operations
              </Button>
            </div>
          </>
        )}
      </div>

      <TeamManagement />

      <RolePermissionsMatrix />
    </div>
  );
}
