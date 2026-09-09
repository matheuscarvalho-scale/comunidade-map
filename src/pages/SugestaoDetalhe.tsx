import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Calendar, FileText, ThumbsUp, ThumbsDown, MessageSquare, Vote, Loader2, Send, Trash2 } from "lucide-react";
import { useSuggestionDetail, useVoteSuggestion, useSuggestionComments, useCreateComment } from "@/hooks/useSuggestions";
import { useDeleteSuggestionComment } from "@/hooks/useDeleteSuggestionComment";
import { useDeleteSuggestion } from "@/hooks/useDeleteSuggestion";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function SugestaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasRole } = useRole();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");

  const { data: suggestion, isLoading } = useSuggestionDetail(id!);
  const { data: comments = [], isLoading: commentsLoading } = useSuggestionComments(id!);
  const voteMutation = useVoteSuggestion();
  const createComment = useCreateComment();
  const deleteComment = useDeleteSuggestionComment();
  const deleteSuggestion = useDeleteSuggestion();

  const isAdmin = hasRole(["admin", "admin_geral"]);
  const canDelete = suggestion && user && (suggestion.user_id === user.id || isAdmin);

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("suggestions")
        .update({ status: newStatus })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestion-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast({ title: "Status atualizado!" });
    },
  });

  const handleVote = (voteType: "up" | "down") => {
    if (!suggestion) return;
    const currentVote = suggestion.user_vote;
    voteMutation.mutate({
      suggestionId: suggestion.id,
      currentVote: currentVote === voteType ? voteType : currentVote,
      newVoteType: voteType,
    });
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await createComment.mutateAsync({ suggestionId: id!, content: commentText });
      setCommentText("");
      toast({ title: "Comentário adicionado!" });
    } catch {
      toast({ title: "Erro ao comentar", variant: "destructive" });
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!suggestion) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Sugestão não encontrada.</p>
          <Button variant="outline" onClick={() => navigate("/sugestoes")} className="mt-4">
            Voltar para sugestões
          </Button>
        </div>
      </MainLayout>
    );
  }

  const sc = statusColors[suggestion.status] || statusColors.nova;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button + Status */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/sugestoes")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para sugestões
          </Button>
          <Badge className={`${sc.bg} ${sc.text} border-0`}>
            {statusLabels[suggestion.status] || suggestion.status}
          </Badge>
          <div className="flex-1" />
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir sugestão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A sugestão, seus votos e comentários serão removidos permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      deleteSuggestion.mutate(suggestion.id, {
                        onSuccess: () => {
                          toast({ title: "Sugestão excluída!" });
                          navigate("/sugestoes");
                        },
                        onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
                      });
                    }}
                    disabled={deleteSuggestion.isPending}
                  >
                    {deleteSuggestion.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Main Card */}
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-6">
            {/* Title */}
            <h1 className="text-2xl font-bold uppercase">{suggestion.title}</h1>

            {/* Author */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarImage src={suggestion.author_avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(suggestion.author_name || "M")}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{suggestion.author_name}</span>
              <span className="text-muted-foreground">|</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(suggestion.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* Admin Status Changer */}
            {isAdmin && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-sm font-medium">Alterar status:</span>
                <Select value={suggestion.status} onValueChange={(v) => updateStatusMutation.mutate(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">Nova</SelectItem>
                    <SelectItem value="em_analise">Em análise</SelectItem>
                    <SelectItem value="em_desenvolvimento">Em desenvolvimento</SelectItem>
                    <SelectItem value="implementada">Implementada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                Descrição
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {suggestion.description}
              </p>
            </div>

            {/* Voting */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Vote className="h-4 w-4 text-primary" />
                Votação
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={suggestion.user_vote === "up" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVote("up")}
                  disabled={voteMutation.isPending}
                  className="gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Apoiar
                </Button>
                <Button
                  variant={suggestion.user_vote === "down" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleVote("down")}
                  disabled={voteMutation.isPending}
                  className="gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  Não apoiar
                </Button>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  +{suggestion.votes_count}
                </Badge>
                <span className="text-sm text-muted-foreground">Vote para mostrar seu apoio</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-primary" />
              Comentários ({comments.length})
            </div>

            {/* Add Comment */}
            <div className="flex gap-3">
              <Textarea
                placeholder="Escreva um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleComment}
                disabled={createComment.isPending || !commentText.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Comments List */}
            {commentsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum comentário ainda. Seja o primeiro!
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={c.author_avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(c.author_name || "M")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{c.author_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(c.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {user && (c.user_id === user.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => {
                              deleteComment.mutate(
                                { commentId: c.id, suggestionId: id! },
                                {
                                  onSuccess: () => toast({ title: "Comentário excluído!" }),
                                  onError: () => toast({ title: "Erro ao excluir comentário", variant: "destructive" }),
                                }
                              );
                            }}
                            disabled={deleteComment.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
