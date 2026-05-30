import { useQuery } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface AssetSlice {
  name:  string;
  value: number;
  color: string;
}

const DEMO_ASSETS: AssetSlice[] = [
  { name: "Equity",       value: 4_350_000, color: "#002147" },
  { name: "Fixed Income", value: 1_620_000, color: "#059669" },
  { name: "Property",     value:   590_000, color: "#7C3AED" },
  { name: "Alternatives", value:   420_000, color: "#F59E0B" },
  { name: "Cash",         value:   267_300, color: "#64748B" },
];

const ASSET_COLOR: Record<string, string> = {
  equity:        "#002147",
  fixed_income:  "#059669",
  bond:          "#059669",
  property:      "#7C3AED",
  alternative:   "#F59E0B",
  alternatives:  "#F59E0B",
  cash:          "#64748B",
};

const ASSET_LABEL: Record<string, string> = {
  equity:        "Equity",
  fixed_income:  "Fixed Income",
  bond:          "Fixed Income",
  property:      "Property",
  alternative:   "Alternatives",
  alternatives:  "Alternatives",
  cash:          "Cash",
};

export function useFirmAssetClasses() {
  return useQuery<AssetSlice[]>({
    queryKey: ["firm-asset-classes"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return DEMO_ASSETS;

      const { data, error } = await supabase
        .from("accounts")
        .select("holdings(current_value, instruments(asset_class))")
        .eq("is_active", true);

      if (error) throw error;

      const totals: Record<string, number> = {};
      for (const acct of data as any[]) {
        for (const h of acct.holdings ?? []) {
          const raw = (h.instruments?.asset_class ?? "other").toLowerCase();
          const key = ASSET_LABEL[raw] ? raw : "other";
          totals[key] = (totals[key] ?? 0) + (h.current_value ?? 0);
        }
      }

      return Object.entries(totals)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name:  ASSET_LABEL[k] ?? k.charAt(0).toUpperCase() + k.slice(1),
          value: v,
          color: ASSET_COLOR[k] ?? "#CBD5E1",
        }))
        .sort((a, b) => b.value - a.value);
    },
    staleTime: 1000 * 60 * 10,
  });
}
