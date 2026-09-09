import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const NOTIFICATION_TYPES = [
  { key: "new_formation", label: "Formações", description: "Novas formações e aulas adicionadas" },
  { key: "new_webinar", label: "Webinars", description: "Novos webinars agendados" },
  { key: "new_track", label: "Trilhas de conteúdo", description: "Novas trilhas e conteúdos disponíveis" },
  { key: "new_mentoring", label: "Mentorias", description: "Lembretes de sessões de mentoria" },
  { key: "new_resource", label: "Recursos", description: "Novos recursos e materiais disponíveis" },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]["key"];

interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  is_enabled: boolean;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as NotificationPreference[];
    },
    enabled: !!user?.id,
  });

  const isEnabled = (type: string): boolean => {
    const pref = preferences?.find((p) => p.notification_type === type);
    // Default to true if no preference exists
    return pref ? pref.is_enabled : true;
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ type, enabled }: { type: string; enabled: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const existing = preferences?.find((p) => p.notification_type === type);

      if (existing) {
        const { error } = await (supabase as any)
          .from("notification_preferences")
          .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            notification_type: type,
            is_enabled: enabled,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });

  // Get disabled notification types for filtering
  const disabledTypes = NOTIFICATION_TYPES
    .filter((t) => !isEnabled(t.key))
    .map((t) => t.key);

  return {
    preferences,
    isLoading,
    isEnabled,
    toggle: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
    disabledTypes,
  };
}
