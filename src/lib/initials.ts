/** "Ada Lovelace" -> "AL", "Cher" -> "C" — used for the account avatar fallback. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
