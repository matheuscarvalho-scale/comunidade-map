// Google Calendar event lookup (fetch-calendar-events) was removed along with the
// Google integration; this type is kept because several pages still type their
// (now always-empty) local event lists against it.
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
