export type Role = "OWNER_ADMIN" | "SITE_LEAD" | "PROCUREMENT_OFFICER" | "WAREHOUSE_KEEPER" | "FINANCE" | "VIEWER";

export const ROLE_LABELS: Record<Role, string> = {
  OWNER_ADMIN: "Admin",
  SITE_LEAD: "Site Lead",
  PROCUREMENT_OFFICER: "Procurement Officer",
  WAREHOUSE_KEEPER: "Warehouse Keeper",
  FINANCE: "Finance",
  VIEWER: "Viewer",
};
