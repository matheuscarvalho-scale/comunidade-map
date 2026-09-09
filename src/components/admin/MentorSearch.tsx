import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface MentorRow {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
}

interface ProfileRow {
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
}

type Result =
  | { source: "mentor"; id: string; name: string; email: string; avatar_url: string | null; bio: string | null; specialty: string | null }
  | { source: "profile"; id: null; name: string; email: string; avatar_url: string | null; bio: string | null; specialty: null };

interface MentorSearchProps {
  mentorId: string | null;
  mentorName: string;
  mentorEmail: string;
  onSelect: (mentor: { id: string | null; name: string; email: string; avatar_url: string | null; bio: string | null }) => void;
  onClear: () => void;
}

export function MentorSearch({ mentorId, mentorName, mentorEmail, onSelect, onClear }: MentorSearchProps) {
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);
  const [profileResults, setProfileResults] = useState<ProfileRow[]>([]);

  // All registered mentors (mentors table)
  const { data: mentors = [] } = useQuery({
    queryKey: ["all-mentors-admin-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors")
        .select("id, name, email, avatar_url, bio, specialty")
        .order("name");
      if (error) throw error;
      return data as MentorRow[];
    },
  });

  const selectedMentor = mentors.find((m) => m.id === mentorId);

  // Debounced profile search
  useEffect(() => {
    if (search.trim().length < 2) {
      setProfileResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_profiles_with_email", {
        search_query: search.trim(),
      });
      setProfileResults((data as ProfileRow[]) || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const filteredMentors = mentors.filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Avoid duplicates: profiles whose email matches an existing mentor are filtered out
  const mentorEmails = new Set(mentors.map((m) => (m.email || "").toLowerCase()).filter(Boolean));
  const filteredProfiles = profileResults.filter(
    (p) => !p.email || !mentorEmails.has(p.email.toLowerCase()),
  );

  const combined: Result[] = [
    ...filteredMentors.map<Result>((m) => ({
      source: "mentor",
      id: m.id,
      name: m.name,
      email: m.email || "",
      avatar_url: m.avatar_url,
      bio: m.bio,
      specialty: m.specialty,
    })),
    ...filteredProfiles.map<Result>((p) => ({
      source: "profile",
      id: null,
      name: p.name,
      email: p.email || "",
      avatar_url: p.avatar_url,
      bio: p.bio,
      specialty: null,
    })),
  ];

  if (mentorName) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Mentor</p>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1 text-xs text-destructive">
            <X className="h-3 w-3" /> Remover
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {selectedMentor?.avatar_url && <AvatarImage src={selectedMentor.avatar_url} alt={mentorName} className="object-cover" />}
            <AvatarFallback>{mentorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{mentorName}</p>
            {mentorEmail && <p className="text-xs text-muted-foreground truncate">{mentorEmail}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-muted-foreground">Mentor</p>
      <div className="relative">
        <Label>Buscar mentor cadastrado ou perfil</Label>
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)}
            onBlur={() => setTimeout(() => setShowList(false), 200)}
            placeholder="Digite o nome do mentor..."
            className="pl-9"
          />
        </div>
        {showList && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-y-auto">
            {combined.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">Nenhum resultado</p>
            ) : (
              combined.map((r, idx) => (
                <button
                  key={`${r.source}-${r.id ?? r.email}-${idx}`}
                  type="button"
                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                  onMouseDown={async (e) => {
                    e.preventDefault();
                    let finalMentorId: string | null = r.id;

                    // If it's a profile (no mentor row yet), create the mentor record
                    if (r.source === "profile" && r.email) {
                      const { data: existing } = await supabase
                        .from("mentors")
                        .select("id")
                        .ilike("email", r.email)
                        .maybeSingle();
                      if (existing) {
                        finalMentorId = existing.id;
                        await supabase.from("mentors").update({
                          name: r.name,
                          avatar_url: r.avatar_url,
                          bio: r.bio,
                        }).eq("id", existing.id);
                      } else {
                        const { data: newMentor } = await supabase
                          .from("mentors")
                          .insert({ name: r.name, email: r.email, avatar_url: r.avatar_url, bio: r.bio })
                          .select("id")
                          .single();
                        if (newMentor) finalMentorId = newMentor.id;
                      }
                    }

                    onSelect({
                      id: finalMentorId,
                      name: r.name,
                      email: r.email,
                      avatar_url: r.avatar_url,
                      bio: r.bio,
                    });
                    setSearch("");
                    setShowList(false);
                  }}
                >
                  <Avatar className="h-8 w-8">
                    {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.name} className="object-cover" />}
                    <AvatarFallback>{r.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    {(r.specialty || r.email) && (
                      <p className="text-xs text-muted-foreground truncate">{r.specialty || r.email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className={r.source === "mentor" ? "text-[10px] bg-primary/10 text-primary border-primary/30" : "text-[10px]"}>
                    {r.source === "mentor" ? "Mentor" : "Perfil"}
                  </Badge>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
