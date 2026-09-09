import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the mentoring meeting URL. The backend only returns it for admins or
 * inside the access window (30 min before the session until 30 min after it ends).
 */
export async function fetchMentoringMeetingUrl(sessionId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_mentoring_meeting_url" as never, {
    _session_id: sessionId,
  } as never);
  if (error) return null;
  return (data as string | null) || null;
}
