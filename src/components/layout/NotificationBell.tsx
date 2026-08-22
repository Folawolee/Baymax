"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationFeed } from "@/lib/notificationFeed";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Header notification panel: real counts, working per-item dismiss, working clear-all. */
export function NotificationBell() {
  const { items, count, dismiss, clearAll } = useNotificationFeed();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={count > 0 ? `Notifications (${count} unread)` : "Notifications"}
        className="relative flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-status-bad px-1 text-[10px] font-semibold leading-4 text-status-bad-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notifications</p>
          {count > 0 && (
            <button onClick={clearAll} className="text-xs font-medium text-primary hover:underline">
              Clear all
            </button>
          )}
        </div>

        {count === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing needs your attention.</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="relative">
                <div className="flex gap-2.5 py-2.5 pl-3 pr-9">
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      item.status === "bad" ? "bg-status-bad" : "bg-status-warn",
                    )}
                  />
                  <div className="min-w-0">
                    {item.href ? (
                      <Link href={item.href} onClick={() => setOpen(false)} className="block hover:underline">
                        <p className="text-sm font-medium leading-snug">{item.title}</p>
                      </Link>
                    ) : (
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => dismiss(item)}
                  aria-label={`Dismiss: ${item.title}`}
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
