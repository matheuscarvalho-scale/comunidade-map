import { useRef, useState } from "react";
import { Send, MessageSquare, ImagePlus, Video, X, BarChart3 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapinhaAnalyticsDashboard } from "@/components/analytics/MapinhaAnalyticsDashboard";

type Target = "acelera" | "interno";

const TARGETS: Record<Target, { label: string; description: string }> = {
  acelera: {
    label: "Grupo MAP Acelera",
    description: "Envia mensagem (com mídia opcional) via Make para o grupo do WhatsApp da MAP Acelera.",
  },
  interno: {
    label: "GRUPO INTERNO MAP",
    description: "Envia mensagem (com mídia opcional) via Make para o grupo interno do WhatsApp da MAP.",
  },
};

const MAX_IMAGE_MB = 16;
const MAX_VIDEO_MB = 256;

function GroupMessageForm({ target }: { target: Target }) {
  const [mensagem, setMensagem] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const info = TARGETS[target];

  const mediaType: "image" | "video" | null = media
    ? media.type.startsWith("video/")
      ? "video"
      : media.type.startsWith("image/")
      ? "image"
      : null
    : null;

  const handleFile = (file: File | null) => {
    if (!file) {
      setMedia(null);
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
      return;
    }
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Arquivo inválido", description: "Envie uma imagem ou vídeo.", variant: "destructive" });
      return;
    }
    const limit = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > limit * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: `Máximo ${limit} MB para ${isVideo ? "vídeo" : "imagem"}.`,
        variant: "destructive",
      });
      return;
    }
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const limpar = () => {
    setMensagem("");
    handleFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const enviar = async () => {
    const texto = mensagem.trim();
    if (!texto && !media) {
      toast({
        title: "Conteúdo vazio",
        description: "Digite uma mensagem ou anexe uma mídia.",
        variant: "destructive",
      });
      return;
    }
    if (!confirm(`Confirmar envio para o ${info.label}?`)) return;

    setSending(true);
    try {
      let mediaPath: string | null = null;
      if (media) {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id ?? "anon";
        const ext = media.name.includes(".") ? media.name.split(".").pop() : "bin";
        const path = `${target}/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("dona-olga-media")
          .upload(path, media, { contentType: media.type, upsert: false });
        if (upErr) throw upErr;
        mediaPath = path;
      }

      const { data, error } = await supabase.functions.invoke("notify-make-message", {
        body: { mensagem: texto, target, mediaPath, mediaType },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao enviar");
      toast({
        title: "Enviado!",
        description: `O Make recebeu o webhook e vai disparar no ${info.label}.`,
      });
      limpar();
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao enviar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova mensagem — {info.label}</CardTitle>
        <CardDescription>
          Enviada como <code className="text-xs">tipo: nova_mensagem</code>,{" "}
          <code className="text-xs">target: {target}</code>. Mídia opcional vai como{" "}
          <code className="text-xs">mediaUrl</code> + <code className="text-xs">mediaType</code> (image|video).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`mensagem-${target}`}>Conteúdo da mensagem (caption)</Label>
          <Textarea
            id={`mensagem-${target}`}
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder={`Digite a mensagem para o ${info.label}...`}
            rows={8}
            maxLength={4000}
            className="resize-y"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Formatação WhatsApp: *negrito*, _itálico_, ~riscado~</span>
            <span>{mensagem.length} / 4000</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mídia (opcional)</Label>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />

          {!media ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => imageInputRef.current?.click()}
                data-ga={`admin-dona-olga-anexar-imagem-${target}`}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Anexar imagem
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => videoInputRef.current?.click()}
                data-ga={`admin-dona-olga-anexar-video-${target}`}
              >
                <Video className="h-4 w-4 mr-2" />
                Anexar vídeo
              </Button>
              <span className="text-xs text-muted-foreground self-center">
                Imagem até {MAX_IMAGE_MB} MB · Vídeo até {MAX_VIDEO_MB} MB
              </span>
            </div>
          ) : (
            <div className="relative rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {mediaType === "image" && mediaPreview ? (
                    <img
                      src={mediaPreview}
                      alt="Pré-visualização"
                      className="h-24 w-24 object-cover rounded-md"
                    />
                  ) : mediaType === "video" && mediaPreview ? (
                    <video src={mediaPreview} className="h-24 w-24 object-cover rounded-md" muted />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{media.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {mediaType === "video" ? "Vídeo" : "Imagem"} ·{" "}
                    {(media.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleFile(null)}
                  disabled={sending}
                  aria-label="Remover mídia"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={limpar} disabled={sending || (!mensagem && !media)}>
            Limpar
          </Button>
          <Button
            onClick={enviar}
            disabled={sending || (!mensagem.trim() && !media)}
            data-ga={`admin-enviar-mensagem-${target}`}
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Enviando..." : `Enviar para ${info.label}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDonaOlga() {
  return (
    <MainLayout>
      <div className="container mx-auto max-w-7xl py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mapinha</h1>
            <p className="text-sm text-muted-foreground">
              Dispare mensagens (texto, imagem ou vídeo) para os grupos do WhatsApp via Make.
            </p>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="acelera">{TARGETS.acelera.label}</TabsTrigger>
            <TabsTrigger value="interno">{TARGETS.interno.label}</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics">
            <MapinhaAnalyticsDashboard />
          </TabsContent>
          <TabsContent value="acelera">
            <div className="max-w-3xl">
              <GroupMessageForm target="acelera" />
            </div>
          </TabsContent>
          <TabsContent value="interno">
            <div className="max-w-3xl">
              <GroupMessageForm target="interno" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
