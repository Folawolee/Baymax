"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, makeTrpcClient } from "@/lib/trpc";
import { AuthProvider, TOKEN_KEY } from "@/lib/auth";
import { OfflineQueueProvider } from "@/lib/offlineQueue";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  const [trpcClient] = useState(() => makeTrpcClient(getStoredToken));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OfflineQueueProvider>{children}</OfflineQueueProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
