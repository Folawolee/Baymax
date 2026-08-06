import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
// Type-only import — erased at compile time, so there's no runtime coupling
// to the backend package. This is what keeps the two apps independently
// runnable while still getting full end-to-end type safety.
import type { AppRouter } from "../../../src/server/trpc/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function makeTrpcClient(getToken: () => string | null) {
  return trpc.createClient({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: `${getApiUrl()}/trpc`,
        headers() {
          const token = getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
