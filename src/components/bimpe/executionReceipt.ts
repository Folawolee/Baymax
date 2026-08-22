import type { ToolCallResult } from "./deepLinks";

export interface ExecutionReceipt {
  /** "Recorded" for writes that landed; "Awaiting approval" for proposals that still need a human. */
  outcome: "recorded" | "awaiting_approval";
  action: string;
  subject: string;
  details: Array<{ label: string; value: string }>;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Turns a write tool's result into a compact confirmation, so the AI reads as an
 * operating layer that changed the system rather than a chatbot that replied.
 * Read-only tools produce nothing — only actual writes get a receipt.
 */
export function buildExecutionReceipts(toolResults: ToolCallResult[]): ExecutionReceipt[] {
  const receipts: ExecutionReceipt[] = [];

  for (const result of toolResults) {
    const out = result.output as Record<string, unknown> | undefined;
    if (!out) continue;

    switch (result.toolName) {
      case "log_usage": {
        if (out.logged !== true) break;
        const qty = num(out.qty);
        receipts.push({
          outcome: "recorded",
          action: "Material usage recorded",
          subject: `${qty ?? ""} ${str(out.material) ?? "material"}`.trim(),
          details: [
            { label: "Location", value: [str(out.site), str(out.location)].filter(Boolean).join(" · ") || "—" },
          ],
        });
        break;
      }
      case "log_imprest": {
        if (out.logged !== true) break;
        const amount = num(out.amount);
        receipts.push({
          outcome: "recorded",
          action: "Cash received recorded",
          subject: amount !== null ? amount.toLocaleString() : "Imprest",
          details: [
            { label: "Source", value: str(out.source) ?? "—" },
            { label: "Site", value: str(out.site) ?? "—" },
          ],
        });
        break;
      }
      case "draft_purchase_order": {
        if (out.drafted !== true) break;
        const lines = Array.isArray(out.lines) ? out.lines.length : null;
        receipts.push({
          outcome: "awaiting_approval",
          action: "Purchase order drafted",
          subject: str(out.vendor) ?? "Purchase order",
          details: [
            { label: "Status", value: str(out.status) ?? "DRAFT" },
            ...(lines !== null ? [{ label: "Lines", value: String(lines) }] : []),
          ],
        });
        break;
      }
      case "log_expense": {
        if (out.proposed !== true) break;
        const amount = num(out.amount);
        receipts.push({
          outcome: "awaiting_approval",
          action: "Expense proposed",
          subject: amount !== null ? amount.toLocaleString() : "Expense",
          details: [
            { label: "Paid to", value: str(out.paidTo) ?? "—" },
            { label: "Category", value: str(out.category)?.replaceAll("_", " ").toLowerCase() ?? "—" },
            { label: "Site", value: str(out.site) ?? "—" },
          ],
        });
        break;
      }
      case "create_project": {
        if (out.proposed !== true) break;
        receipts.push({
          outcome: "awaiting_approval",
          action: "Project proposed",
          subject: str(out.name) ?? "New project",
          details: [{ label: "Next", value: "Needs an Owner/Admin approval" }],
        });
        break;
      }
      default:
        break;
    }
  }

  return receipts;
}
