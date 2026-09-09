import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, X, User, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useRef } from "react";

interface Profile {
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface PresenterProfileSearchProps {
  presenterName: string;
  presenterBio: string;
  presenterAvatar: string;
  onSelect: (profile: Profile) => void;
  onClear: () => void;
}

export function PresenterProfileSearch({
  presenterName,
  presenterBio,
  presenterAvatar,
  onSelect,
  onClear,
}: PresenterProfileSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualBio, setManualBio] = useState("");
  const [manualAvatar, setManualAvatar] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch external mentors/presenters
  const { data: mentors = [] } = useQuery({
    queryKey: ["mentors-for-presenter-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentors_public")
        .select("id, name, avatar_url, bio, specialty")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });


  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      // Search profiles (members)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, bio, avatar_url")
        .ilike("name", `%${query.trim()}%`)
        .limit(8);

      // Search mentors (external presenters)
      const matchingMentors = mentors
        .filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()))
        .map((m) => ({
          name: m.name,
          bio: m.bio || m.specialty || null,
          avatar_url: m.avatar_url,
          _source: "external" as const,
        }));

      const profileResults = (profileData || []).map((p) => ({
        ...p,
        _source: "member" as const,
      }));

      // Deduplicate by name (external takes priority since they have richer data)
      const seen = new Set<string>();
      const merged: (Profile & { _source: string })[] = [];
      for (const item of [...matchingMentors, ...profileResults]) {
        const key = item.name.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }

      setResults(merged.slice(0, 10));
      setShowResults(true);
    } finally {
      setSearching(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({ title: "Formato inválido. Use JPG, PNG ou WebP.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Máximo 2MB.", variant: "destructive" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `presenters/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("formation-thumbnails").upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("formation-thumbnails").getPublicUrl(fileName);
      setManualAvatar(urlData.publicUrl);
      toast({ title: "✅ Foto enviada!" });
    } catch {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleManualSave = () => {
    if (!manualName.trim()) {
      toast({ title: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    onSelect({
      name: manualName.trim(),
      bio: manualBio.trim() || null,
      avatar_url: manualAvatar || null,
    });
    setManualName("");
    setManualBio("");
    setManualAvatar("");
  };

  if (presenterName) {
    return (
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Apresentador</p>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1 text-xs text-destructive">
            <X className="h-3 w-3" />
            Remover
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {presenterAvatar ? (
            <img src={presenterAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium">{presenterName}</p>
            {presenterBio && <p className="text-xs text-muted-foreground line-clamp-1">{presenterBio}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-muted-foreground">🎤 Apresentador deste Conteúdo</p>
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="search" className="text-xs">Buscar Perfil</TabsTrigger>
          <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
        </TabsList>

        {/* Unified search tab */}
        <TabsContent value="search" className="mt-3">
          <div className="relative">
            <Label>Buscar membro ou apresentador externo</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Digite o nome..."
                className="pl-9"
                onFocus={() => results.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
              />
            </div>
            {showResults && results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                {results.map((profile, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect({ name: profile.name, bio: profile.bio, avatar_url: profile.avatar_url });
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{profile.name}</p>
                        {(profile as any)._source === "external" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary shrink-0">Externo</span>
                        )}
                      </div>
                      {profile.bio && <p className="text-xs text-muted-foreground truncate">{profile.bio}</p>}
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
        </TabsContent>

        {/* Manual tab */}
        <TabsContent value="manual" className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label>Foto do apresentador</Label>
            {manualAvatar ? (
              <div className="flex items-center gap-3">
                <img src={manualAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setManualAvatar("")}>
                  Remover
                </Button>
              </div>
            ) : (
              <div
                className="h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Enviar foto (max 2MB)</span>
                  </>
                )}
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome do apresentador" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Input value={manualBio} onChange={(e) => setManualBio(e.target.value)} placeholder="Breve descrição (opcional)" />
          </div>
          <Button size="sm" className="w-full" onClick={handleManualSave} disabled={!manualName.trim()}>
            Confirmar apresentador
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
