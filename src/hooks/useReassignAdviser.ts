import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface ReassignParams {
  clientIds:    string[];
  newAdviserId: string;
}

export function useReassignAdviser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientIds, newAdviserId }: ReassignParams) => {
      const { error } = await supabase
        .from("clients")
        .update({ adviser_id: newAdviserId, updated_at: new Date().toISOString() })
        .in("id", clientIds);

      if (error) throw error;
    },
    onSuccess: (_data, { clientIds }) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      clientIds.forEach((id) =>
        queryClient.invalidateQueries({ queryKey: ["client", id] })
      );
    },
  });
}
