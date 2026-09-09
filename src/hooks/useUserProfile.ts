import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  specialties: string[] | null;
  location: string | null;
  social_links: Record<string, string>;
  total_points: number;
  streak: number;
  created_at: string;
  updated_at: string;
  job_title: string | null;
  company: string | null;
  industry: string | null;
}

export interface UserStats {
  coursesCompleted: number;
  coursesInProgress: number;
  mentoringsAttended: number;
  achievementsUnlocked: number;
  totalPoints: number;
  streak: number;
}

export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, avatar_url, streak, total_points, created_at, updated_at, bio, specialties, location, social_links, niche, location_state, location_city, experience_level, website_url, instagram_url, linkedin_url, is_public, job_title, company, industry")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      // Fetch phone from private table (RLS: only owner)
      const { data: priv } = await (supabase as any)
        .from("profiles_private")
        .select("phone")
        .eq("user_id", user.id)
        .maybeSingle();

      return { ...(data as any), phone: priv?.phone ?? null } as UserProfile | null;
    },
    enabled: !!user
  });
}

export function useUserStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get formations progress
      const { data: formations } = await supabase
        .from("formations")
        .select("id");

      const { data: modules } = await supabase
        .from("formation_modules")
        .select("id, formation_id");

      const { data: lessons } = await supabase
        .from("formation_lessons")
        .select("id, module_id");

      const { data: progress } = await supabase
        .from("formation_lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id);

      // Map lessons to formations
      const moduleToFormation: Record<string, string> = {};
      (modules || []).forEach(m => { moduleToFormation[m.id] = m.formation_id; });

      const lessonToFormation: Record<string, string> = {};
      const lessonsPerFormation: Record<string, string[]> = {};
      (lessons || []).forEach(l => {
        const fId = moduleToFormation[l.module_id];
        if (fId) {
          lessonToFormation[l.id] = fId;
          if (!lessonsPerFormation[fId]) lessonsPerFormation[fId] = [];
          lessonsPerFormation[fId].push(l.id);
        }
      });

      const completedLessons = new Set(
        (progress || []).filter(p => p.completed).map(p => p.lesson_id)
      );

      let coursesCompleted = 0;
      let coursesInProgress = 0;
      (formations || []).forEach(f => {
        const fLessons = lessonsPerFormation[f.id] || [];
        if (fLessons.length === 0) return;
        const done = fLessons.filter(id => completedLessons.has(id)).length;
        if (done === fLessons.length) coursesCompleted++;
        else if (done > 0) coursesInProgress++;
      });

      // Get achievements
      const { data: achievements } = await supabase
        .from("user_achievements")
        .select("unlocked_at")
        .eq("user_id", user.id);

      // Get mentoring checkins count
      const { data: checkins } = await supabase
        .from("mentoring_checkins")
        .select("id")
        .eq("user_id", user.id);

      // Get profile for points and streak
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points, streak")
        .eq("user_id", user.id)
        .maybeSingle();

      const achievementsUnlocked = (achievements || []).filter(a => a.unlocked_at).length;
      const mentoringsAttended = (checkins || []).length;

      return {
        coursesCompleted,
        coursesInProgress,
        mentoringsAttended,
        achievementsUnlocked,
        totalPoints: profile?.total_points || 0,
        streak: profile?.streak || 0
      } as UserStats;
    },
    enabled: !!user
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user) throw new Error("Not authenticated");

      // Extract phone — stored in profiles_private now
      const { phone, ...profileUpdates } = updates as any;

      const { data, error } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Persist phone in private table (owner-only RLS)
      if (phone !== undefined) {
        await (supabase as any)
          .from("profiles_private")
          .upsert({ user_id: user.id, phone }, { onConflict: "user_id" });

        // Sync to user_onboarding.whatsapp so partner systems pick it up
        await (supabase as any)
          .from("user_onboarding")
          .update({ whatsapp: phone })
          .eq("user_id", user.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    }
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  });
}
