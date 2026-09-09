import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("useAdmin: No user found");
        return false;
      }
      
      console.log("useAdmin: Checking admin role for user", user.id, user.email);
      
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        
        console.log("useAdmin: RPC response", { data, error, userId: user.id });
        
        if (error) {
          console.error("useAdmin: Error checking role", error);
          return false;
        }
        
        console.log("useAdmin: User is admin?", data);
        return data === true;
      } catch (e) {
        console.error("useAdmin: Exception", e);
        return false;
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
