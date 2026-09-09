import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";

interface Mentor {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
}

interface MentorPresenterSelectProps {
  currentName: string;
  onSelect: (mentor: Mentor) => void;
  onClear: () => void;
}

export function MentorPresenterSelect({ currentName, onSelect, onClear }: MentorPresenterSelectProps) {
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(false);

  const { data: mentors = [] } = useQuery({
    queryKey: ["mentors-for-presenter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors_public")
        .select("id, name, avatar_url, bio, specialty")
        .order("name");
      if (error) throw error;
      return data as Mentor[];
    },
  });

  const filtered = mentors.filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  if (currentName) {
    return (
      <Button variant="outline" size="sm" onClick={onClear} className="gap-2 w-full justify-between">
        <span className="truncate">{currentName}</span>
        <X className="h-3.5 w-3.5 shrink-0" />
      </Button>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowList(true); }}
          onFocus={() => setShowList(true)}
          placeholder="Buscar apresentador..."
          className="pl-8 h-9 text-sm"
        />
      </div>
      {showList && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground text-center">Nenhum encontrado</p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors text-sm"
                onClick={() => {
                  onSelect(m);
                  setShowList(false);
                  setSearch("");
                }}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  {m.specialty && <p className="text-xs text-muted-foreground truncate">{m.specialty}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}