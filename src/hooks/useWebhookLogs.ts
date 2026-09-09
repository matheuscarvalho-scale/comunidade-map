import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WebhookLog {
  id: string;
  provider: string;
  event_type: string | null;
  payload: Record<string, unknown> | null;
  status: string | null;
  error_message: string | null;
  user_created_id: string | null;
  customer_name: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface WebhookStats {
  total: number;
  success: number;
  error: number;
  ignored: number;
  received: number;
}

export function useWebhookLogs(filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  provider?: string;
}) {
  return useQuery({
    queryKey: ["webhook-logs", filters],
    queryFn: async (): Promise<WebhookLog[]> => {
      let query = supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.provider) {
        query = query.eq("provider", filters.provider);
      }

      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return (data as WebhookLog[]) || [];
    },
  });
}

export function useWebhookStats() {
  return useQuery({
    queryKey: ["webhook-stats"],
    queryFn: async (): Promise<WebhookStats> => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("status");

      if (error) throw error;

      const logs = data || [];
      return {
        total: logs.length,
        success: logs.filter((l) => l.status === "success").length,
        error: logs.filter((l) => l.status === "error").length,
        ignored: logs.filter((l) => l.status === "ignored").length,
        received: logs.filter((l) => l.status === "received").length,
      };
    },
  });
}
