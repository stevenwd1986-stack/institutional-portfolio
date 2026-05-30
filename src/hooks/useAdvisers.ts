import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AdviserRow {
  id:         string;
  first_name: string;
  last_name:  string;
  email:      string;
}

const DEMO_ADVISERS: AdviserRow[] = [
  { id: "demo-1", first_name: "Sarah",   last_name: "Mitchell", email: "s.mitchell@firm.com" },
  { id: "demo-2", first_name: "James",   last_name: "Hartley",  email: "j.hartley@firm.com"  },
  { id: "demo-3", first_name: "Rebecca", last_name: "Ford",     email: "r.ford@firm.com"     },
];

export function useAdvisers() {
  return useQuery<AdviserRow[]>({
    queryKey: ["advisers"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_ADVISERS;

      const { data, error } = await supabase
        .from("advisers")
        .select("id, first_name, last_name, email")
        .eq("is_active", true)
        .order("last_name");

      if (error) throw error;
      return data as AdviserRow[];
    },
    staleTime: 1000 * 60 * 10,
  });
}
