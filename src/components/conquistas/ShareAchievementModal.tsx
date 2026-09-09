import { useState } from "react";
import { Twitter, Linkedin, Copy, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AchievementWithProgress } from "@/hooks/useAchievementsComplete";

interface ShareAchievementModalProps {
  achievement: AchievementWithProgress | null;
  open: boolean;
  onClose: () => void;
}

export function ShareAchievementModal({
  achievement,
  open,
  onClose,
}: ShareAchievementModalProps) {
  const [copied, setCopied] = useState(false);

  if (!achievement) return null;

  const shareText = `🏆 Acabei de conquistar "${achievement.name}" no MAP Acelera! ${achievement.description} +${achievement.points} pontos!`;
  const shareUrl = "https://acelera.mapeducacao.com";

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const handleLinkedInShare = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Compartilhar Conquista
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Achievement Preview Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-6 text-center">
            <div className="text-6xl animate-bounce">{achievement.icon}</div>
            <h3 className="mt-4 text-xl font-bold text-primary">{achievement.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{achievement.description}</p>
            <Badge className="mt-4 bg-primary text-primary-foreground">
              +{achievement.points} pontos
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">MAP Acelera</p>
          </CardContent>
        </Card>

        {/* Share Buttons */}
        <div className="flex flex-col gap-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleTwitterShare}
          >
            <Twitter className="h-5 w-5 text-[#1DA1F2]" />
            Compartilhar no Twitter
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleLinkedInShare}
          >
            <Linkedin className="h-5 w-5 text-[#0A66C2]" />
            Compartilhar no LinkedIn
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleCopyLink}
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
            {copied ? "Copiado!" : "Copiar Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
