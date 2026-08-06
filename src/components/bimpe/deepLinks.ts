export interface ToolCallResult {
  toolName: string;
  input: unknown;
  output: unknown;
}

export interface DeepLink {
  label: string;
  href: string;
}

/**
 * Bimpe's replies should deep-link to the record they're about (UI spec §8).
 * Reads the ids already present in each tool's output — see
 * src/server/bimpe/tools/*.ts on the backend for the exact response shapes.
 */
export function buildDeepLinks(toolResults: ToolCallResult[]): DeepLink[] {
  const links: DeepLink[] = [];

  for (const result of toolResults) {
    const output = result.output as Record<string, unknown> | undefined;
    if (!output) continue;

    switch (result.toolName) {
      case "get_stock_level": {
        const levels = output.levels as Array<{ materialId?: string }> | undefined;
        const materialId = levels?.[0]?.materialId;
        if (typeof materialId === "string") links.push({ label: "View material", href: `/materials/${materialId}` });
        break;
      }
      case "get_delivery_status": {
        const orders = output.orders as Array<{ purchaseOrderId?: string }> | undefined;
        const poId = orders?.[0]?.purchaseOrderId;
        if (typeof poId === "string") links.push({ label: "View purchase order", href: `/procurement/${poId}` });
        break;
      }
      case "get_production_status": {
        const siteId = (output as { siteId?: string }).siteId;
        if (typeof siteId === "string") links.push({ label: "View production", href: `/production/${siteId}` });
        break;
      }
      case "list_pending_approvals": {
        const approvals = output.approvals as Array<{ purchaseOrderId?: string }> | undefined;
        if (approvals && approvals.length > 0) links.push({ label: "Open approvals queue", href: "/procurement/approvals" });
        break;
      }
      case "draft_purchase_order": {
        const poId = (output as { purchaseOrderId?: string }).purchaseOrderId;
        if (typeof poId === "string") links.push({ label: "View draft order", href: `/procurement/${poId}` });
        break;
      }
    }
  }

  return links;
}
