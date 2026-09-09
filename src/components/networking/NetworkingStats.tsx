import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Heart } from "lucide-react";

interface NetworkingStatsProps {
  totalMembers: number;
  followingCount: number;
  followersCount: number;
}

export function NetworkingStats({ totalMembers, followingCount, followersCount }: NetworkingStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="card-glow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-sm text-muted-foreground">Membros ativos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{followingCount}</p>
              <p className="text-sm text-muted-foreground">Você está seguindo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glow">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{followersCount}</p>
              <p className="text-sm text-muted-foreground">Te seguem</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
