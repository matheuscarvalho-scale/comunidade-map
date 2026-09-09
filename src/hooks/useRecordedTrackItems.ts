import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecordedTrackItem {
  id: string;
  title: string;
  duration_minutes: number | null;
  order_index: number;
  created_at: string;
  presenter_name: string | null;
  presenter_avatar: string | null;
  cloudflare_video_uid: string | null;
  track_id: string;
  materials: { url: string; name: string | null }[];
  source: "webinar" | "mentoria";
}

function extractDate(title: string): number {
  const m = title.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return new Date(`${y}-${mo}-${d}T00:00:00Z`).getTime();
  }
  return 0;
}

/**
 * Fetches recorded content items (with their materials) for the given
 * content_tracks slugs, sorted by the date in the title (newest first).
 */
export function useRecordedTrackItems(slugs: string[]) {
  return useQuery({
    queryKey: ["recorded-track-items", ...slugs],
    queryFn: async (): Promise<RecordedTrackItem[]> => {
      const { data: tracks, error: trackErr } = await supabase
        .from("content_tracks")
        .select("id, slug")
        .in("slug", slugs);
      if (trackErr || !tracks || tracks.length === 0) return [];

      const typedTracks = tracks as Array<{ id: string; slug: string }>;
      const trackIds = typedTracks.map((t) => t.id);
      const trackSlugById: Record<string, string> = {};
      typedTracks.forEach((t) => { trackSlugById[t.id] = t.slug; });

      const { data: items, error: itemsErr } = await (supabase as any)
        .from("content_items")
        .select("id, title, duration_minutes, order_index, created_at, presenter_name, presenter_avatar, cloudflare_video_uid, track_id")
        .in("track_id", trackIds);
      if (itemsErr) return [];

      const itemIds = (items || []).map((it: { id: string }) => it.id);
      const materialsByItem: Record<string, { url: string; name: string | null }[]> = {};
      if (itemIds.length > 0) {
        const { data: materials } = await supabase
          .from("content_item_materials")
          .select("content_item_id, url, name, order_index")
          .in("content_item_id", itemIds)
          .order("order_index", { ascending: true });
        (materials || []).forEach((m: { content_item_id: string; url: string; name: string | null }) => {
          (materialsByItem[m.content_item_id] ||= []).push({ url: m.url, name: m.name });
        });
      }

      const mapped: RecordedTrackItem[] = ((items || []) as Array<Omit<RecordedTrackItem, "materials" | "source">>).map((it) => ({
        ...it,
        materials: materialsByItem[it.id] || [],
        source: trackSlugById[it.track_id] === "webinars" ? "webinar" : "mentoria",
      }));

      mapped.sort((a, b) => {
        const da = extractDate(a.title) || new Date(a.created_at).getTime();
        const db = extractDate(b.title) || new Date(b.created_at).getTime();
        return db - da;
      });

      return mapped;
    },
    staleTime: 60_000,
  });
}
