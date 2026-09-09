import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlocked_at: string | null;
}

interface RecentAchievementsCardProps {
  achievements: Achievement[];
}

export function RecentAchievementsCard({ achievements }: RecentAchievementsCardProps) {
  return (
    <Card className="card-glow border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Conquistas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não desbloqueou nenhuma conquista. Continue aprendendo!
          </p>
        ) : (
          achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex items-center gap-3 rounded-lg bg-muted/30 p-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl animate-badge-unlock">
                {achievement.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{achievement.name}</p>
                <p className="text-xs text-muted-foreground">{achievement.description}</p>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                +{achievement.points}
              </Badge>
            </div>
          ))
        )}
        <Button asChild variant="outline" className="w-full rounded-full">
          <Link to="/conquistas">Ver Todas</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
