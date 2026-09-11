import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const mapinhaAvatar = { url: "/images/mapinha.png" };

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
  interactionId?: string;
  rating?: -1 | 1;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const WELCOME_TEXT =
  "Olá! 👋 Sou o Mapinha, o que posso fazer por você hoje?";

const SUGGESTIONS = [
  "Qual a taxa do nicho de moda para Amazon?",
  "Precificação estratégica na Shopee",
  "Qual a taxa da TikTok Shop?",
  "Logística e Fretes Mercado Livre",
];

export function AiAssistantWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef(genId());

  // Reset chat when user changes (no persistence — session only)
  useEffect(() => {
    if (!user?.id) return;
    if (lastUserId !== user.id) {
      setMessages([{ role: "assistant", content: WELCOME_TEXT, id: genId() }]);
      conversationIdRef.current = genId();
      setLastUserId(user.id);
    }
  }, [user?.id, lastUserId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const startNewChat = useCallback(() => {
    setMessages([{ role: "assistant" as const, content: WELCOME_TEXT, id: genId() }]);
    conversationIdRef.current = genId();
  }, []);

  if (!user) return null;

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text, id: genId() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInput("");
    setLoading(true);

    // Build payload excluding welcome message and mapping to minimal shape for API
    const apiMessages = newMessages
      .filter((m) => m.content !== WELCOME_TEXT)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { messages: apiMessages, conversationId: conversationIdRef.current },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply,
          id: genId(),
          interactionId: data.interactionId,
        },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["mapinha-analytics"] });
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao falar com a IA");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setConfirmClearOpen(true);
  };

  const rateAnswer = async (messageId: string, interactionId: string, rating: -1 | 1) => {
    setMessages((current) =>
      current.map((message) => message.id === messageId ? { ...message, rating } : message),
    );
    const { error } = await supabase.rpc("rate_mapinha_interaction", {
      interaction_id: interactionId,
      new_rating: rating,
    });
    if (error) {
      setMessages((current) =>
        current.map((message) => message.id === messageId ? { ...message, rating: undefined } : message),
      );
      toast.error("Não foi possível salvar sua avaliação.");
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir assistente IA"
        data-ga="ai-assistant-toggle"
        className={cn(
          "fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full shadow-lg overflow-hidden",
          "hover:scale-105 active:scale-95",
          "transition-all duration-200 flex items-center justify-center",
          "ring-2 ring-primary/30 hover:ring-primary/50",
          open ? "bg-primary text-primary-foreground" : "bg-background",
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <img src={mapinhaAvatar.url} alt="Mapinha" className="h-full w-full object-cover" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[400px]",
            "h-[70vh] max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl",
            "flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
                <img src={mapinhaAvatar.url} alt="Mapinha" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-sm font-semibold">Mapinha</div>
                <div className="text-[10px] text-muted-foreground">IA da plataforma · não acessa dados pessoais</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleClear}
                title="Nova conversa"
                aria-label="Apagar histórico e iniciar nova conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-end gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {msg.role === "assistant" && (
                  <img
                    src={mapinhaAvatar.url}
                    alt=""
                    className="h-6 w-6 rounded-full object-cover shrink-0 mb-0.5"
                  />
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 break-words">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              const raw = href ?? "";
                              const isExternal = /^https?:\/\//i.test(raw);
                              const isInternal = raw.startsWith("/");
                              if (isInternal) {
                                return (
                                  <a
                                    href={raw}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setOpen(false);
                                      navigate(raw);
                                    }}
                                    className="text-primary underline break-all"
                                  >
                                    {children}
                                  </a>
                                );
                              }
                              const safe = isExternal ? raw : raw ? `https://${raw.replace(/^\/+/, "")}` : "#";
                              return (
                                <a
                                  href={safe}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary underline break-all"
                                >
                                  {children}
                                </a>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.interactionId && (
                        <div className="mt-2 pt-1 border-t border-border/60 flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground mr-1">Foi útil?</span>
                          <button
                            type="button"
                            onClick={() => rateAnswer(msg.id, msg.interactionId!, 1)}
                            aria-label="Resposta útil"
                            className={cn(
                              "p-1 rounded hover:bg-background/70 transition-colors",
                              msg.rating === 1 ? "text-emerald-500" : "text-muted-foreground",
                            )}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => rateAnswer(msg.id, msg.interactionId!, -1)}
                            aria-label="Resposta não útil"
                            className={cn(
                              "p-1 rounded hover:bg-background/70 transition-colors",
                              msg.rating === -1 ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1 pl-8">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#BFFF00]/40 bg-[#BFFF00]/10 text-[#BFFF00] hover:bg-[#BFFF00]/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {loading && (
              <div className="flex items-end justify-start gap-2">
                <img
                  src={mapinhaAvatar.url}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover shrink-0 mb-0.5"
                />
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Pensando...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-background/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte algo sobre a plataforma..."
                disabled={loading}
                className="flex-1"
                aria-label="Mensagem para a IA"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                data-ga="ai-assistant-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar o histórico desta conversa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                startNewChat();
                setConfirmClearOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
