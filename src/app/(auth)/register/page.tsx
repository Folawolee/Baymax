"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductionModePicker, type ProductionMode } from "@/components/production/ProductionModePicker";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    industryLabel: "",
    siteTermLabel: "Site",
    productionUnitLabel: "output",
    firstSiteName: "Main Site",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [firstSiteProductionMode, setFirstSiteProductionMode] = useState<ProductionMode>("SIMPLE");
  const [productionEnabled, setProductionEnabled] = useState(true);
  const [siteOperationsEnabled, setSiteOperationsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        ...form,
        productionEnabled,
        siteOperationsEnabled,
        firstSiteProductionMode: productionEnabled ? firstSiteProductionMode : "SIMPLE",
      });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="font-heading text-xl font-semibold">Set up your company</h1>
          <p className="text-sm text-muted-foreground">Creates your company and an Owner/Admin account.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyName">Company name</Label>
          <Input id="companyName" required value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="industryLabel">Industry (e.g. Construction, Asphalt Production)</Label>
          <Input id="industryLabel" required value={form.industryLabel} onChange={(e) => set("industryLabel", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="siteTermLabel">What do you call a site?</Label>
            <Input id="siteTermLabel" value={form.siteTermLabel} onChange={(e) => set("siteTermLabel", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="productionUnitLabel">Production unit</Label>
            <Input
              id="productionUnitLabel"
              value={form.productionUnitLabel}
              onChange={(e) => set("productionUnitLabel", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="firstSiteName">Your first {form.siteTermLabel.toLowerCase() || "site"}&rsquo;s name</Label>
          <Input
            id="firstSiteName"
            required
            value={form.firstSiteName}
            onChange={(e) => set("firstSiteName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Does your company track production?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={productionEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setProductionEnabled(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!productionEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setProductionEnabled(false)}
            >
              No — we don&rsquo;t produce anything
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can turn this on later in Settings if that changes.
          </p>
        </div>
        {productionEnabled && (
          <div className="space-y-1.5">
            <Label>How is production tracked there?</Label>
            <ProductionModePicker value={firstSiteProductionMode} onChange={setFirstSiteProductionMode} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Do you have separate site/field operations to track?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={siteOperationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSiteOperationsEnabled(true)}
            >
              Yes
            </Button>
            <Button
              type="button"
              variant={!siteOperationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSiteOperationsEnabled(false)}
            >
              No — we&rsquo;re a pure production operation
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            E.g. road crews, daily field notes, site expenses — not needed for a plant that just produces (asphalt, or
            anything else). You can turn this on later in Settings.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminName">Your name</Label>
          <Input id="adminName" required value={form.adminName} onChange={(e) => set("adminName", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminEmail">Your email</Label>
          <Input id="adminEmail" type="email" required value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminPassword">Password</Label>
          <Input
            id="adminPassword"
            type="password"
            required
            minLength={8}
            value={form.adminPassword}
            onChange={(e) => set("adminPassword", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-status-bad">{error}</p>}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create company"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already set up?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
