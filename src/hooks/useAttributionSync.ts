import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredAttribution } from "@/lib/attribution";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Vincula a atribuição capturada (first/last touch) ao usuário autenticado.
 * O first_touch nunca é sobrescrito depois de gravado; o last_touch é atualizado.
 */
export function useAttributionSync() {
  const { user } = useAuth();
  const doneFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user || doneFor.current === user.id) return;
    doneFor.current = user.id;

    const stored = getStoredAttribution();
    if (!stored) return;
    const { first, last } = stored;

    (async () => {
      try {
        const { data: existing } = await supabase
          .from("member_attribution")
          .select("user_id, first_touch_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!existing) {
          await supabase.from("member_attribution").insert({
            user_id: user.id,
            utm_source: first.utm_source,
            utm_medium: first.utm_medium,
            utm_campaign: first.utm_campaign,
            utm_content: first.utm_content,
            utm_term: first.utm_term,
            gclid: first.gclid,
            fbclid: first.fbclid,
            referrer: first.referrer,
            landing_page: first.landing_page,
            source_type: first.source_type,
            origin: first.origin,
            first_touch_at: first.touch_at,
            last_touch_at: last.touch_at,
          });
          return;
        }

        await supabase
          .from("member_attribution")
          .update({ last_touch_at: last.touch_at })
          .eq("user_id", user.id);
      } catch (error) {
        console.error("Attribution sync error:", error);
      }
    })();
  }, [user]);
}
