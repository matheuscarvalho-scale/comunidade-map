import { Button } from "@/components/ui/button";
import { Bookmark, Loader2 } from "lucide-react";
import { useContentFavorite, useToggleContentFavorite } from "@/hooks/useContentNotesAndFavorites";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  contentType: "formation_lesson" | "content_item";
  contentId: string;
  variant?: "icon" | "full";
  className?: string;
}

export function FavoriteButton({ contentType, contentId, variant = "icon", className }: FavoriteButtonProps) {
  const { data: isFavorited, isLoading } = useContentFavorite(contentType, contentId);
  const toggle = useToggleContentFavorite();
  const { toast } = useToast();

  const handleToggle = async () => {
    try {
      await toggle.mutateAsync({ contentType, contentId, isFavorited: !!isFavorited });
      toast({
        title: isFavorited ? "Removido dos salvos" : "Salvo para depois! 🔖",
      });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size={variant === "icon" ? "icon" : "sm"} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        disabled={toggle.isPending}
        className={cn("shrink-0", className)}
        title={isFavorited ? "Remover dos salvos" : "Salvar para depois"}
      >
        <Bookmark className={cn("h-5 w-5", isFavorited ? "fill-primary text-primary" : "text-muted-foreground")} />
      </Button>
    );
  }

  return (
    <Button
      variant={isFavorited ? "secondary" : "outline"}
      size="sm"
      onClick={handleToggle}
      disabled={toggle.isPending}
      className={cn("gap-2", className)}
    >
      <Bookmark className={cn("h-4 w-4", isFavorited && "fill-current")} />
      {isFavorited ? "Salvo" : "Salvar"}
    </Button>
  );
}
