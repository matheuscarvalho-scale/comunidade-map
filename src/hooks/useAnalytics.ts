import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Generate a simple session ID
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Roles that should be tracked
const TRACKED_ROLES = ["basic", "pro", "business", "starter", "enterprise"];

// Click label resolver (same logic as GoogleAnalyticsTracker)
function getClickLabel(el: HTMLElement): string {
  const ga = el.closest<HTMLElement>("[data-ga]");
  if (ga?.dataset.ga) return ga.dataset.ga;
  const interactive = el.closest<HTMLElement>(
    "a, button, [role='button'], [role='tab'], [role='menuitem'], input, select, textarea, [data-ga]"
  );
  const target = interactive || el;
  if (target.getAttribute("aria-label")) return target.getAttribute("aria-label")!;
  if (target.getAttribute("title")) return target.getAttribute("title")!;

  // For cards/links with lots of nested text, prefer heading or first short text
  const heading = target.querySelector("h1, h2, h3, h4, h5, h6, [class*='title'], [class*='Title']");
  if (heading) {
    const headingText = (heading.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (headingText) return headingText;
  }

  const text = (target.textContent || "").trim().replace(/\s+/g, " ");
  // If text is short enough, use it directly
  if (text && text.length <= 50) return text;
  // If text is too long, try to find a meaningful short child element
  if (text.length > 50) {
    const spans = target.querySelectorAll("span, p, strong, em");
    for (const span of spans) {
      const spanText = (span.textContent || "").trim();
      if (spanText.length >= 3 && spanText.length <= 50) return spanText;
    }
    // Fallback: truncate
    return text.slice(0, 50);
  }

  const tag = target.tagName.toLowerCase();
  const cls = Array.from(target.classList).slice(0, 3).join(".");
  return cls ? `${tag}.${cls}` : tag;
}

function getElementType(el: HTMLElement): string {
  const interactive = el.closest<HTMLElement>(
    "a, button, [role='button'], [role='tab'], [role='menuitem'], [role='checkbox'], [role='switch'], [role='radio'], [role='option'], [role='combobox'], [role='slider'], input, select, textarea, [data-ga], summary"
  );
  if (!interactive) return "elemento";
  const tag = interactive.tagName.toLowerCase();
  const role = interactive.getAttribute("role");
  if (tag === "a") return "link";
  if (tag === "button" || role === "button") return "botao";
  if (role === "tab") return "aba";
  if (role === "menuitem") return "menu_item";
  if (role === "checkbox") return "checkbox";
  if (role === "switch") return "switch";
  if (role === "radio") return "radio";
  if (role === "combobox" || role === "option") return "select";
  if (role === "slider") return "slider";
  if (tag === "input") return "input";
  if (tag === "select") return "select";
  if (tag === "summary") return "accordion";
  if (interactive.dataset.ga) return "elemento";
  return "elemento";
}

function getClickCategory(el: HTMLElement): string {
  const cat = el.closest<HTMLElement>("[data-ga-category]");
  if (cat?.dataset.gaCategory) return cat.dataset.gaCategory;
  const section = el.closest("nav, header, footer, aside, main, dialog, [role='dialog']");
  if (section) {
    const tag = section.tagName.toLowerCase();
    if (tag === "nav" || section.closest("aside")) return "sidebar";
    if (tag === "header") return "header";
    if (tag === "footer") return "footer";
    if (tag === "dialog" || section.getAttribute("role") === "dialog") return "modal";
    if (tag === "main") return "conteudo";
  }
  return "pagina";
}

export function useAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const lastPath = useRef<string>("");
  const accessTokenRef = useRef<string>("");
  const shouldTrackRef = useRef<boolean>(false);

  // Check if user has a tracked role
  useEffect(() => {
    if (!user) {
      shouldTrackRef.current = false;
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        shouldTrackRef.current = (data || []).some((r) =>
          TRACKED_ROLES.includes(r.role)
        );
      });
  }, [user]);

  // Keep access token fresh for beforeunload
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token || "";
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token || "";
    });
    return () => subscription.unsubscribe();
  }, []);

  // Track page view
  const trackPageView = async (path: string) => {
    if (!user || !shouldTrackRef.current) return;

    try {
      await supabase.from("member_analytics").insert({
        user_id: user.id,
        event_type: "page_view",
        page_path: path,
        session_id: getSessionId(),
        event_data: {
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  // Track page duration when leaving
  const trackPageDuration = async (path: string, duration: number) => {
    if (!user || !shouldTrackRef.current || duration < 1) return;

    try {
      await supabase.from("member_analytics").insert({
        user_id: user.id,
        event_type: "page_duration",
        page_path: path,
        session_id: getSessionId(),
        duration_seconds: Math.round(duration),
        event_data: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  // Track custom events
  const trackEvent = async (
    eventType: string,
    eventData?: Record<string, unknown>
  ) => {
    if (!user || !shouldTrackRef.current) return;

    try {
      await supabase.from("member_analytics").insert({
        user_id: user.id,
        event_type: eventType,
        page_path: location.pathname,
        session_id: getSessionId(),
        event_data: {
          ...eventData,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  // Track page views and duration on route change
  useEffect(() => {
    if (!user) return;

    const currentPath = location.pathname;

    // Track duration for previous page
    if (lastPath.current && lastPath.current !== currentPath) {
      const duration = (Date.now() - pageStartTime.current) / 1000;
      trackPageDuration(lastPath.current, duration);
    }

    // Track new page view
    trackPageView(currentPath);
    pageStartTime.current = Date.now();
    lastPath.current = currentPath;

    // Track duration when leaving page using sendBeacon with proper auth
    const handleBeforeUnload = () => {
      const duration = (Date.now() - pageStartTime.current) / 1000;
      if (duration >= 1) {
        const payload = JSON.stringify({
          user_id: user.id,
          event_type: "page_duration",
          page_path: currentPath,
          session_id: getSessionId(),
          duration_seconds: Math.round(duration),
          event_data: { timestamp: new Date().toISOString() },
        });
        const blob = new Blob([payload], { type: "application/json" });
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/member_analytics`;
        // Try sendBeacon with proper headers via fetch keepalive first
        try {
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Authorization": `Bearer ${accessTokenRef.current}`,
              "Prefer": "return=minimal",
            },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        } catch {
          // Fallback: sendBeacon (may fail without auth headers)
          navigator.sendBeacon?.(url, blob);
        }
      }
    };

    // Also track duration periodically (every 60s) as a heartbeat
    const heartbeatInterval = setInterval(() => {
      const duration = (Date.now() - pageStartTime.current) / 1000;
      if (duration >= 60) {
        trackPageDuration(currentPath, duration);
        pageStartTime.current = Date.now(); // Reset after recording
      }
    }, 60000);

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Track clicks on interactive elements
    const handleClick = (e: MouseEvent) => {
      if (!shouldTrackRef.current) return;
      const target = e.target as HTMLElement;
      if (!target) return;
      const interactive = target.closest<HTMLElement>(
        "a, button, [role='button'], [role='tab'], [role='menuitem'], [role='checkbox'], [role='switch'], [role='radio'], [role='option'], [role='combobox'], [role='slider'], [data-ga], label[for], summary, [tabindex='0'], [data-state]"
      );
      if (!interactive) return;
      if (interactive.closest("[data-ga-ignore]")) return;
      const label = getClickLabel(target);
      const elementType = getElementType(target);
      const category = getClickCategory(target);
      // Fire and forget — don't await
      supabase.from("member_analytics").insert({
        user_id: user.id,
        event_type: "click",
        page_path: currentPath,
        session_id: getSessionId(),
        event_data: {
          label,
          element_type: elementType,
          category,
          timestamp: new Date().toISOString(),
        },
      }).then(
        () => {},
        () => {}
      );
    };
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
      clearInterval(heartbeatInterval);
      // Track duration when component unmounts (route change handled by React)
      const duration = (Date.now() - pageStartTime.current) / 1000;
      if (duration >= 1 && lastPath.current === currentPath) {
        trackPageDuration(currentPath, duration);
      }
    };
  }, [location.pathname, user]);

  return { trackEvent };
}

// Hook to track specific actions
export function useTrackAction() {
  const { user } = useAuth();
  const location = useLocation();
  const shouldTrackRef = useRef<boolean>(false);

  useEffect(() => {
    if (!user) {
      shouldTrackRef.current = false;
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        shouldTrackRef.current = (data || []).some((r) =>
          TRACKED_ROLES.includes(r.role)
        );
      });
  }, [user]);

  const track = async (action: string, data?: Record<string, unknown>) => {
    if (!user || !shouldTrackRef.current) return;

    try {
      await supabase.from("member_analytics").insert({
        user_id: user.id,
        event_type: action,
        page_path: location.pathname,
        session_id: getSessionId(),
        event_data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  return track;
}
