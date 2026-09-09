import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Certificate {
  id: string;
  user_id: string;
  formation_id: string;
  formation_title: string;
  user_name: string;
  completed_at: string;
  certificate_url: string | null;
  certificate_number: string;
  created_at: string;
}

export function useCertificates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!user,
  });
}

export function useGenerateCertificate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-certificate", {
        body: { formationId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      
      if (data.svg) {
        // Download the SVG as an image
        const blob = new Blob([data.svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `certificado-${data.certificate.certificate_number}.svg`;
        a.setAttribute("data-ga-ignore", "true");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Certificado gerado! 🎉",
        description: "Seu certificado foi baixado com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Certificate generation error:", error);
      toast({
        title: "Erro ao gerar certificado",
        description: error.message || "Não foi possível gerar o certificado.",
        variant: "destructive",
      });
    },
  });
}
