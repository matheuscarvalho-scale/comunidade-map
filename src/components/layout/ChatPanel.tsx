import { useState, useEffect, useRef, useMemo } from "react";
import { X, MessageCircle, Send, Loader2, ArrowLeft, PlusCircle, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useConversations, useMessages, useSendMessage, useMarkAsRead, useUnreadCount, useMemberFollowing, useDeleteConversation } from "@/hooks/useNetworkingComplete";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { MemberProfile } from "@/types/networking";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPartner, setSelectedPartner] = useState<MemberProfile | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const { data: messages, isLoading: loadingMessages } = useMessages(selectedPartner?.user_id || "");
  const { data: following, isLoading: loadingFollowing } = useMemberFollowing(user?.id || "");
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteConversation = useDeleteConversation();

  // Realtime seguro: só inscreve nas mensagens onde o usuário é o destinatário.
  // RLS no banco também impede leitura de mensagens alheias — esta é defesa em profundidade.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`member_messages_inbox_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "member_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const senderId = (payload.new as { sender_id?: string }).sender_id;
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
          queryClient.invalidateQueries({ queryKey: ["unread-count", user.id] });
          if (senderId) {
            queryClient.invalidateQueries({ queryKey: ["messages", user.id, senderId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const filteredConnections = useMemo(() => {
    if (!following) return [];
    const q = searchQuery.toLowerCase();
    return following.filter(f => f.name.toLowerCase().includes(q));
  }, [following, searchQuery]);

  useEffect(() => {
    if (selectedPartner?.user_id) {
      markAsRead.mutate(selectedPartner.user_id);
    }
  }, [selectedPartner?.user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPartner(null);
      setShowSearch(false);
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelectFromSearch = (member: MemberProfile) => {
    setSelectedPartner(member);
    setShowSearch(false);
    setSearchQuery("");
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm", { locale: ptBR });
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPartner) return;
    try {
      await sendMessage.mutateAsync({
        receiverId: selectedPartner.user_id,
        content: newMessage.trim(),
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-14 right-4 z-50 w-[480px] max-w-[calc(100vw-2rem)] h-[min(700px,calc(100vh-5rem))] rounded-xl border border-border bg-background shadow-2xl flex animate-fade-in">
        {/* Conversations List */}
        {!selectedPartner && !showSearch ? (
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h3 className="font-semibold text-xl">Mensagens</h3>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearch(true)}
                  className="gap-1.5 text-sm font-medium border-primary/30 text-primary hover:bg-primary/10"
                >
                  <PlusCircle className="h-4 w-4" />
                  Nova conversa
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {loadingConversations ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !conversations?.length ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">Nenhuma conversa ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use a busca no Networking para iniciar uma nova conversa
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.partnerId}
                      className="relative group"
                    >
                      <button
                        onClick={() => setSelectedPartner(conversation.partner)}
                        className="w-full px-4 py-3.5 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={conversation.partner.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(conversation.partner.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[15px] truncate">
                              {conversation.partner.name}
                            </span>
                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {formatMessageDate(conversation.lastMessage.created_at)}
                              </span>
                              <span
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm("Deseja excluir esta conversa?")) {
                                    deleteConversation.mutate(conversation.partnerId);
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {conversation.lastMessage.content}
                          </p>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : showSearch ? (
          /* Search Connections View */
          <div className="flex flex-col w-full">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-sm flex-1">Nova Conversa</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="px-3 py-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conexões..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  autoFocus
                />
              </div>
            </div>
            {loadingFollowing ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Nenhuma conexão encontrada" : "Você ainda não segue ninguém"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Conecte-se com membros no Networking primeiro
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="divide-y divide-border">
                  {filteredConnections.map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => handleSelectFromSearch(member)}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm truncate block">{member.name}</span>
                        {member.niche && (
                          <span className="text-xs text-muted-foreground truncate block">{member.niche}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          /* Chat View */
          <div className="flex flex-col w-full">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPartner(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedPartner.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(selectedPartner.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm truncate flex-1">{selectedPartner.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 px-4 py-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-sm">Nenhuma mensagem ainda.</p>
                  <p className="text-xs">Envie a primeira mensagem!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages?.map((message) => {
                    const isSender = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn("flex", isSender ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2",
                            isSender ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-0.5",
                              isSender ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="px-3 py-3 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[44px] max-h-[100px] resize-none text-sm"
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMessage.isPending}
                  className="self-end h-[44px] w-[44px]"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
