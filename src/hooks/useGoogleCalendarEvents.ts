import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  location: string | null;
  htmlLink: string | null;
  meetLink: string | null;
  updated: string | null;
}

export function useGoogleCalendarEvents(searchQuery?: string) {
  return useQuery({
    queryKey: ["google-calendar-events", searchQuery || "all"],
    queryFn: async () => {
      const body: Record<string, unknown> = {};
      if (searchQuery) {
        body.q = searchQuery;
        body.filterSource = false;
      }
      const { data, error } = await supabase.functions.invoke("fetch-calendar-events", {
        body,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar eventos");
      return data.events as GoogleCalendarEvent[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// Generate a Google Calendar "Add Event" URL
export function generateGoogleCalendarUrl(
  title: string,
  startDate: string,
  durationMinutes: number,
  description?: string | null,
  location?: string | null
): string {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatDate(start)}/${formatDate(end)}`,
  });

  if (description) params.set("details", description);
  if (location) params.set("location", location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
