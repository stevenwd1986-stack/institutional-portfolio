import { useQuery } from "@tanstack/react-query";

export interface ClientRow {
  id:              string;
  first_name:      string;
  last_name:       string;
  risk_profile:    string;
  total_aum:       number;
  sipp_value:      number;
  isa_value:       number;
  gia_value:       number;
  bond_value:      number;
  performance_1y:  number;
  last_updated:    string;
}

export const DEMO_CLIENTS: ClientRow[] = [
  { id: "c1", first_name: "James",   last_name: "Thornton",  risk_profile: "MEDIUM_HIGH", total_aum: 2_847_300, sipp_value: 1_420_000, isa_value: 400_000, gia_value: 850_000, bond_value: 177_300, performance_1y:  0.112, last_updated: "2026-05-27" },
  { id: "c2", first_name: "Eleanor", last_name: "Whitfield", risk_profile: "MEDIUM",      total_aum: 1_540_000, sipp_value:   890_000, isa_value: 320_000, gia_value: 330_000, bond_value:       0, performance_1y:  0.074, last_updated: "2026-05-26" },
  { id: "c3", first_name: "Robert",  last_name: "Ashworth",  risk_profile: "HIGH",         total_aum: 4_210_500, sipp_value: 2_100_000, isa_value: 800_000, gia_value: 1_100_000, bond_value: 210_500, performance_1y: 0.143, last_updated: "2026-05-27" },
  { id: "c4", first_name: "Patricia",last_name: "Langley",   risk_profile: "LOW",          total_aum:   620_000, sipp_value:   380_000, isa_value: 200_000, gia_value:  40_000, bond_value:       0, performance_1y:  0.039, last_updated: "2026-05-25" },
  { id: "c5", first_name: "David",   last_name: "Hargreaves", risk_profile: "MEDIUM",     total_aum: 1_920_000, sipp_value:   950_000, isa_value: 400_000, gia_value: 570_000, bond_value:       0, performance_1y:  0.088, last_updated: "2026-05-27" },
  { id: "c6", first_name: "Susan",   last_name: "Pemberton", risk_profile: "MEDIUM_LOW",   total_aum:   780_000, sipp_value:   480_000, isa_value: 200_000, gia_value: 100_000, bond_value:       0, performance_1y:  0.052, last_updated: "2026-05-24" },
  { id: "c7", first_name: "Michael", last_name: "Forsythe",  risk_profile: "VERY_HIGH",    total_aum: 6_150_000, sipp_value: 2_800_000, isa_value: 800_000, gia_value: 1_800_000, bond_value: 750_000, performance_1y: 0.189, last_updated: "2026-05-27" },
  { id: "c8", first_name: "Helen",   last_name: "Carmichael",risk_profile: "MEDIUM",       total_aum: 1_100_000, sipp_value:   640_000, isa_value: 260_000, gia_value: 200_000, bond_value:       0, performance_1y: -0.021, last_updated: "2026-05-22" },
];

export function useClients() {
  return useQuery<ClientRow[]>({
    queryKey: ["clients"],
    queryFn: async () => DEMO_CLIENTS,
    staleTime: 1000 * 60 * 5,
    placeholderData: DEMO_CLIENTS,
  });
}
