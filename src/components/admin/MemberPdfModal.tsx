import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";

interface MemberPdfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    user_id: string;
    name: string;
    avatar_url: string | null;
    subscription_plan: string | null;
  } | null;
}

export function MemberPdfModal({ open, onOpenChange, member }: MemberPdfModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["member-documents", member?.user_id],
    queryFn: async () => {
      if (!member) return [];
      const { data, error } = await supabase.storage
        .from("member-documents")
        .list(member.user_id, { sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!member,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Erro", description: "Apenas arquivos PDF são permitidos.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erro", description: "Arquivo deve ter no máximo 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("member-documents")
        .upload(`${member.user_id}/${fileName}`, file, { contentType: "application/pdf" });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["member-documents", member.user_id] });
      toast({ title: "PDF enviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!member || !confirm("Excluir este documento?")) return;
    try {
      const { error } = await supabase.storage
        .from("member-documents")
        .remove([`${member.user_id}/${fileName}`]);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["member-documents", member.user_id] });
      toast({ title: "Documento excluído" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!member) return;
    const { data } = await supabase.storage
      .from("member-documents")
      .createSignedUrl(`${member.user_id}/${fileName}`, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  const formatFileName = (name: string) => {
    // Remove timestamp prefix
    const parts = name.split("_");
    return parts.length > 1 ? parts.slice(1).join("_") : name;
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{member.name}</DialogTitle>
              <DialogDescription>
                Plano: <Badge variant="outline" className="capitalize ml-1">{member.subscription_plan || "Não definido"}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Upload area */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Clique para enviar PDF</p>
                <p className="text-xs text-muted-foreground">Máximo 10MB</p>
              </div>
            )}
          </div>

          {/* File list */}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum documento enviado para este membro.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Documentos ({files.length})
              </p>
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm truncate">{formatFileName(file.name)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
