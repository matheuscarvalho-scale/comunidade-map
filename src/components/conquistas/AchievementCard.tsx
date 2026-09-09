import { Lock, Share2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AchievementWithProgress } from "@/hooks/useAchievementsComplete";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  onShare?: (achievement: AchievementWithProgress) => void;
}

export function AchievementCard({ achievement, onShare }: AchievementCardProps) {
  const progress = achievement.userProgress?.progress || 0;
  const maxProgress = achievement.max_progress || 1;
  const progressPercent = (progress / maxProgress) * 100;

  return (
    <Card
      className={`card-glow border-border/50 transition-all ${
        !achievement.isUnlocked ? "opacity-60" : "hover:border-primary/30"
      }`}
    >
      <CardContent className="p-5 text-center relative">
        {/* Lock icon for locked achievements */}
        {!achievement.isUnlocked && (
          <div className="absolute top-3 right-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {/* Seasonal badge */}
        {achievement.is_seasonal && (
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-400">
              <Calendar className="h-3 w-3 mr-1" />
              Especial
            </Badge>
          </div>
        )}

        {/* Share button for unlocked achievements */}
        {achievement.isUnlocked && onShare && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => onShare(achievement)}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}

        {/* Icon */}
        <div
          className={`text-5xl mx-auto ${
            achievement.isUnlocked ? "animate-badge-unlock" : "grayscale"
          }`}
        >
          {achievement.icon}
        </div>

        {/* Name */}
        <h3 className="mt-4 font-semibold">{achievement.name}</h3>

        {/* Description */}
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {achievement.description}
        </p>

        {/* Points badge */}
        <Badge
          variant="outline"
          className={`mt-3 ${
            achievement.isUnlocked
              ? "text-primary border-primary/30"
              : "text-muted-foreground"
          }`}
        >
          +{achievement.points || 0} pts
        </Badge>

        {/* Unlocked date */}
        {achievement.isUnlocked && achievement.userProgress?.unlocked_at && (
          <p className="mt-2 text-xs text-muted-foreground">
            Conquistado em{" "}
            {format(new Date(achievement.userProgress.unlocked_at), "dd/MM/yyyy", {
              locale: ptBR,
            })}
          </p>
        )}

        {/* Progress for locked achievements */}
        {!achievement.isUnlocked && achievement.max_progress && (
          <div className="mt-3">
            <Progress value={progressPercent} className="h-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">
              {progress}/{maxProgress}
            </p>
          </div>
        )}

        {/* Season name */}
        {achievement.is_seasonal && achievement.season_name && (
          <p className="mt-2 text-xs text-orange-400">{achievement.season_name}</p>
        )}

        {/* Expiration date */}
        {achievement.is_seasonal && achievement.expires_at && (
          <p className="text-xs text-muted-foreground">
            Expira em{" "}
            {format(new Date(achievement.expires_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
