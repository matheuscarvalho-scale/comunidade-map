import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Copy,
} from "lucide-react";
import { useCloudflareUpload, UploadStatus } from "@/hooks/useCloudflareUpload";
import { useToast } from "@/hooks/use-toast";

interface CloudflareVideoUploaderProps {
  onUploadComplete?: (videoUid: string, videoId: string | null) => void;
  defaultTitle?: string;
  defaultAccessLevel?: string;
}

const STATUS_LABELS: Record<UploadStatus, string> = {
  idle: "Pronto para upload",
  requesting: "Preparando upload...",
  uploading: "Enviando para Cloudflare...",
  processing: "Processando vídeo...",
  ready: "Vídeo pronto!",
  error: "Erro no upload",
};

const STATUS_COLORS: Record<UploadStatus, string> = {
  idle: "secondary",
  requesting: "secondary",
  uploading: "default",
  processing: "default",
  ready: "default",
  error: "destructive",
};

export function CloudflareVideoUploader({
  onUploadComplete,
  defaultTitle = "",
  defaultAccessLevel = "members",
}: CloudflareVideoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [accessLevel, setAccessLevel] = useState(defaultAccessLevel);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    status,
    progress,
    videoUid,
    error,
    processingStatus,
    upload,
    reset,
  } = useCloudflareUpload({
    onComplete: (uid, id) => {
      toast({
        title: "Vídeo pronto! 🎬",
        description: `UID: ${uid}`,
      });
      onUploadComplete?.(uid, id);
    },
    onError: (err) => {
      toast({
        title: "Erro no upload",
        description: err,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("video/")) {
        toast({
          title: "Arquivo inválido",
          description: "Selecione um arquivo de vídeo.",
          variant: "destructive",
        });
        return;
      }

      // 2GB limit
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O limite máximo é 2GB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    },
    [title, toast]
  );

  const handleUpload = () => {
    if (!selectedFile || !title.trim()) return;
    upload(selectedFile, title.trim(), accessLevel);
  };

  const handleReset = () => {
    reset();
    setSelectedFile(null);
    setTitle(defaultTitle);
    setAccessLevel(defaultAccessLevel);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyUid = () => {
    if (videoUid) {
      navigator.clipboard.writeText(videoUid);
      toast({ title: "UID copiado!" });
    }
  };

  const isUploading = status === "uploading" || status === "requesting" || status === "processing";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Film className="h-5 w-5" />
          Upload de Vídeo (Cloudflare Stream)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_COLORS[status] as "secondary" | "default" | "destructive"}>
            {STATUS_LABELS[status]}
          </Badge>
          {processingStatus && status === "processing" && (
            <span className="text-sm text-muted-foreground">{processingStatus}</span>
          )}
        </div>

        {/* Form fields */}
        {status === "idle" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="video-title">Título do vídeo</Label>
              <Input
                id="video-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Aula 01 - Introdução"
              />
            </div>

            <div className="space-y-2">
              <Label>Nível de acesso</Label>
              <Select value={accessLevel} onValueChange={setAccessLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Público</SelectItem>
                  <SelectItem value="members">Membros (qualquer plano)</SelectItem>
                  <SelectItem value="pro">Pro e Business</SelectItem>
                  <SelectItem value="enterprise">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-file">Arquivo de vídeo</Label>
              <Input
                ref={fileInputRef}
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !title.trim()}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Enviar Vídeo
            </Button>
          </>
        )}

        {/* Progress */}
        {(status === "uploading" || status === "requesting") && (
          <div className="space-y-3">
            <Progress value={status === "requesting" ? 0 : progress} />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status === "requesting"
                ? "Preparando..."
                : `${progress}% enviado`}
            </div>
          </div>
        )}

        {status === "processing" && (
          <div className="space-y-3">
            <Progress value={100} />
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cloudflare processando o vídeo...
            </div>
          </div>
        )}

        {/* Success */}
        {status === "ready" && videoUid && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Upload completo!</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <code className="text-sm flex-1 truncate">{videoUid}</code>
              <Button variant="ghost" size="icon" onClick={copyUid}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Enviar outro vídeo
            </Button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Tentar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
