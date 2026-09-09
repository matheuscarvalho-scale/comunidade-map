import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Trophy, Flame, UserPlus, UserCheck, Eye, MessageCircle, Briefcase } from "lucide-react";
import type { MemberProfile } from "@/types/networking";
import { getNicheLabel, getNicheColor, getExperienceLabel } from "@/types/networking";
import { MemberLevelBadge } from "@/components/conquistas/MemberLevelBadge";
import { cn } from "@/lib/utils";

interface MemberCardProps {
  member: MemberProfile;
  onFollow: () => void;
  onUnfollow: () => void;
  onMessage: () => void;
  isFollowPending?: boolean;
  isUnfollowPending?: boolean;
  isCurrentUser?: boolean;
}

export function MemberCard({
  member,
  onFollow,
  onUnfollow,
  onMessage,
  isFollowPending,
  isUnfollowPending,
  isCurrentUser
}: MemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const location = member.location_city && member.location_state 
    ? `${member.location_city}, ${member.location_state}`
    : member.location || member.location_state || member.location_city;

  return (
    <Card className="card-glow hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={member.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{member.name}</CardTitle>
            {(member.company || member.job_title) && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <Briefcase className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{[member.job_title, member.company].filter(Boolean).join(" • ")}</span>
              </CardDescription>
            )}
            {location && (
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {member.specialties && member.specialties.length > 0 ? (
            member.specialties.map((spec) => (
              <Badge key={spec} variant="outline" className="text-xs">
                {spec}
              </Badge>
            ))
          ) : (
            <>
              <Badge className={cn("text-white", getNicheColor(member.niche))}>
                {getNicheLabel(member.niche)}
              </Badge>
              <Badge variant="outline">
                {getExperienceLabel(member.experience_level)}
              </Badge>
            </>
          )}
        </div>

        {member.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {member.bio}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <MemberLevelBadge points={member.total_points} size="sm" />
            {member.streak > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                {member.streak}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {member.followersCount} seguidores
          </span>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link to={`/networking/perfil/${member.user_id}`}>
              <Eye className="h-4 w-4 mr-1" />
              Ver Perfil
            </Link>
          </Button>
          
          {!isCurrentUser && (
            <>
              {member.isFollowing ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onUnfollow}
                  disabled={isUnfollowPending}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Seguindo
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onFollow}
                  disabled={isFollowPending}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Seguir
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={onMessage}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
