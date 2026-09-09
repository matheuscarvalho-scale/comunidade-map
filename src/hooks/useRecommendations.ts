import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Recommendation {
  title: string;
  description: string;
  type: "formation" | "webinar" | "track";
  content_id: string;
  route: string;
  priority: "alta" | "media" | "baixa";
  reason: string;
  // legacy field
  content_name?: string;
}

export interface NextStep {
  title: string;
  description: string;
  type: string;
  content_id: string;
  route: string;
  // legacy field
  content_name?: string;
}

export interface RecommendationsData {
  next_step: NextStep | null;
  recommendations: Recommendation[];
  motivational_message?: string;
  generated_at?: string;
}

export function useRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recommendations", user?.id],
    queryFn: async (): Promise<RecommendationsData | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        next_step: data.next_step as unknown as NextStep | null,
        recommendations: (data.recommendations as unknown as Recommendation[]) || [],
        generated_at: data.generated_at,
      };
    },
    enabled: !!user,
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-recommendations");

      if (error) throw error;
      return data as RecommendationsData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      toast({
        title: "Trilha atualizada! 🎯",
        description: data?.motivational_message || "Suas recomendações foram recalculadas com base no seu perfil.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao gerar recomendações",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
