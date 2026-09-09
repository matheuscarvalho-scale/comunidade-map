import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Link, ExternalLink } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useResources } from "@/hooks/useResources";
import { RESOURCE_CATEGORIES } from "@/lib/resourceCategories";

const CUSTOM_CATEGORY_VALUE = "__custom__";
const types = [
  { value: "spreadsheet", label: "Planilha" },
  { value: "document", label: "PDF/Documento" },
  { value: "presentation", label: "PowerPoint" },
  { value: "template", label: "Template" },
  { value: "tool", label: "Ferramenta" },
];

export function AddResourceModal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const { data: existingResources } = useResources(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    type: "",
    file_url: "",
    external_url: "",
    is_premium: false,
  });

  const allCategories = Array.from(
    new Set([
      ...RESOURCE_CATEGORIES,
      ...((existingResources || []).map((r) => r.category).filter(Boolean) as string[]),
    ])
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const resetForm = () => {
    setForm({ title: "", description: "", category: "", type: "", file_url: "", external_url: "", is_premium: false });
    setUploadedFileUrl("");
    setSelectedFile(null);
    setIsCustomCategory(false);
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("resources")
        .getPublicUrl(filePath);

      setUploadedFileUrl(urlData.publicUrl);
      toast({ title: "Arquivo enviado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const finalFileUrl = uploadedFileUrl || form.file_url || null;
      const { error } = await supabase.from("resources").insert({
        title: form.title,
        description: form.description || null,
        category: form.category,
        type: form.type,
        file_url: finalFileUrl,
        external_url: form.external_url || null,
        is_premium: form.is_premium,
      });
      if (error) throw error;

      // Dispara notificação no grupo do WhatsApp via Make
      try {
        await supabase.functions.invoke("notify-make-new-content", {
          body: {
            tipo: "novo_recurso",
            titulo: form.title,
            link: "https://acelera.mapeducacao.com/recursos",
            source: "novo_recurso",
          },
        });
      } catch (e) {
        console.warn("notify-make-new-content failed", e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({ title: "Recurso adicionado com sucesso!" });
      setOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao adicionar recurso", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Adicionar Recurso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Recurso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Categoria *</Label>
              {isCustomCategory ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="Nome da nova categoria"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsCustomCategory(false); setForm({ ...form, category: "" }); }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Select
                  value={form.category}
                  onValueChange={(v) => {
                    if (v === CUSTOM_CATEGORY_VALUE) {
                      setIsCustomCategory(true);
                      setForm({ ...form, category: "" });
                    } else {
                      setForm({ ...form, category: v });
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {allCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_CATEGORY_VALUE} className="text-primary font-medium">
                      + Criar nova categoria
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File source tabs */}
          <div>
            <Label className="mb-2 block">Arquivo para Download</Label>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1 gap-1">
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="file_url" className="flex-1 gap-1">
                  <Link className="h-3.5 w-3.5" />
                  URL do Arquivo
                </TabsTrigger>
                <TabsTrigger value="external_url" className="flex-1 gap-1">
                  <ExternalLink className="h-3.5 w-3.5" />
                  URL Externa
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-3">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  {selectedFile ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      {uploading ? (
                        <p className="text-xs text-muted-foreground">Enviando...</p>
                      ) : uploadedFileUrl ? (
                        <p className="text-xs text-primary">✓ Arquivo enviado</p>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedFile(null); setUploadedFileUrl(""); }}
                      >
                        Trocar arquivo
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer space-y-2 block">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo</p>
                      <p className="text-xs text-muted-foreground">PDF, Excel, Word, etc.</p>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.xlsx,.xls,.doc,.docx,.pptx,.csv,.zip"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                    </label>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="file_url" className="mt-3">
                <Input
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  placeholder="https://exemplo.com/arquivo.pdf"
                />
                <p className="text-xs text-muted-foreground mt-1">URL direta para o arquivo de download</p>
              </TabsContent>

              <TabsContent value="external_url" className="mt-3">
                <Input
                  value={form.external_url}
                  onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                  placeholder="https://exemplo.com/ferramenta"
                />
                <p className="text-xs text-muted-foreground mt-1">Link externo (abre em nova aba)</p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.is_premium} onCheckedChange={(v) => setForm({ ...form, is_premium: v })} />
            <Label>Premium</Label>
          </div>
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={!form.title || !form.category || !form.type || createMutation.isPending || uploading}
          >
            {createMutation.isPending ? "Salvando..." : "Salvar Recurso"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
