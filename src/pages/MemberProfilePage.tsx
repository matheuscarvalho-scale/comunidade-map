import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { sanitizeUrl } from "@/lib/sanitizeUrl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  MapPin, 
  Briefcase,
  Trophy, 
  Flame,
  Globe,
  Instagram,
  Linkedin,
  UserPlus,
  UserCheck,
  MessageCircle,
  Users,
  Loader2,
  Award
} from "lucide-react";
import { 
  useMemberProfile, 
  useMemberFollowers, 
  useMemberFollowing,
  useFollowMember,
  useUnfollowMember
} from "@/hooks/useNetworkingComplete";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageModal } from "@/components/networking/MessageModal";
import { MemberLevelBadge } from "@/components/conquistas/MemberLevelBadge";
import { getNicheLabel, getNicheColor, getExperienceLabel } from "@/types/networking";
import { cn } from "@/lib/utils";

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: member, isLoading } = useMemberProfile(id || "");
  const { data: followers } = useMemberFollowers(id || "");
  const { data: following } = useMemberFollowing(id || "");
  const followMember = useFollowMember();
  const unfollowMember = useUnfollowMember();
  
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const isOwnProfile = user?.id === id;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFollow = async () => {
    if (!member) return;
    try {
      await followMember.mutateAsync(member.user_id);
      toast({
        title: "Conexão feita!",
        description: `Você agora está seguindo ${member.name}.`
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível seguir este membro.",
        variant: "destructive"
      });
    }
  };

  const handleUnfollow = async () => {
    if (!member) return;
    try {
      await unfollowMember.mutateAsync(member.user_id);
      toast({
        title: "Conexão removida",
        description: `Você deixou de seguir ${member.name}.`
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível deixar de seguir.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!member) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Membro não encontrado</p>
          <Button asChild className="mt-4">
            <Link to="/networking">Voltar ao Networking</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const location = member.location_city && member.location_state 
    ? `${member.location_city}, ${member.location_state}`
    : member.location || member.location_state || member.location_city;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link to="/networking">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Networking
          </Link>
        </Button>

        {/* Profile Header */}
        <Card className="card-glow">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold">{member.name}</h1>
                    {(member.company || member.job_title) && (
                      <p className="text-muted-foreground flex items-center gap-1 mt-1">
                        <Briefcase className="h-4 w-4" />
                        {[member.job_title, member.company].filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {location && (
                      <p className="text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {location}
                      </p>
                    )}
                  </div>
                  
                  {!isOwnProfile && (
                    <div className="flex gap-2 sm:ml-auto">
                      {member.isFollowing ? (
                        <Button
                          variant="secondary"
                          onClick={handleUnfollow}
                          disabled={unfollowMember.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Seguindo
                        </Button>
                      ) : (
                        <Button
                          onClick={handleFollow}
                          disabled={followMember.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Seguir
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => setMessageModalOpen(true)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Mensagem
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className={cn("text-white", getNicheColor(member.niche))}>
                    {getNicheLabel(member.niche)}
                  </Badge>
                  <Badge variant="outline">
                    {getExperienceLabel(member.experience_level)}
                  </Badge>
                </div>

                {member.bio && (
                  <p className="text-muted-foreground mb-4">{member.bio}</p>
                )}

                <div className="flex flex-wrap gap-6 text-sm items-center">
                  <MemberLevelBadge points={member.total_points} showProgress />
                  {member.streak > 0 && (
                    <span className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <span className="font-semibold">{member.streak}</span> dias seguidos
                    </span>
                  )}
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{member.followersCount}</span> seguidores
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">{member.followingCount}</span> seguindo
                  </span>
                </div>

                {/* Social Links */}
                <div className="flex gap-3 mt-4">
                  {member.website_url && sanitizeUrl(member.website_url) !== "#" && (
                    <a
                      href={sanitizeUrl(member.website_url)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                  {member.instagram_url && sanitizeUrl(member.instagram_url) !== "#" && (
                    <a
                      href={sanitizeUrl(member.instagram_url)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {member.linkedin_url && sanitizeUrl(member.linkedin_url) !== "#" && (
                    <a
                      href={sanitizeUrl(member.linkedin_url)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="followers">
          <TabsList>
            <TabsTrigger value="followers" className="gap-2">
              <Users className="h-4 w-4" />
              Seguidores ({followers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Seguindo ({following?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="mt-6">
            {!followers?.length ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum seguidor ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followers.map(follower => (
                  <Card key={follower.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <Link
                        to={`/networking/perfil/${follower.user_id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar>
                          <AvatarImage src={follower.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(follower.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{follower.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {follower.total_points} pontos
                          </p>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-6">
            {!following?.length ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Não está seguindo ninguém ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {following.map(followed => (
                  <Card key={followed.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <Link
                        to={`/networking/perfil/${followed.user_id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar>
                          <AvatarImage src={followed.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(followed.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{followed.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            {followed.total_points} pontos
                          </p>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Message Modal */}
        <MessageModal
          isOpen={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          partner={member}
        />
      </div>
    </MainLayout>
  );
}
