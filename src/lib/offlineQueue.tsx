"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface QueuedAction {
  id: string;
  description: string;
  run: () => Promise<void>;
}

interface OfflineQueueValue {
  isOnline: boolean;
  pending: QueuedAction[];
  /** Runs `run` now if online; otherwise queues it and flushes automatically on reconnect. */
  enqueue: (description: string, run: () => Promise<void>) => Promise<void>;
}

const OfflineQueueContext = createContext<OfflineQueueValue | null>(null);

/**
 * Visual + functional stub for offline-tolerant data entry (build prompt §7,
 * UI spec §7/§9): queues mutations made while offline and replays them on
 * reconnect, with a visible count. In-memory only for this phase — a real
 * service-worker/IndexedDB-backed queue that survives a reload is future work.
 */
export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer, not an effect — reads the real value on the client's
  // first render and safely defaults to "online" during SSR (no `navigator`).
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pending, setPending] = useState<QueuedAction[]>([]);
  const flushing = useRef(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      while (true) {
        let next: QueuedAction | undefined;
        setPending((current) => {
          next = current[0];
          return current;
        });
        if (!next) break;
        try {
          await next.run();
        } catch {
          break; // stop on first failure — leave the rest queued rather than losing entries
        }
        const doneId = next.id;
        setPending((current) => current.filter((a) => a.id !== doneId));
      }
    } finally {
      flushing.current = false;
    }
  }, []);

  useEffect(() => {
    if (isOnline) void flush();
  }, [isOnline, flush]);

  const enqueue = useCallback(
    async (description: string, run: () => Promise<void>) => {
      if (isOnline) {
        await run();
        return;
      }
      setPending((current) => [...current, { id: crypto.randomUUID(), description, run }]);
    },
    [isOnline],
  );

  return (
    <OfflineQueueContext.Provider value={{ isOnline, pending, enqueue }}>{children}</OfflineQueueContext.Provider>
  );
}

export function useOfflineQueue(): OfflineQueueValue {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) throw new Error("useOfflineQueue must be used within OfflineQueueProvider");
  return ctx;
}
