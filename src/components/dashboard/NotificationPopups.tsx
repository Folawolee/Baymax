"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationFeed } from "@/lib/notificationFeed";

/**
 * Fixed top-right stack of dismissible alert cards. Mounted in the persistent
 * app layout (not on a page) so a dismissal survives navigation.
 */
export function NotificationPopups() {
  const { items, dismiss } = useNotificationFeed();
  const visible = items.slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {visible.map((item) => {
        const content = (
          <>
            <p className="pr-5 text-sm font-medium leading-snug">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
          </>
        );
        return (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto relative border-l-2 bg-popover p-3 shadow-sm ring-1 ring-border",
              item.status === "bad" ? "border-l-status-bad" : "border-l-status-warn",
            )}
          >
            <button
              onClick={() => dismiss(item)}
              aria-label="Dismiss"
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-3.5" />
            </button>
            {item.href ? (
              <Link href={item.href} className="block hover:opacity-80">
                {content}
              </Link>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
