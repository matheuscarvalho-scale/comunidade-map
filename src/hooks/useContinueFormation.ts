import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ContinueFormationData {
  formation: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
  module: {
    id: string;
    title: string;
  };
  lesson: {
    id: string;
    title: string;
  };
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
}

export function useContinueFormation() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["continue-formation", user?.id],
    queryFn: async (): Promise<ContinueFormationData | null> => {
      if (!user) return null;

      // Get all user's lesson progress, ordered by most recent
      const { data: progress, error: progressError } = await supabase
        .from("formation_lesson_progress")
        .select("lesson_id, completed, completed_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false });

      if (progressError) throw progressError;

      const completedLessonIds = new Set(progress?.map(p => p.lesson_id) || []);

      // Get all formations with their modules and lessons
      const { data: formations, error: formationsError } = await supabase
        .from("formations")
        .select("id, title, thumbnail_url, order_index, is_coming_soon")
        .eq("is_coming_soon", false)
        .order("order_index", { ascending: true });

      if (formationsError) throw formationsError;

      const { data: modules, error: modulesError } = await supabase
        .from("formation_modules")
        .select("id, formation_id, title, order_index")
        .order("order_index", { ascending: true });

      if (modulesError) throw modulesError;

      const { data: lessons, error: lessonsError } = await supabase
        .from("formation_lessons")
        .select("id, module_id, title, order_index")
        .order("order_index", { ascending: true });

      if (lessonsError) throw lessonsError;

      if (!formations || !modules || !lessons) return null;

      // Build a structured view
      for (const formation of formations) {
        const formationModules = modules.filter(m => m.formation_id === formation.id);
        
        let formationTotalLessons = 0;
        let formationCompletedLessons = 0;
        
        for (const module of formationModules) {
          const moduleLessons = lessons.filter(l => l.module_id === module.id);
          formationTotalLessons += moduleLessons.length;
          
          for (const lesson of moduleLessons) {
            if (completedLessonIds.has(lesson.id)) {
              formationCompletedLessons++;
            } else {
              // Found the next lesson to continue
              const progressPercent = formationTotalLessons > 0 
                ? Math.round((formationCompletedLessons / formationTotalLessons) * 100)
                : 0;

              // Only return if user has started this formation (has at least one completed lesson in it)
              const hasStarted = formationModules.some(m => 
                lessons.filter(l => l.module_id === m.id).some(l => completedLessonIds.has(l.id))
              );

              if (hasStarted || progress?.length === 0) {
                // Calculate total lessons for this formation for accurate progress
                const allFormationLessons = formationModules.flatMap(m => 
                  lessons.filter(l => l.module_id === m.id)
                );
                const totalLessonsInFormation = allFormationLessons.length;
                const completedInFormation = allFormationLessons.filter(l => completedLessonIds.has(l.id)).length;

                return {
                  formation: {
                    id: formation.id,
                    title: formation.title,
                    thumbnail_url: formation.thumbnail_url,
                  },
                  module: {
                    id: module.id,
                    title: module.title,
                  },
                  lesson: {
                    id: lesson.id,
                    title: lesson.title,
                  },
                  progressPercent: totalLessonsInFormation > 0 
                    ? Math.round((completedInFormation / totalLessonsInFormation) * 100)
                    : 0,
                  completedLessons: completedInFormation,
                  totalLessons: totalLessonsInFormation,
                };
              }
            }
          }
        }
      }

      // If all lessons are complete, return last formation
      if (formations.length > 0 && progress && progress.length > 0) {
        const lastFormation = formations[formations.length - 1];
        const formationModules = modules.filter(m => m.formation_id === lastFormation.id);
        const allFormationLessons = formationModules.flatMap(m => 
          lessons.filter(l => l.module_id === m.id)
        );
        
        return {
          formation: {
            id: lastFormation.id,
            title: lastFormation.title,
            thumbnail_url: lastFormation.thumbnail_url,
          },
          module: {
            id: formationModules[formationModules.length - 1]?.id || "",
            title: formationModules[formationModules.length - 1]?.title || "",
          },
          lesson: {
            id: allFormationLessons[allFormationLessons.length - 1]?.id || "",
            title: allFormationLessons[allFormationLessons.length - 1]?.title || "",
          },
          progressPercent: 100,
          completedLessons: allFormationLessons.length,
          totalLessons: allFormationLessons.length,
        };
      }

      return null;
    },
    enabled: !!user,
  });
}
