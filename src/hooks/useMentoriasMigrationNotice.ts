import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Membros criados ANTES desta data veem o aviso da migração.
// Novos cadastros nunca veem.
const DEPLOY_DATE = "2026-07-09T00:00:00Z";

export function useMentoriasMigrationNotice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mentorias-migration-notice", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at, seen_mentorias_migration_notice")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const dismiss = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({ seen_mentorias_migration_notice: true })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorias-migration-notice"] });
    },
  });

  const shouldShow = Boolean(
    query.data &&
      !query.data.seen_mentorias_migration_notice &&
      query.data.created_at &&
      new Date(query.data.created_at).getTime() < new Date(DEPLOY_DATE).getTime()
  );

  return { shouldShow, dismiss: () => dismiss.mutate(), isDismissing: dismiss.isPending };
}
