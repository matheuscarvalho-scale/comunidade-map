import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  category: string;
  level: string;
  lessons_count: number;
  students_count: number;
  duration: string | null;
  instructor: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  started_at: string;
  completed_at: string | null;
}

export interface CourseWithProgress extends Course {
  enrollment?: Enrollment;
}

export function useCourses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["courses", user?.id],
    queryFn: async () => {
      // Get all courses
      const { data: courses, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      // Get user enrollments if logged in
      let enrollments: Enrollment[] = [];
      if (user) {
        const { data: userEnrollments, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("*")
          .eq("user_id", user.id);

        if (enrollmentsError) throw enrollmentsError;
        enrollments = userEnrollments || [];
      }

      // Merge courses with enrollment data
      const coursesWithProgress: CourseWithProgress[] = (courses || []).map((course) => {
        const enrollment = enrollments.find((e) => e.course_id === course.id);
        return { ...course, enrollment };
      });

      return coursesWithProgress;
    },
    enabled: true,
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ courseId, progress }: { courseId: string; progress: number }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("enrollments")
        .update({ 
          progress,
          completed_at: progress === 100 ? new Date().toISOString() : null 
        })
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
