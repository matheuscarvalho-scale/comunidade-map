import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProfileWithEmail {
  user_id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface MentorProfileSearchProps {
  mentorName: string;
  mentorEmail: string;
  onSelect: (profile: ProfileWithEmail) => void;
  onClear: () => void;
}

export function MentorProfileSearch({
  mentorName,
  mentorEmail,
  onSelect,
  onClear,
}: MentorProfileSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<ProfileWithEmail[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase.rpc("search_profiles_with_email", {
        search_query: query.trim(),
      });
      setResults((data as ProfileWithEmail[]) || []);
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

  if (mentorName) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Mentor</p>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1 text-xs text-destructive">
            <X className="h-3 w-3" />
            Remover
          </Button>
        </div>
        <div>
          <p className="font-medium">{mentorName}</p>
          {mentorEmail && <p className="text-xs text-muted-foreground">{mentorEmail}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-muted-foreground">Mentor</p>
      <div className="relative">
        <Label>Buscar perfil</Label>
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Digite o nome do mentor..."
            className="pl-9"
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
        </div>
        {showResults && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
            {results.map((profile) => (
              <button
                key={profile.user_id}
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(profile);
                  setSearchQuery("");
                  setShowResults(false);
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{profile.name}</p>
                  {profile.email && <p className="text-xs text-muted-foreground truncate">{profile.email}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
        {showResults && results.length === 0 && searchQuery.length >= 2 && !searching && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md p-3 text-center text-sm text-muted-foreground">
            Nenhum perfil encontrado
          </div>
        )}
      </div>
    </div>
  );
}
