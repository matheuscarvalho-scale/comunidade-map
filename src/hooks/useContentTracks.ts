import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentTrack {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  event_name: string | null;
  event_date: string | null;
  order_index: number;
  is_active: boolean;
  is_coming_soon: boolean;
  presenter_name: string | null;
  presenter_bio: string | null;
  presenter_avatar: string | null;
  created_at: string;
}

export interface OfficialMentor {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
}

export interface ContentItem {
  id: string;
  track_id: string;
  title: string;
  description: string | null;
  video_url?: string | null; // Hidden from public view for security
  cloudflare_video_uid: string | null;
  duration_minutes: number;
  speaker: string | null;
  category: string | null;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string;
  presenter_name: string | null;
  presenter_avatar: string | null;
  presenter_bio: string | null;
  official_mentors?: OfficialMentor[];
}

export interface ContentTrackWithItems extends ContentTrack {
  items: ContentItem[];
  totalItems: number;
}

// Get all unique categories from content items
export const CONTENT_CATEGORIES = [
  "IA Aplicada ao E-commerce",
  "Precificação",
  "Criação de Anúncios",
  "Logística e Operações",
  "Marketplaces",
  "Gestão Financeira",
] as const;

// Attach official mentors (many-to-many) to a list of content items
async function attachOfficialMentors<T extends { id: string }>(items: T[]): Promise<(T & { official_mentors: OfficialMentor[] })[]> {
  if (!items.length) return [];
  const itemIds = items.map((i) => i.id);
  const { data: links } = await supabase
    .from("content_item_mentors")
    .select("content_item_id, mentor_id, order_index")
    .in("content_item_id", itemIds)
    .order("order_index", { ascending: true });
  const mentorIds = Array.from(new Set((links || []).map((l) => l.mentor_id)));
  let mentorsById: Record<string, OfficialMentor> = {};
  if (mentorIds.length > 0) {
    const { data: mentors } = await (supabase as any)
      .from("mentors_public")
      .select("id, name, avatar_url, bio, specialty")
      .in("id", mentorIds);
    (mentors || []).forEach((m: OfficialMentor) => { mentorsById[m.id] = m; });
  }
  const byItem: Record<string, OfficialMentor[]> = {};
  (links || []).forEach((l) => {
    const m = mentorsById[l.mentor_id];
    if (m) (byItem[l.content_item_id] ||= []).push(m);
  });
  return items.map((i) => ({ ...i, official_mentors: byItem[i.id] || [] }));
}

// Fetch all content tracks ordered by order_index
export function useContentTracks() {
  return useQuery({
    queryKey: ["content-tracks"],
    queryFn: async () => {
      const { data: tracks, error } = await supabase
        .from("content_tracks")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;

      const trackIds = (tracks || []).map((t) => t.id);
      let countsByTrack: Record<string, number> = {};
      if (trackIds.length > 0) {
        const { data: items } = await supabase
          .from("content_items")
          .select("track_id")
          .in("track_id", trackIds);
        (items || []).forEach((it: { track_id: string }) => {
          countsByTrack[it.track_id] = (countsByTrack[it.track_id] || 0) + 1;
        });
      }

      return (tracks || []).map((t) => ({
        ...(t as ContentTrack),
        itemsCount: countsByTrack[t.id] || 0,
      })) as (ContentTrack & { itemsCount: number })[];
    },
  });
}

// Fetch content tracks grouped by category (legacy - keeping for compatibility)
export function useContentTracksByCategory() {
  return useQuery({
    queryKey: ["content-tracks-by-category"],
    queryFn: async () => {
      const { data: tracks, error } = await supabase
        .from("content_tracks")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;

      // Group by category
      const grouped: Record<string, ContentTrack[]> = {};
      (tracks || []).forEach(track => {
        if (!grouped[track.category]) {
          grouped[track.category] = [];
        }
        grouped[track.category].push(track as ContentTrack);
      });

      return grouped;
    },
  });
}

// Fetch single content track by slug with items
export function useContentTrackBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["content-track-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;

      // Fetch track by slug
      const { data: track, error: trackError } = await supabase
        .from("content_tracks")
        .select("*")
        .eq("slug", slug)
        .single();

      if (trackError) throw trackError;

      // Fetch items via secure view (hides video URLs)
      const { data: items, error: itemsError } = await (supabase as any)
        .from("content_items_public")
        .select("*")
        .eq("track_id", track.id)
        .order("order_index", { ascending: true });

      if (itemsError) throw itemsError;

      const itemsWithMentors = await attachOfficialMentors((items || []) as any[]);

      return {
        ...track,
        items: itemsWithMentors,
        totalItems: itemsWithMentors.length,
      } as ContentTrackWithItems;
    },
    enabled: !!slug,
  });
}

// Fetch single content track by ID with items (legacy - keeping for compatibility)
export function useContentTrackDetails(trackId: string | undefined) {
  return useQuery({
    queryKey: ["content-track-details", trackId],
    queryFn: async () => {
      if (!trackId) return null;

      // Fetch track
      const { data: track, error: trackError } = await supabase
        .from("content_tracks")
        .select("*")
        .eq("id", trackId)
        .single();

      if (trackError) throw trackError;

      // Fetch items via secure view (hides video URLs)
      const { data: items, error: itemsError } = await (supabase as any)
        .from("content_items_public")
        .select("*")
        .eq("track_id", trackId)
        .order("order_index", { ascending: true });

      if (itemsError) throw itemsError;

      const itemsWithMentors = await attachOfficialMentors((items || []) as any[]);

      return {
        ...track,
        items: itemsWithMentors,
        totalItems: itemsWithMentors.length,
      } as ContentTrackWithItems;
    },
    enabled: !!trackId,
  });
}
