import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Formation {
  id: string;
  title: string;
  description: string | null;
  level: string;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string;
  is_coming_soon?: boolean;
}

export interface FormationModule {
  id: string;
  formation_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface FormationLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  created_at: string;
}

export interface FormationLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface FormationWithProgress extends Formation {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
}

export interface ModuleWithLessons extends FormationModule {
  lessons: (FormationLesson & { isCompleted: boolean; isLocked: boolean })[];
  totalLessons: number;
  completedLessons: number;
}

// Fetch all formations with progress
export function useFormations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["formations", user?.id],
    queryFn: async () => {
      // Fetch all formations
      const { data: formations, error: formationsError } = await supabase
        .from("formations")
        .select("*")
        .order("order_index", { ascending: true });

      if (formationsError) throw formationsError;

      // Fetch all lessons for counting
      const { data: lessons, error: lessonsError } = await supabase
        .from("formation_lessons")
        .select("id, module_id");

      if (lessonsError) throw lessonsError;

      // Fetch all modules to map lessons to formations
      const { data: modules, error: modulesError } = await supabase
        .from("formation_modules")
        .select("id, formation_id");

      if (modulesError) throw modulesError;

      // Create a map of module_id -> formation_id
      const moduleToFormation: Record<string, string> = {};
      modules?.forEach(m => {
        moduleToFormation[m.id] = m.formation_id;
      });

      // Count lessons per formation
      const lessonsPerFormation: Record<string, string[]> = {};
      lessons?.forEach(l => {
        const formationId = moduleToFormation[l.module_id];
        if (formationId) {
          if (!lessonsPerFormation[formationId]) lessonsPerFormation[formationId] = [];
          lessonsPerFormation[formationId].push(l.id);
        }
      });

      // Fetch user progress if logged in
      let progressMap: Record<string, boolean> = {};
      if (user && lessons && lessons.length > 0) {
        const lessonIds = lessons.map(l => l.id);
        const { data: progress } = await supabase
          .from("formation_lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);

        if (progress) {
          progress.forEach(p => {
            if (p.completed) progressMap[p.lesson_id] = true;
          });
        }
      }

      // Enrich presenter info from profiles when missing
      const presenterNames = (formations || [])
        .filter(f => (f as any).presenter_name && (!(f as any).presenter_bio || !(f as any).presenter_avatar))
        .map(f => (f as any).presenter_name as string);

      let presenterProfiles: Record<string, { bio: string | null; avatar_url: string | null }> = {};
      if (presenterNames.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles_public")
          .select("name, bio, avatar_url")
          .in("name", presenterNames);

        if (profiles) {
          profiles.forEach(p => {
            presenterProfiles[p.name] = { bio: p.bio, avatar_url: p.avatar_url };
          });
        }
      }

      // Calculate progress for each formation
      const formationsWithProgress: FormationWithProgress[] = (formations || []).map(formation => {
        const formationLessonIds = lessonsPerFormation[formation.id] || [];
        const totalLessons = formationLessonIds.length;
        const completedLessons = formationLessonIds.filter(id => progressMap[id]).length;
        const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        // Enrich presenter data from profile if missing
        const presenterName = (formation as any).presenter_name;
        const profileData = presenterName ? presenterProfiles[presenterName] : null;

        return {
          ...formation,
          presenter_bio: (formation as any).presenter_bio || profileData?.bio || null,
          presenter_avatar: (formation as any).presenter_avatar || profileData?.avatar_url || null,
          totalLessons,
          completedLessons,
          progressPercent,
        };
      });

      return formationsWithProgress;
    },
    enabled: true,
  });
}

// Fetch single formation with modules and lessons
export function useFormationDetails(formationId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["formation-details", formationId, user?.id],
    queryFn: async () => {
      if (!formationId) return null;

      // Fetch formation
      const { data: formation, error: formationError } = await supabase
        .from("formations")
        .select("*")
        .eq("id", formationId)
        .single();

      if (formationError) throw formationError;

      // Enrich presenter from profile if missing
      if ((formation as any).presenter_name && (!(formation as any).presenter_bio || !(formation as any).presenter_avatar)) {
        const { data: profileMatch } = await (supabase as any)
          .from("profiles_public")
          .select("bio, avatar_url")
          .eq("name", (formation as any).presenter_name)
          .maybeSingle();

        if (profileMatch) {
          (formation as any).presenter_bio = (formation as any).presenter_bio || profileMatch.bio;
          (formation as any).presenter_avatar = (formation as any).presenter_avatar || profileMatch.avatar_url;
        }
      }

      // Fetch modules
      const { data: modules, error: modulesError } = await supabase
        .from("formation_modules")
        .select("*")
        .eq("formation_id", formationId)
        .order("order_index", { ascending: true });

      if (modulesError) throw modulesError;

      // Fetch lessons for all modules
      const moduleIds = modules?.map(m => m.id) || [];
      let lessons: FormationLesson[] = [];
      if (moduleIds.length > 0) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from("formation_lessons")
          .select("*")
          .in("module_id", moduleIds)
          .order("order_index", { ascending: true });

        if (lessonsError) throw lessonsError;
        lessons = lessonsData || [];
      }

      // Fetch user progress
      let progressMap: Record<string, boolean> = {};
      if (user && lessons.length > 0) {
        const lessonIds = lessons.map(l => l.id);
        const { data: progress } = await supabase
          .from("formation_lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);

        if (progress) {
          progress.forEach(p => {
            if (p.completed) progressMap[p.lesson_id] = true;
          });
        }
      }

      // Group lessons by module and calculate lock status
      const allLessonsOrdered: string[] = [];
      const lessonsByModule: Record<string, FormationLesson[]> = {};
      
      modules?.forEach(m => {
        lessonsByModule[m.id] = lessons
          .filter(l => l.module_id === m.id)
          .sort((a, b) => a.order_index - b.order_index);
        lessonsByModule[m.id].forEach(l => allLessonsOrdered.push(l.id));
      });

      // Sequential locking: must complete previous lesson to unlock next
      const lockedLessons = new Set<string>();
      for (let i = 1; i < allLessonsOrdered.length; i++) {
        const prevId = allLessonsOrdered[i - 1];
        if (!progressMap[prevId]) {
          for (let j = i; j < allLessonsOrdered.length; j++) {
            lockedLessons.add(allLessonsOrdered[j]);
          }
          break;
        }
      }

      // Build modules with lessons
      const modulesWithLessons: ModuleWithLessons[] = (modules || []).map(m => {
        const moduleLessons = lessonsByModule[m.id] || [];
        const lessonsWithStatus = moduleLessons.map(l => ({
          ...l,
          isCompleted: progressMap[l.id] || false,
          isLocked: lockedLessons.has(l.id),
        }));

        return {
          ...m,
          lessons: lessonsWithStatus,
          totalLessons: moduleLessons.length,
          completedLessons: moduleLessons.filter(l => progressMap[l.id]).length,
        };
      });

      const totalLessons = lessons.length;
      const completedLessons = Object.values(progressMap).filter(Boolean).length;

      return {
        formation,
        modules: modulesWithLessons,
        totalLessons,
        completedLessons,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    },
    enabled: !!formationId,
  });
}

// Fetch single lesson details
export function useFormationLessonDetails(lessonId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["formation-lesson-details", lessonId, user?.id],
    queryFn: async () => {
      if (!lessonId) return null;

      // Fetch lesson
      const { data: lesson, error: lessonError } = await supabase
        .from("formation_lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (lessonError) throw lessonError;

      // Fetch module to get formation_id
      const { data: module, error: moduleError } = await supabase
        .from("formation_modules")
        .select("*, formations(*)")
        .eq("id", lesson.module_id)
        .single();

      if (moduleError) throw moduleError;

      // Enrich formation presenter from profiles if missing
      const formation = module.formations as any;
      if (formation?.presenter_name && (!formation?.presenter_bio || !formation?.presenter_avatar)) {
        const { data: profileMatch } = await (supabase as any)
          .from("profiles_public")
          .select("bio, avatar_url")
          .eq("name", formation.presenter_name)
          .maybeSingle();

        if (profileMatch) {
          formation.presenter_bio = formation.presenter_bio || profileMatch.bio;
          formation.presenter_avatar = formation.presenter_avatar || profileMatch.avatar_url;
        }
      }

      // Fetch user progress for this lesson
      let isCompleted = false;
      if (user) {
        const { data: progress } = await supabase
          .from("formation_lesson_progress")
          .select("completed")
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId)
          .maybeSingle();

        isCompleted = progress?.completed || false;
      }

      // Fetch all lessons in this module for navigation
      const { data: moduleLessons } = await supabase
        .from("formation_lessons")
        .select("id, title, order_index")
        .eq("module_id", lesson.module_id)
        .order("order_index", { ascending: true });

      // Find previous and next lessons
      const currentIndex = moduleLessons?.findIndex(l => l.id === lessonId) ?? -1;
      const prevLesson = currentIndex > 0 ? moduleLessons?.[currentIndex - 1] : null;
      const nextLesson = currentIndex < (moduleLessons?.length || 0) - 1 ? moduleLessons?.[currentIndex + 1] : null;

      return {
        lesson,
        module,
        formation: module.formations,
        isCompleted,
        prevLesson,
        nextLesson,
      };
    },
    enabled: !!lessonId,
  });
}

// Mark lesson as complete
export function useMarkFormationLessonComplete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lessonId }: { lessonId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("formation_lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,lesson_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formations"] });
      queryClient.invalidateQueries({ queryKey: ["formation-details"] });
      queryClient.invalidateQueries({ queryKey: ["formation-lesson-details"] });
    },
  });
}
