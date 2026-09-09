import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────

export interface CloudflareVideo {
  id: string;
  cloudflare_video_uid: string;
  title: string;
  description: string | null;
  duration: number;
  thumbnail_url: string | null;
  access_level: "public" | "members" | "pro" | "enterprise";
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Hooks ──────────────────────────────────────────────────

export function useCloudflareVideos() {
  return useQuery({
    queryKey: ["cloudflare-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cloudflare_videos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CloudflareVideo[];
    },
  });
}

export function useCloudflareVideo(videoUid: string | undefined) {
  return useQuery({
    queryKey: ["cloudflare-video", videoUid],
    queryFn: async () => {
      if (!videoUid) return null;
      const { data, error } = await supabase
        .from("cloudflare_videos")
        .select("*")
        .eq("cloudflare_video_uid", videoUid)
        .maybeSingle();

      if (error) throw error;
      return data as CloudflareVideo | null;
    },
    enabled: !!videoUid,
  });
}
