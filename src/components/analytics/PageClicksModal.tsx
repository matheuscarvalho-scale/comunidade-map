import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MousePointerClick, Monitor } from "lucide-react";

interface PageClicksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageName: string;
  pagePaths: string[];
}

interface ClickEntry {
  label: string;
  element_type: string;
  category: string;
  count: number;
}

const PAGE_ROUTE_MAP: Record<string, string> = {
  "Dashboard": "/",
  "Formações": "/formacoes",
  "Mentorias": "/mentorias",
  "Webinars": "/webinars",
  "Comunidade": "/comunidade",
  "Networking": "/networking",
  "Conquistas": "/conquistas",
  "Recursos": "/recursos",
  "Parceiros e Benefícios": "/parceiros",
  "Notícias": "/noticias",
  "Trilha de Conteúdo": "/trilha-conteudo",
  "Perfil": "/perfil",
  "Meu Cashback": "/meu-cashback",
  "Certificados": "/certificados",
  "Sugestões": "/sugestoes",
  "Gestão de Equipe": "/gestao-equipe",
  "Onboarding": "/onboarding",
  "Planos": "/planos",
};

const SCALE = 0.6;
const IFRAME_WIDTH = 1440;
const SIDEBAR_OFFSET = 260;

function findElementByLabel(doc: Document, label: string): Element | null {
  // 1. data-analytics-label
  const byData = doc.querySelector(`[data-analytics-label="${CSS.escape(label)}"]`);
  if (byData) return byData;

  // 2. data-ga
  const byGa = doc.querySelector(`[data-ga="${CSS.escape(label)}"]`);
  if (byGa) return byGa;

  // 3. aria-label
  const byAria = doc.querySelector(`[aria-label="${CSS.escape(label)}"]`);
  if (byAria) return byAria;

  // 4. title
  const byTitle = doc.querySelector(`[title="${CSS.escape(label)}"]`);
  if (byTitle) return byTitle;

  // 5. Search by text content in clickable elements
  const clickables = doc.querySelectorAll(
    'button, a, [role="button"], [role="tab"], [role="menuitem"], input[type="submit"], .cursor-pointer'
  );
  for (const el of clickables) {
    const text = (el.textContent || "").trim();
    if (text === label) return el;
  }
  // Partial match (label is contained and element text is short)
  for (const el of clickables) {
    const text = (el.textContent || "").trim();
    if (text && text.includes(label) && text.length < label.length + 30) return el;
  }

  return null;
}

export function PageClicksModal({ open, onOpenChange, pageName, pagePaths }: PageClicksModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(1200);
  const [badgesInjected, setBadgesInjected] = useState(false);

  const SIDEBAR_LABELS = new Set([
    "Dashboard", "Formações", "Mentorias", "Webinars", "Comunidade",
    "Networking", "Conquistas", "Recursos", "Parceiros e Benefícios",
    "Notícias", "Trilha de Conteúdo", "Perfil", "Meu Cashback",
    "Certificados", "Sugestões", "Gestão de Equipe", "Planos",
    "Parceiros", "Onboarding", "Admin", "Sair", "Configurações",
  ]);

  const { data: clicks, isLoading } = useQuery({
    queryKey: ["page-clicks-detail", pagePaths],
    enabled: open && pagePaths.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_page_click_details", {
        _page_paths: pagePaths,
        _days_ago: 30,
      });

      if (error) throw error;

      return (data || [])
        .map((row: { label: string; element_type: string; category: string; click_count: number }) => ({
          label: row.label,
          element_type: row.element_type,
          category: row.category,
          count: Number(row.click_count),
        }))
        .filter(
          (c: ClickEntry) =>
            c.category !== "sidebar" &&
            c.category !== "header" &&
            !SIDEBAR_LABELS.has(c.label)
        );
    },
  });

  const totalClicks = clicks?.reduce((s, c) => s + c.count, 0) || 0;

  const iframeRoute = PAGE_ROUTE_MAP[pageName] || pagePaths[0] || "/";
  const previewUrl = `${window.location.origin}${iframeRoute}`;

  // Inject badges directly into the iframe DOM
  const injectBadges = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !clicks || clicks.length === 0) return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc || !iframeDoc.body) return;

      // Remove previously injected badges
      iframeDoc.querySelectorAll(".click-count-badge").forEach(el => el.remove());

      // Get full content height
      const bodyHeight = iframeDoc.documentElement?.scrollHeight || iframeDoc.body.scrollHeight || 1200;
      setIframeHeight(bodyHeight);

      // Inject CSS for badges
      let style = iframeDoc.getElementById("click-badge-styles");
      if (!style) {
        style = iframeDoc.createElement("style");
        style.id = "click-badge-styles";
        style.textContent = `
          .click-count-badge {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #b8ff00;
            color: #000;
            border-radius: 9999px;
            min-width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 5px;
            font-size: 11px;
            font-weight: 800;
            z-index: 99999;
            pointer-events: none;
            box-shadow: 0 2px 8px rgba(184,255,0,0.4);
            border: 2px solid #000;
            line-height: 1;
            font-family: system-ui, -apple-system, sans-serif;
          }
        `;
        iframeDoc.head.appendChild(style);
      }

      let injectedCount = 0;

      for (const click of clicks) {
        const el = findElementByLabel(iframeDoc, click.label);
        if (!el) continue;

        // Make sure the element has position for absolute badge
        const htmlEl = el as HTMLElement;
        const computed = iframeDoc.defaultView?.getComputedStyle(htmlEl);
        if (computed && computed.position === "static") {
          htmlEl.style.position = "relative";
        }

        // Create badge
        const badge = iframeDoc.createElement("div");
        badge.className = "click-count-badge";
        badge.textContent = String(click.count);
        badge.title = `${click.label}: ${click.count} cliques`;
        htmlEl.appendChild(badge);
        injectedCount++;
      }

      setBadgesInjected(injectedCount > 0);
      console.log(`[PageClicksModal] Injected ${injectedCount}/${clicks.length} click badges`);
    } catch (e) {
      console.log("Could not inject badges into iframe:", e);
    }
  }, [clicks]);

  const handleIframeLoad = useCallback(() => {
    // Wait for page to fully render
    setTimeout(injectBadges, 1500);
    // Retry in case of lazy-loaded content
    setTimeout(injectBadges, 3500);
  }, [injectBadges]);

  useEffect(() => {
    if (!open) {
      setBadgesInjected(false);
    }
  }, [open]);

  const scaledWidth = (IFRAME_WIDTH - SIDEBAR_OFFSET) * SCALE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[850px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-primary" />
            Navegação Interna — {pageName}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>Cliques dos membros nos últimos 30 dias</span>
            <div className="flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">{totalClicks}</span>
              <span className="text-[10px] text-muted-foreground">cliques totais</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-lg" />
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-muted/5">
              {/* Scrollable preview container */}
              <div
                className="overflow-y-auto overflow-x-hidden"
                style={{ maxHeight: "65vh" }}
              >
                <div
                  className="relative"
                  style={{
                    width: `${scaledWidth}px`,
                    height: `${iframeHeight * SCALE}px`,
                    margin: "0 auto",
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={previewUrl}
                    title={`Preview de ${pageName}`}
                    className="pointer-events-none border-0 block"
                    onLoad={handleIframeLoad}
                    style={{
                      width: `${IFRAME_WIDTH}px`,
                      height: `${iframeHeight}px`,
                      transform: `scale(${SCALE})`,
                      transformOrigin: "top left",
                      marginLeft: `-${SIDEBAR_OFFSET * SCALE}px`,
                    }}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>

              {/* Footer legend */}
              <div className="border-t border-border px-4 py-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Monitor className="h-3 w-3 shrink-0" />
                {badgesInjected ? (
                  <span>
                    Os números{" "}
                    <span className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-full w-4 h-4 text-[8px] font-bold mx-0.5">
                      N
                    </span>{" "}
                    em cada elemento indicam o total de cliques dos membros
                  </span>
                ) : clicks && clicks.length > 0 ? (
                  <span>Carregando badges de cliques na página...</span>
                ) : (
                  <span>Sem dados de cliques ainda. Os dados aparecerão conforme os membros naveguem.</span>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
