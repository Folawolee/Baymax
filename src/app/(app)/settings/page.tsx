"use client";

import { Fragment, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/data/EmptyState";
import { ROLE_LABELS, type Role } from "@/lib/types";

type ConfigurableRole = Exclude<Role, "OWNER_ADMIN">;
const CONFIGURABLE_ROLES: ConfigurableRole[] = ["SITE_LEAD", "PROCUREMENT_OFFICER", "WAREHOUSE_KEEPER", "VIEWER"];

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
                          onChange={(e) =>
                            setPermission.mutate({ key, role, allowed: e.target.checked })
                          }
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
              Site operations is on — the Site Operations module is visible in the nav for logging usage, daily notes,
              expenses and imprest.
            </p>
            <div>
              <Button variant="outline" size="sm" onClick={() => toggleSiteOperations(false)} disabled={updateConfig.isPending}>
                Turn off site operations
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Site operations is off — the Site Operations module is hidden. Turn it on if you have separate field/site
              work to track (not needed for a pure production operation).
            </p>
            <div>
              <Button size="sm" onClick={() => toggleSiteOperations(true)} disabled={updateConfig.isPending}>
                Turn on site operations
              </Button>
            </div>
          </>
        )}
      </div>

      <RolePermissionsMatrix />
    </div>
  );
}
