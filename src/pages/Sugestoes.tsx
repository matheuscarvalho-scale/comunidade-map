import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, ThumbsUp, MessageSquare, Calendar, Lightbulb, Loader2, Trash2 } from "lucide-react";
import { useSuggestions, useCreateSuggestion, useVoteSuggestion } from "@/hooks/useSuggestions";
import { useDeleteSuggestion } from "@/hooks/useDeleteSuggestion";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const categories = [
  "conteúdo", "correção", "comunidade", "ferramenta", "funcionalidade",
  "integração", "interface", "melhorias", "plataforma", "eventos"
];

const statusOptions = [
  { value: "todas", label: "Todas" },
  { value: "nova", label: "Novas" },
  { value: "em_analise", label: "Em análise" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "implementada", label: "Implementadas" },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  nova: { bg: "bg-primary/20", text: "text-primary" },
  em_analise: { bg: "bg-yellow-500/20", text: "text-yellow-500" },
  em_desenvolvimento: { bg: "bg-blue-500/20", text: "text-blue-500" },
  implementada: { bg: "bg-green-500/20", text: "text-green-500" },
};

const statusLabels: Record<string, string> = {
  nova: "Nova",
  em_analise: "Em análise",
  em_desenvolvimento: "Em desenvolvimento",
  implementada: "Implementada",
};

export default function Sugestoes() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [sortBy, setSortBy] = useState("recentes");
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const { toast } = useToast();

  const { data: suggestions = [], isLoading } = useSuggestions({
    status: statusFilter,
    category: categoryFilter,
    search,
    sort: sortBy === "mais_votados" ? "mais_votados" : undefined,
  });

  const { user } = useAuth();
  const { hasRole } = useRole();
  const isAdmin = hasRole(["admin", "admin_geral"]);
  const createMutation = useCreateSuggestion();
  const voteMutation = useVoteSuggestion();
  const deleteMutation = useDeleteSuggestion();

  const handleCreate = async () => {
    if (!newTitle.trim() || !newCategory || !newDescription.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    try {
      await createMutation.mutateAsync({ title: newTitle, description: newDescription, category: newCategory });
      toast({ title: "Sugestão enviada com sucesso!" });
      setIsOpen(false);
      setNewTitle("");
      setNewCategory("");
      setNewDescription("");
    } catch {
      toast({ title: "Erro ao enviar sugestão", variant: "destructive" });
    }
  };

  const handleVote = (e: React.MouseEvent, id: string, currentVote: string | null) => {
    e.stopPropagation();
    voteMutation.mutate({ suggestionId: id, currentVote, newVoteType: "up" });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Sugestões</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Compartilhe suas ideias e vote nas propostas da comunidade</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar sugestões..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            <Button onClick={() => setIsOpen(true)} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nova Sugestão
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recentes">Recentes</SelectItem>
              <SelectItem value="mais_votados">Mais votados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma sugestão encontrada.</p>
            <p className="text-sm">Seja o primeiro a compartilhar uma ideia!</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {suggestions.map((s) => {
              const sc = statusColors[s.status] || statusColors.nova;
              return (
                <Card
                  key={s.id}
                  className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/sugestoes/${s.id}`)}
                >
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2">{s.title}</h3>
                        <Badge className={`${sc.bg} ${sc.text} border-0 mt-1.5 text-xs`}>
                          {statusLabels[s.status] || s.status}
                        </Badge>
                      </div>
                      <button
                        onClick={(e) => handleVote(e, s.id, s.user_vote || null)}
                        className={`flex flex-col items-center rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                          s.user_vote === "up"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground"
                        }`}
                      >
                        <span>+{s.votes_count}</span>
                        <span className="text-[10px] font-normal uppercase">votos</span>
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-4">
                      {s.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" /> {s.votes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {s.comments_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(s.created_at), "dd MMM", { locale: ptBR })}
                        </span>
                        {user && (s.user_id === user.id || isAdmin) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir sugestão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMutation.mutate(s.id);
                                  }}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Nova Sugestão</DialogTitle>
                <DialogDescription>Compartilhe sua ideia para melhorar nossa plataforma</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título da sugestão</Label>
              <Input
                placeholder="Ex: Adicionar dashboard personalizado"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva sua sugestão em detalhes..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar sugestão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
