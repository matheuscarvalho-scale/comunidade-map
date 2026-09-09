import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Lesson {
  id: string;
  course_id: string;
  module_name: string;
  module_order: number;
  title: string;
  description: string | null;
  video_url: string | null;
  duration: string | null;
  lesson_order: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  watched_seconds: number;
  completed_at: string | null;
  created_at: string;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress;
  materials?: LessonMaterial[];
}

export interface Module {
  name: string;
  order: number;
  lessons: LessonWithProgress[];
}

export function useCourseLessons(courseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lessons", courseId, user?.id],
    queryFn: async () => {
      if (!courseId) return { modules: [], totalLessons: 0, completedLessons: 0 };

      // Fetch lessons
      const { data: lessons, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("module_order", { ascending: true })
        .order("lesson_order", { ascending: true });

      if (lessonsError) throw lessonsError;

      // Fetch user progress if logged in
      let progressMap: Record<string, LessonProgress> = {};
      if (user && lessons) {
        const lessonIds = lessons.map(l => l.id);
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("*")
          .eq("user_id", user.id)
          .in("lesson_id", lessonIds);

        if (progress) {
          progressMap = progress.reduce((acc, p) => {
            acc[p.lesson_id] = p;
            return acc;
          }, {} as Record<string, LessonProgress>);
        }
      }

      // Fetch materials
      let materialsMap: Record<string, LessonMaterial[]> = {};
      if (lessons) {
        const lessonIds = lessons.map(l => l.id);
        const { data: materials } = await supabase
          .from("lesson_materials")
          .select("*")
          .in("lesson_id", lessonIds);

        if (materials) {
          materialsMap = materials.reduce((acc, m) => {
            if (!acc[m.lesson_id]) acc[m.lesson_id] = [];
            acc[m.lesson_id].push(m);
            return acc;
          }, {} as Record<string, LessonMaterial[]>);
        }
      }

      // Group by modules
      const modulesMap = new Map<string, Module>();
      (lessons || []).forEach(lesson => {
        const key = `${lesson.module_order}-${lesson.module_name}`;
        if (!modulesMap.has(key)) {
          modulesMap.set(key, {
            name: lesson.module_name,
            order: lesson.module_order,
            lessons: []
          });
        }
        modulesMap.get(key)!.lessons.push({
          ...lesson,
          progress: progressMap[lesson.id],
          materials: materialsMap[lesson.id] || []
        });
      });

      const modules = Array.from(modulesMap.values()).sort((a, b) => a.order - b.order);
      const totalLessons = lessons?.length || 0;
      const completedLessons = Object.values(progressMap).filter(p => p.completed).length;

      return { modules, totalLessons, completedLessons };
    },
    enabled: !!courseId
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lessonId, courseId }: { lessonId: string; courseId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString()
        }, {
          onConflict: "user_id,lesson_id"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lessons", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    }
  });
}

export function useUpdateWatchProgress() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ lessonId, watchedSeconds }: { lessonId: string; watchedSeconds: number }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          watched_seconds: watchedSeconds
        }, {
          onConflict: "user_id,lesson_id"
        });

      if (error) throw error;
    }
  });
}
