import { BookOpen, Video, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  coursesCompleted: number;
  mentoringsAttended: number;
  streak: number;
}

export function StatsCards({ coursesCompleted, mentoringsAttended, streak }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="card-glow border-border/50 bg-card">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-3">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{coursesCompleted}</p>
            <p className="text-sm text-muted-foreground">Formações Concluídas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow border-border/50 bg-card">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-3">
            <Video className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{mentoringsAttended}</p>
            <p className="text-sm text-muted-foreground">Mentorias Participadas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow border-border/50 bg-card sm:col-span-2 lg:col-span-1">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-3 animate-fire">
            <Flame className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{streak} dias</p>
            <p className="text-sm text-muted-foreground">Dias Consecutivos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
