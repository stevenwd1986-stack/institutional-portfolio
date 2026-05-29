import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AuthUser {
  id:    string;
  email: string | undefined;
}

// ── Session query ─────────────────────────────────────────────────────────────

export function useSession() {
  return useQuery({
    queryKey:  ["auth-session"],
    queryFn:   async () => {
      if (!isSupabaseConfigured) return null;
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });
}

export function useAuthUser(): AuthUser | null {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email };
}

// ── Login mutation ────────────────────────────────────────────────────────────

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth-session"] }),
  });
}

// ── Logout mutation ───────────────────────────────────────────────────────────

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut();
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ── Listen for auth changes (call once at app root) ───────────────────────────

export function startAuthListener(onEvent: () => void) {
  if (!isSupabaseConfigured) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => onEvent());
  return () => subscription.unsubscribe();
}
