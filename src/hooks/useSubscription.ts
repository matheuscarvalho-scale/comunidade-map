import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SubscriptionInfo {
  status: "active" | "expired" | "pending" | "refunded" | null;
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  canAccess: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<SubscriptionInfo> => {
      if (!user) {
        return {
          status: null,
          plan: null,
          startDate: null,
          endDate: null,
          daysRemaining: null,
          isExpired: false,
          canAccess: false,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
        };
      }

      const { data: rpcData, error } = await (supabase as any).rpc("get_my_subscription");
      if (error) throw error;
      const profile = Array.isArray(rpcData) ? rpcData[0] : rpcData;

      // Fetch payment identifiers separately
      const { data: paymentIds } = await supabase
        .from("payment_identifiers")
        .select("stripe_customer_id, stripe_subscription_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const endDate = profile?.subscription_end_date 
        ? new Date(profile.subscription_end_date) 
        : null;
      
      let daysRemaining: number | null = null;
      let isExpired = false;

      if (endDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        const diffTime = endDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Immediate block after expiration (no grace period)
        isExpired = daysRemaining < 0;
      }

      const status = profile?.subscription_status as SubscriptionInfo["status"] || null;
      
      // Can access only if active or no end_date set (lifetime/manual)
      // NO GRACE PERIOD - immediate block on expiration
      // Refunded users are also blocked
      const canAccess = 
        status === "active" || 
        (!profile?.subscription_end_date && status !== "refunded" && status !== "expired");

      return {
        status,
        plan: profile?.subscription_plan || null,
        startDate: profile?.subscription_start_date || null,
        endDate: profile?.subscription_end_date || null,
        daysRemaining,
        isExpired,
        canAccess,
        stripeCustomerId: paymentIds?.stripe_customer_id || null,
        stripeSubscriptionId: paymentIds?.stripe_subscription_id || null,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function getPlanDisplayName(plan: string | null): string {
  switch (plan) {
    case "basic": return "Basic";
    case "starter": return "Basic"; // legacy
    case "pro": return "Pro";
    case "business": return "Business";
    case "enterprise": return "Business"; // legacy
    default: return "MAP Acelera";
  }
}

export function getStatusDisplayInfo(status: SubscriptionInfo["status"]): { label: string; color: string; bgColor: string } {
  switch (status) {
    case "active":
      return { label: "Ativa", color: "text-green-500", bgColor: "bg-green-500/10" };
    case "expired":
      return { label: "Expirada", color: "text-red-500", bgColor: "bg-red-500/10" };
    case "refunded":
      return { label: "Reembolsada", color: "text-orange-500", bgColor: "bg-orange-500/10" };
    case "pending":
      return { label: "Pendente", color: "text-blue-500", bgColor: "bg-blue-500/10" };
    default:
      return { label: "Não definido", color: "text-muted-foreground", bgColor: "bg-muted/10" };
  }
}
