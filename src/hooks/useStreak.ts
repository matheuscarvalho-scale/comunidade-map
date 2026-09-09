import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUpdateStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!user) return null;

      // Get current profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("streak, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile for streak:", profileError);
        throw profileError;
      }
      if (!profile) {
        console.log("No profile found for streak update");
        return null;
      }
      
      console.log("Current profile streak data:", { streak: profile.streak, updated_at: profile.updated_at });

      const now = new Date();
      const lastUpdate = new Date(profile.updated_at);
      
      // Calculate days difference
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
      const daysDiff = Math.floor((nowDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      console.log("Streak calculation:", { nowDate, lastDate, daysDiff });

      let newStreak = profile.streak || 0;

      // First access ever: streak should start at 1
      if (newStreak === 0) {
        newStreak = 1;
        console.log("First access ever! Setting streak to 1");
      } else if (daysDiff === 0) {
        // Same day, don't update streak
        console.log("Same day access, keeping streak:", newStreak);
        return { streak: newStreak, updated: false };
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
        console.log("Consecutive day! Incrementing streak to:", newStreak);
      } else {
        // More than 1 day gap, reset streak to 1
        newStreak = 1;
        console.log("Streak broken! Resetting to 1. Days gap:", daysDiff);
      }

      // Update the profile with new streak
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ 
          streak: newStreak,
          updated_at: now.toISOString()
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating streak:", updateError);
        throw updateError;
      }

      console.log("Streak updated successfully to:", newStreak);
      return { streak: newStreak, updated: true };
    },
    onSuccess: (data) => {
      if (data?.updated) {
        // Invalidate profile queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    },
  });

  // Auto-update streak when the hook is used
  useEffect(() => {
    if (user) {
      updateStreakMutation.mutate();
    }
  }, [user]);

  return updateStreakMutation;
}
