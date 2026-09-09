import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ScarcityConfig {
  webinar_id: string;
  base_fake_registrations: number;
  show_live_counter: boolean;
  show_notifications: boolean;
  is_active: boolean;
  min_checkins_to_show: number;
}

export function useWebinarScarcity() {
  return useQuery({
    queryKey: ["webinar-scarcity-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_scarcity_config")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      const map: Record<string, ScarcityConfig> = {};
      (data || []).forEach((c: ScarcityConfig) => {
        map[c.webinar_id] = c;
      });
      return map;
    },
  });
}
