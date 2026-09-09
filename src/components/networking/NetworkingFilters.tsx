import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { NICHE_OPTIONS, EXPERIENCE_OPTIONS, BRAZILIAN_STATES } from "@/types/networking";

interface NetworkingFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  nicheFilter: string;
  onNicheChange: (value: string) => void;
  stateFilter: string;
  onStateChange: (value: string) => void;
  experienceFilter: string;
  onExperienceChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function NetworkingFilters({
  searchQuery,
  onSearchChange,
  nicheFilter,
  onNicheChange,
  stateFilter,
  onStateChange,
  experienceFilter,
  onExperienceChange,
  sortBy,
  onSortChange
}: NetworkingFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar membros por nome, bio ou cidade..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={nicheFilter} onValueChange={onNicheChange}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Nicho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os nichos</SelectItem>
              {NICHE_OPTIONS.map(niche => (
                <SelectItem key={niche.value} value={niche.value}>
                  {niche.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stateFilter} onValueChange={onStateChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os estados</SelectItem>
              {BRAZILIAN_STATES.map(state => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={experienceFilter} onValueChange={onExperienceChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Experiência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              {EXPERIENCE_OPTIONS.map(exp => (
                <SelectItem key={exp.value} value={exp.value}>
                  {exp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[160px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points">Mais pontos</SelectItem>
              <SelectItem value="followers">Mais seguidores</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="name">Nome A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
