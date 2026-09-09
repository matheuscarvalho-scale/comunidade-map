import { useState, useEffect, useCallback, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";

const CUSTOMER_SUBDOMAIN = "customer-lpc0zaaxp062un04";

interface CloudflareStreamPlayerProps {
  videoUid: string;
  className?: string;
}

export function CloudflareStreamPlayer({
  videoUid,
  className,
}: CloudflareStreamPlayerProps) {
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"auth" | "permission" | "network" | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedToken, setSignedToken] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorType(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-stream-token",
        { body: { videoUid } }
      );

      if (fnError) {
        const status = (fnError as any)?.context?.status;
        if (status === 401) {
          setErrorType("auth");
          setError("Sessão expirada. Faça login novamente.");
        } else if (status === 403) {
          setErrorType("permission");
          setError("Seu plano não inclui acesso a este conteúdo.");
        } else {
          setErrorType("network");
          setError("Não foi possível carregar o vídeo.");
        }
        return;
      }

      if (data?.error) {
        if (data.error === "Insufficient permissions") {
          setErrorType("permission");
          setError(
            data.requiredLevel === "pro"
              ? "Este conteúdo é exclusivo para membros Pro e Business."
              : data.requiredLevel === "enterprise"
                ? "Este conteúdo é exclusivo para membros Business."
                : "Assinatura ativa necessária para acessar este conteúdo."
          );
        } else {
          setErrorType("network");
          setError(data.error);
        }
        return;
      }

      if (data?.authorized) {
        setSignedToken(data.token ?? "__direct__");
        
        // Auto-refresh token every 50 minutes (only if signed)
        if (data.token) {
          if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = setTimeout(() => {
            fetchToken();
          }, 50 * 60 * 1000);
        }
      }
    } catch {
      setErrorType("network");
      setError("Erro de conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  }, [videoUid]);

  useEffect(() => {
    fetchToken();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [fetchToken]);


  if (loading) {
    return (
      <AspectRatio ratio={16 / 9}>
        <Skeleton className="w-full h-full" />
      </AspectRatio>
    );
  }

  if (error || !signedToken) {
    return (
      <AspectRatio ratio={16 / 9}>
        <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-4 p-6">
          {errorType === "permission" ? (
            <Lock className="h-12 w-12 text-muted-foreground" />
          ) : (
            <AlertCircle className="h-12 w-12 text-destructive" />
          )}
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {error || "Erro ao carregar vídeo"}
          </p>
          {errorType === "network" && (
            <Button variant="outline" size="sm" onClick={fetchToken} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          )}
          {errorType === "permission" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => window.location.href = "/planos"}
            >
              Ver Planos
            </Button>
          )}
        </div>
      </AspectRatio>
    );
  }

  const iframeSrc = signedToken === "__direct__"
    ? `https://${CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${videoUid}/iframe`
    : `https://${CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${videoUid}/iframe?token=${signedToken}`;

  return (
    <AspectRatio ratio={16 / 9}>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className={className || "w-full h-full"}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: "none" }}
      />
    </AspectRatio>
  );
}
