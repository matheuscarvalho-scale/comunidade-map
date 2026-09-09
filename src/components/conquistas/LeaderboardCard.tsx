import { Crown, Medal, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MemberLevelBadge } from "./MemberLevelBadge";
import { LeaderboardEntry } from "@/hooks/useAchievementsComplete";

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  position: number;
}

export function LeaderboardCard({ entry, position }: LeaderboardCardProps) {
  const getRankIcon = () => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankBg = () => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-slate-400/20 to-transparent border-slate-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-700/20 to-transparent border-amber-700/30";
      default:
        return "bg-muted/30 border-border/50";
    }
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:bg-muted/50 ${getRankBg()}`}
    >
      {/* Position */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold text-lg">
        {getRankIcon() || position}
      </div>

      {/* Avatar */}
      <Avatar className="h-12 w-12 ring-2 ring-border">
        <AvatarImage src={entry.avatar_url || undefined} alt={entry.name} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {entry.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name and badges */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <MemberLevelBadge points={entry.total_points} size="sm" />
          <Badge variant="outline" className="text-xs">
            <Trophy className="h-3 w-3 mr-1" />
            {entry.achievements_count}
          </Badge>
        </div>
      </div>

      {/* Points */}
      <div className="text-right">
        <p className="text-xl font-bold text-primary">{entry.total_points}</p>
        <p className="text-xs text-muted-foreground">pontos</p>
      </div>
    </div>
  );
}
