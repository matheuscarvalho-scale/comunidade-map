import { ResourceCard } from "./ResourceCard";
import type { Resource } from "@/hooks/useResources";

interface MarketplaceSectionProps {
  title: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  resources: Resource[];
  isAdmin: boolean;
  isDownloading: boolean;
  onDownload: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
}

export function MarketplaceSection({
  title,
  subtitle,
  icon,
  accentColor,
  resources,
  isAdmin,
  isDownloading,
  onDownload,
  onDelete,
  onToggleActive,
}: MarketplaceSectionProps) {
  if (resources.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${accentColor}`}>
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <span className="ml-auto text-sm font-medium text-muted-foreground">
          {resources.length} {resources.length === 1 ? 'recurso' : 'recursos'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {resources.map((resource, idx) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            isAdmin={isAdmin}
            isDownloading={isDownloading}
            onDownload={onDownload}
            onDelete={onDelete}
            onToggleActive={onToggleActive}
            orderNumber={idx + 1}
          />
        ))}
      </div>
    </div>
  );
}
