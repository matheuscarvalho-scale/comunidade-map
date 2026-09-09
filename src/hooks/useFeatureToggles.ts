import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeatureToggle {
  id: string;
  feature_key: string;
  label: string;
  is_enabled: boolean;
}

export function useFeatureToggles() {
  const queryClient = useQueryClient();

  const { data: toggles = [], isLoading } = useQuery({
    queryKey: ["feature-toggles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_toggles")
        .select("id, feature_key, label, is_enabled")
        .order("label");
      if (error) throw error;
      return data as FeatureToggle[];
    },
    staleTime: 5_000,
  });

  const toggleMap = toggles.reduce<Record<string, boolean>>((acc, t) => {
    acc[t.feature_key] = t.is_enabled;
    return acc;
  }, {});

  const toggleMutation = useMutation({
    mutationFn: async ({ featureKey, enabled }: { featureKey: string; enabled: boolean }) => {
      const { data, error } = await supabase
        .from("feature_toggles")
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq("feature_key", featureKey)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Falha ao atualizar toggle");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-toggles"] });
    },
  });

  const isEnabled = (featureKey: string) => toggleMap[featureKey] ?? true;

  return { toggles, toggleMap, isEnabled, isLoading, toggleMutation };
}
