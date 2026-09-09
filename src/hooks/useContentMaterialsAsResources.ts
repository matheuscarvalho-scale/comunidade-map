import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Resource } from "@/hooks/useResources";

function inferType(nameOrUrl: string): string {
  const ext = nameOrUrl.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "spreadsheet";
  if (ext === "ppt" || ext === "pptx") return "presentation";
  return "document";
}

const TYPE_LABEL: Record<string, string> = {
  document: "PDF",
  spreadsheet: "Planilha",
  presentation: "PowerPoint",
};

/** "Mentorias" -> "Mentoria", "Webinars" -> "Webinar" */
function singularize(title: string): string {
  return title.replace(/s$/i, "");
}

/**
 * Surfaces materials attached to lessons (content_item_materials) as read-only
 * entries in the Recursos list, so admins don't have to upload the same file twice.
 * Editing/removing still happens on the lesson itself (Trilha de Conteúdo).
 */
export function useContentMaterialsAsResources() {
  return useQuery({
    queryKey: ["content-materials-as-resources"],
    queryFn: async () => {
      const { data: tracks, error: tracksErr } = await supabase
        .from("content_tracks")
        .select("id, title")
        .eq("is_active", true);
      if (tracksErr || !tracks?.length) return [];
      const trackTitleById = new Map(tracks.map((t) => [t.id, t.title]));

      const { data: items, error: itemsErr } = await supabase
        .from("content_items")
        .select("id, title, track_id, presenter_name")
        .in("track_id", tracks.map((t) => t.id));
      if (itemsErr || !items?.length) return [];
      const itemById = new Map(items.map((it) => [it.id, it]));

      const { data: materials, error: materialsErr } = await supabase
        .from("content_item_materials")
        .select("id, content_item_id, url, name, created_at")
        .in("content_item_id", items.map((it) => it.id))
        .order("order_index", { ascending: true });
      if (materialsErr || !materials?.length) return [];

      return materials.reduce<Resource[]>((acc, m) => {
        const item = itemById.get(m.content_item_id);
        if (!item) return acc;
        const trackTitle = trackTitleById.get(item.track_id) || "Outros";
        const type = inferType(m.name || m.url);
        const person = item.presenter_name || item.title;
        acc.push({
          id: `material:${m.id}`,
          title: `${singularize(trackTitle)} - ${person} (${TYPE_LABEL[type] || "Arquivo"})`,
          description: `Material de apoio da aula "${item.title}"`,
          category: trackTitle,
          type,
          file_url: m.url,
          external_url: null,
          thumbnail: null,
          downloads_count: 0,
          is_premium: false,
          is_active: true,
          created_at: m.created_at,
          readOnly: true,
        });
        return acc;
      }, []);
    },
    staleTime: 60_000,
  });
}
