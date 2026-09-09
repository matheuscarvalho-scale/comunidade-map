import { useState } from "react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Settings, MessageCircle, Loader2 } from "lucide-react";
import { usePublicMembers, useFollowMember, useUnfollowMember } from "@/hooks/useNetworkingComplete";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MemberCard } from "@/components/networking/MemberCard";
import { NetworkingFilters } from "@/components/networking/NetworkingFilters";
import { NetworkingStats } from "@/components/networking/NetworkingStats";
import { ConversationsList } from "@/components/networking/ConversationsList";
import { MessageModal } from "@/components/networking/MessageModal";
import type { MemberProfile } from "@/types/networking";

export default function NetworkingList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: members, isLoading } = usePublicMembers();
  const followMember = useFollowMember();
  const unfollowMember = useUnfollowMember();

  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("todos");
  const [stateFilter, setStateFilter] = useState("todos");
  const [experienceFilter, setExperienceFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("points");
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<MemberProfile | null>(null);

  const otherMembers = (members || []).filter(m => m.user_id !== user?.id);
  const currentUserProfile = members?.find(m => m.user_id === user?.id);

  const filteredMembers = otherMembers
    .filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.location_city?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesNiche = nicheFilter === "todos" || member.niche === nicheFilter;
      const matchesState = stateFilter === "todos" || member.location_state === stateFilter;
      const matchesExperience = experienceFilter === "todos" || member.experience_level === experienceFilter;

      return matchesSearch && matchesNiche && matchesState && matchesExperience;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "points":
          return (b.total_points || 0) - (a.total_points || 0);
        case "followers":
          return (b.followersCount || 0) - (a.followersCount || 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  const handleFollow = async (member: MemberProfile) => {
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

  const handleUnfollow = async (member: MemberProfile) => {
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

  const handleOpenMessage = (partner: MemberProfile) => {
    setSelectedPartner(partner);
    setMessageModalOpen(true);
  };

  const followingCount = otherMembers.filter(m => m.isFollowing).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Networking</h1>
            <p className="text-muted-foreground mt-1">
              Conecte-se com outros membros da comunidade
            </p>
          </div>
          <Button asChild>
            <Link to="/networking/configurar">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Perfil
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <NetworkingStats
          totalMembers={otherMembers.length}
          followingCount={followingCount}
          followersCount={currentUserProfile?.followersCount || 0}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <NetworkingFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              nicheFilter={nicheFilter}
              onNicheChange={setNicheFilter}
              stateFilter={stateFilter}
              onStateChange={setStateFilter}
              experienceFilter={experienceFilter}
              onExperienceChange={setExperienceFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* Members Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredMembers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum membro encontrado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tente ajustar os filtros de busca
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMembers.map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onFollow={() => handleFollow(member)}
                    onUnfollow={() => handleUnfollow(member)}
                    onMessage={() => handleOpenMessage(member)}
                    isFollowPending={followMember.isPending}
                    isUnfollowPending={unfollowMember.isPending}
                    isCurrentUser={member.user_id === user?.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Conversations Sidebar */}
          <div className="lg:col-span-1">
            <ConversationsList
              onSelectConversation={handleOpenMessage}
              selectedPartnerId={selectedPartner?.user_id}
            />
          </div>
        </div>

        {/* Message Modal */}
        <MessageModal
          isOpen={messageModalOpen}
          onClose={() => setMessageModalOpen(false)}
          partner={selectedPartner}
        />
      </div>
    </MainLayout>
  );
}
