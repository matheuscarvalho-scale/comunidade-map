import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Re-export from useFormations for backward compatibility
// This file is deprecated - use useFormations.ts instead
export * from "./useFormations";

// Legacy aliases - these hooks are now in useFormations.ts
export { 
  useFormations as useLearningTracks, 
  useFormationDetails as useTrackDetails,
  useFormationLessonDetails as useLessonDetails,
  useMarkFormationLessonComplete as useMarkTrackLessonComplete
} from "./useFormations";

// Re-export types with legacy names
export type LearningTrack = import("./useFormations").Formation;
export type TrackModule = import("./useFormations").FormationModule;
export type TrackLesson = import("./useFormations").FormationLesson;
export type TrackLessonProgress = import("./useFormations").FormationLessonProgress;
export type TrackWithProgress = import("./useFormations").FormationWithProgress;
export type ModuleWithLessons = import("./useFormations").ModuleWithLessons;
