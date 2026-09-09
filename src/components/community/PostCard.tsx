import { useState } from "react";
import { Heart, MessageCircle, Eye, ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { CommunityPost, useToggleLike } from "@/hooks/usePosts";
import { usePostReplies, useCreateReply, useDeleteReply, PostReply } from "@/hooks/usePostReplies";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/hooks/use-toast";

interface PostCardProps {
  post: CommunityPost;
  getCategoryColor: (category: string) => string;
  formatRelativeTime: (date: string) => string;
}

export function PostCard({ post, getCategoryColor, formatRelativeTime }: PostCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasRole } = useRole();
  const [showReplies, setShowReplies] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  
  const toggleLike = useToggleLike();
  const { data: replies, isLoading: repliesLoading } = usePostReplies(showReplies ? post.id : "");
  const createReply = useCreateReply();
  const deletePost = useDeletePost();
  const deleteReply = useDeleteReply();

  const isAdmin = hasRole(["admin", "admin_geral"]);
  const canDelete = user && (post.user_id === user.id || isAdmin);

  const getInitials = (name: string) => {
    return name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, isCurrentlyLiked: post.isLiked || false });
  };

  const handleReply = () => {
    if (!replyContent.trim()) return;
    setReplyContent("");
    createReply.mutate({ postId: post.id, content: replyContent });
  };

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast({ title: "Tópico excluído!" });
      },
      onError: () => {
        toast({ title: "Erro ao excluir tópico", variant: "destructive" });
      },
    });
  };

  return (
    <Card className="card-glow border-border/50 transition-all hover:border-primary/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
            {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} />}
            <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
              {getInitials(post.author?.name || "Usuário")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="font-medium text-sm sm:text-base truncate">{post.author?.name || "Usuário"}</span>
                <Badge variant="outline" className={`${getCategoryColor(post.category)} text-xs`}>
                  {post.category}
                </Badge>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {formatRelativeTime(post.created_at)}
                </span>
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={handleDelete}
                  disabled={deletePost.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <h3 className="mt-2 text-base sm:text-lg font-semibold">{post.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{post.content}</p>
            
            <div className="mt-4 flex items-center gap-3 sm:gap-6 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 sm:gap-2 text-muted-foreground hover:text-primary px-2 sm:px-3"
                onClick={handleLike}
              >
                <Heart
                  className={`h-4 w-4 ${post.isLiked ? "fill-primary text-primary" : ""}`}
                />
                {post.likes_count}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 sm:gap-2 text-muted-foreground hover:text-primary px-2 sm:px-3"
                onClick={() => setShowReplies(!showReplies)}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden xs:inline">{post.replies_count} respostas</span>
                <span className="xs:hidden">{post.replies_count}</span>
                {showReplies ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {post.views_count}
              </div>
            </div>

            {/* Replies Section */}
            {showReplies && (
              <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Escreva uma resposta..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="flex-1 bg-muted/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleReply}
                    disabled={!replyContent.trim() || createReply.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {repliesLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Carregando respostas...
                  </p>
                ) : (replies || []).length > 0 ? (
                  <div className="space-y-3">
                    {(replies || []).map((reply: PostReply) => {
                      const canDeleteReply = user && (reply.user_id === user.id || isAdmin);
                      return (
                        <div key={reply.id} className={`flex gap-2 sm:gap-3 bg-muted/30 rounded-lg p-2 sm:p-3 ${reply._optimistic ? "opacity-60" : ""}`}>
                          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                            {reply.author?.avatar_url && (
                              <AvatarImage src={reply.author.avatar_url} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(reply.author?.name || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-xs sm:text-sm">
                                  {reply.author?.name || "Usuário"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {reply._optimistic ? "Enviando..." : formatRelativeTime(reply.created_at)}
                                </span>
                              </div>
                              {canDeleteReply && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                                  onClick={() => {
                                    deleteReply.mutate(
                                      { replyId: reply.id, postId: post.id },
                                      {
                                        onSuccess: () => {
                                          toast({ title: "Comentário excluído!", duration: 2000 });
                                        },
                                        onError: () => {
                                          toast({ title: "Erro ao excluir comentário", variant: "destructive" });
                                        },
                                      }
                                    );
                                  }}
                                  disabled={deleteReply.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma resposta ainda. Seja o primeiro!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
