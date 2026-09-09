import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Declare gtag on window
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Resolves a human-readable label for a clicked element.
 * Priority: data-ga → aria-label → innerText → tag+class
 */
function getClickLabel(el: HTMLElement): string {
  // 1. Explicit data attribute (highest priority)
  const ga = el.closest<HTMLElement>("[data-ga]");
  if (ga?.dataset.ga) return ga.dataset.ga;

  // 2. Walk up to find meaningful context
  const interactive = el.closest<HTMLElement>(
    "a, button, [role='button'], [role='tab'], [role='menuitem'], input, select, textarea, [data-ga]"
  );
  const target = interactive || el;

  // 3. aria-label
  if (target.getAttribute("aria-label")) return target.getAttribute("aria-label")!;

  // 4. title
  if (target.getAttribute("title")) return target.getAttribute("title")!;

  // 5. Text content (trimmed, capped)
  const text = (target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (text) return text;

  // 6. Fallback: tag + meaningful class
  const tag = target.tagName.toLowerCase();
  const cls = Array.from(target.classList).slice(0, 3).join(".");
  return cls ? `${tag}.${cls}` : tag;
}

/**
 * Determines the category/section from the element's context.
 */
function getClickCategory(el: HTMLElement): string {
  // Check for data-ga-category on any ancestor
  const cat = el.closest<HTMLElement>("[data-ga-category]");
  if (cat?.dataset.gaCategory) return cat.dataset.gaCategory;

  // Infer from semantic landmarks
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

/**
 * Gets the element type for cleaner reporting.
 */
function getElementType(el: HTMLElement): string {
  const interactive = el.closest<HTMLElement>(
    "a, button, [role='button'], [role='tab'], [role='menuitem'], input, select, textarea"
  );
  if (!interactive) return "elemento";

  const tag = interactive.tagName.toLowerCase();
  if (tag === "a") return "link";
  if (tag === "button" || interactive.getAttribute("role") === "button") return "botao";
  if (interactive.getAttribute("role") === "tab") return "aba";
  if (interactive.getAttribute("role") === "menuitem") return "menu_item";
  if (tag === "input") {
    const type = interactive.getAttribute("type") || "text";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    return "input";
  }
  if (tag === "select") return "select";
  if (tag === "textarea") return "textarea";
  return "elemento";
}

// Map routes to friendly page names
const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/formacoes": "Formacoes",
  "/trilha-conteudo": "Trilha_Conteudo",
  "/mentorias": "Mentorias",
  "/webinars": "Webinars",
  "/comunidade": "Comunidade",
  "/recursos": "Recursos",
  "/networking": "Networking",
  "/conquistas": "Conquistas",
  "/parceiros": "Parceiros",
  "/meu-cashback": "Meu_Cashback",
  "/certificados": "Certificados",
  "/sugestoes": "Sugestoes",
  "/perfil": "Perfil",
  "/noticias": "Noticias",
  "/gestao-equipe": "Gestao_Equipe",
  "/auth": "Login",
  "/onboarding": "Onboarding",
  "/planos": "Planos",
};

function getPageName(pathname: string): string {
  if (routeNames[pathname]) return routeNames[pathname];
  // Try prefix match for dynamic routes
  for (const [route, name] of Object.entries(routeNames)) {
    if (pathname.startsWith(route) && route !== "/") return name;
  }
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/v/")) return "Venda_Publica";
  return pathname.replace(/\//g, "_").replace(/^_/, "") || "Home";
}

export function GoogleAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!window.gtag) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Skip elements created purely to trigger a programmatic action (e.g. blob download anchors)
      if (target.closest("[data-ga-ignore]")) return;

      // Skip non-interactive noise (scrollbars, etc.)
      const label = getClickLabel(target);
      const category = getClickCategory(target);
      const elementType = getElementType(target);
      const pageName = getPageName(location.pathname);

      // Build a readable event name: "click_[tipo]_[pagina]"
      const eventName = `click_${elementType}`;

      window.gtag("event", eventName, {
        event_category: category,
        event_label: `[${pageName}] ${label}`,
        page_path: location.pathname,
        page_name: pageName,
        element_type: elementType,
        click_text: label.slice(0, 100),
      });
    };

    // Use capture to catch all clicks including those that stopPropagation
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [location.pathname]);

  // Track page views on route change
  useEffect(() => {
    if (!window.gtag) return;
    const pageName = getPageName(location.pathname);
    window.gtag("event", "page_view", {
      page_path: location.pathname,
      page_title: pageName,
      page_name: pageName,
    });
  }, [location.pathname]);

  return null;
}
