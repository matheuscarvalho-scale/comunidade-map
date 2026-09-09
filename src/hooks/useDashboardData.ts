import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Get time-based greeting in Portuguese
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Hook for next mentoring session
export function useNextMentoring() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["nextMentoring"],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Fetch next upcoming mentoring
      const { data: sessions, error } = await supabase
        .from("mentoring_sessions_public" as any)
        .select("*")
        .eq("is_active", true)
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(1);

      if (error) throw error;

      const data = ((sessions || []) as any[])[0];


      if (data) {
        // Check if user already checked in
        const { data: checkin } = await supabase
          .from("mentoring_checkins")
          .select("id")
          .eq("session_id", data.id)
          .eq("user_id", user?.id)
          .maybeSingle();

        return {
          ...data,
          hasCheckedIn: !!checkin
        };
      }

      return null;
    },
    enabled: !!user
  });
}

// Hook for next webinar
export function useNextWebinar() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["nextWebinar", user?.id],
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data: webinars, error } = await supabase
        .from("webinars")
        .select("id,title,presenter_name,presenter_avatar,scheduled_at,duration_minutes,meeting_url")
        .eq("is_active", true)
        .gte("scheduled_at", now)
        .order("scheduled_at", { ascending: true })
        .limit(1);

      if (error) throw error;
      const data = (webinars || [])[0];
      if (!data) return null;

      const { data: checkin } = await supabase
        .from("webinar_checkins")
        .select("id")
        .eq("webinar_id", data.id)
        .eq("user_id", user?.id as string)
        .maybeSingle();

      return { ...data, hasCheckedIn: !!checkin };
    },
    enabled: !!user,
  });
}



// Hook for current course in progress
export function useContinueLearning() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["continueLearning", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get enrollments with progress > 0 and not completed
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("*, course_id")
        .eq("user_id", user.id)
        .is("completed_at", null)
        .gt("progress", 0)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (enrollmentError) throw enrollmentError;
      if (!enrollments) return null;

      // Get course details
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", enrollments.course_id)
        .single();

      if (courseError) throw courseError;

      return {
        course,
        progress: enrollments.progress || 0,
        startedAt: enrollments.started_at
      };
    },
    enabled: !!user
  });
}

// Hook for platform updates
export function usePlatformUpdates() {
  return useQuery({
    queryKey: ["platformUpdates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_updates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
      .limit(5);

      if (error) throw error;
      return data;
    }
  });
}

// Hook for recent achievements with details
export function useRecentAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recentAchievements", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's unlocked achievements
      const { data: userAchievements, error: uaError } = await supabase
        .from("user_achievements")
        .select("*, achievement_id")
        .eq("user_id", user.id)
        .not("unlocked_at", "is", null)
        .order("unlocked_at", { ascending: false })
        .limit(3);

      if (uaError) throw uaError;
      if (!userAchievements || userAchievements.length === 0) return [];

      // Get achievement details
      const achievementIds = userAchievements.map(ua => ua.achievement_id);
      const { data: achievements, error: aError } = await supabase
        .from("achievements")
        .select("*")
        .in("id", achievementIds);

      if (aError) throw aError;

      // Merge data
      return userAchievements.map(ua => {
        const achievement = achievements?.find(a => a.id === ua.achievement_id);
        return {
          ...ua,
          name: achievement?.name || "Conquista",
          description: achievement?.description || "",
          icon: achievement?.icon || "🏆",
          points: achievement?.points || 0
        };
      });
    },
    enabled: !!user
  });
}

// Hook to check in to a mentoring session
export function useMentoringCheckin() {
  const { user } = useAuth();

  const checkin = async (sessionId: string) => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .rpc('mentoring_checkin', {
        _session_id: sessionId,
        _user_id: user.id
      });

    if (error) throw error;
    const result = data as { success: boolean; error?: string };
    if (!result.success) throw new Error(result.error || 'Check-in failed');
    return result;
  };

  return { checkin };
}
