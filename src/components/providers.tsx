/*
 * components/providers.tsx — global client providers.
 * Why: wires next-themes (class-based dark mode), TanStack Query (the single
 * data source for all screens), an auth/session context backed by
 * localStorage, and the sonner toast host — everything pages need, mounted
 * once in the root layout.
 */
"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import * as api from "@/lib/api";
import type { Session } from "@/lib/storage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

interface SessionCtxValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionCtx = createContext<SessionCtxValue>({
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function useSession() {
  return useContext(SessionCtx);
}

function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["session"], queryFn: api.getSession });

  const signIn = useCallback(
    async (email: string) => {
      await api.signIn(email);
      await refetch();
    },
    [refetch],
  );

  const signOut = useCallback(async () => {
    await api.signOut();
    qc.clear();
    await refetch();
    router.push("/");
  }, [qc, refetch, router]);

  const value = useMemo(
    () => ({ session: data ?? null, loading: isLoading, signIn, signOut }),
    [data, isLoading, signIn, signOut],
  );

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--surface)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-2)",
              fontSize: "14px",
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
