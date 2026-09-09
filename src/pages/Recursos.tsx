import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, FileSpreadsheet, FileText, Layout, Presentation, Wrench } from "lucide-react";
import { useResources, useIncrementDownload } from "@/hooks/useResources";
import { useContentMaterialsAsResources } from "@/hooks/useContentMaterialsAsResources";
import { useDeleteResource } from "@/hooks/useDeleteResource";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { AddResourceModal } from "@/components/recursos/AddResourceModal";
import { MarketplaceSection } from "@/components/recursos/MarketplaceSection";
import { groupResourcesByPlatform } from "@/lib/resourceGrouping";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Resource } from "@/hooks/useResources";
import { getSignedResourceUrl } from "@/lib/storage";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  spreadsheet: FileSpreadsheet,
  document: FileText,
  presentation: Presentation,
  template: Layout,
  tool: Wrench,
};

const typeLabels: Record<string, string> = {
  spreadsheet: "Planilha",
  document: "PDF/Documento",
  presentation: "PowerPoint",
  template: "Template",
  tool: "Ferramenta",
};

export default function Recursos() {
  const { toast } = useToast();
  const { hasRole } = useRole();
  const isAdmin = hasRole(['admin', 'admin_geral']);
  const { data: resources, isLoading } = useResources(isAdmin);
  const { data: materialResources, isLoading: materialsLoading } = useContentMaterialsAsResources();
  const incrementDownload = useIncrementDownload();
  const deleteResource = useDeleteResource();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const allResources = [...(resources || []), ...(materialResources || [])];

  const filteredResources = allResources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const marketplaceGroups = groupResourcesByPlatform(filteredResources);

  const handleDownload = async (resource: Resource) => {
    if (!resource.file_url && !resource.external_url) {
      toast({ title: "Em Breve", description: "Este recurso estará disponível em breve!" });
      return;
    }

    try {
      if (!resource.readOnly) {
        await incrementDownload.mutateAsync(resource.id);
      }

      if (resource.file_url) {
        const ext = resource.file_url.split('.').pop()?.split('?')[0] || 'pdf';
        const sanitizedTitle = resource.title.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').trim().replace(/\s+/g, '_');
        const downloadName = `${sanitizedTitle}.${ext}`;
        const signedUrl = await getSignedResourceUrl(resource.file_url);

        try {
          const response = await fetch(signedUrl);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = downloadName;
          a.setAttribute('data-ga-ignore', 'true');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch {
          window.open(signedUrl, '_blank');
        }
      } else if (resource.external_url) {
        window.open(resource.external_url, '_blank');
      }
      
      toast({ title: "Download iniciado!", description: `${resource.title} está sendo baixado.` });
    } catch {
      toast({ title: "Erro", description: "Não foi possível iniciar o download.", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    deleteResource.mutate(id, {
      onSuccess: () => toast({ title: "Recurso removido!" }),
      onError: () => toast({ title: "Erro ao remover recurso", variant: "destructive" }),
    });
  };

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("resources").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: () => {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
    },
  });

  const handleToggleActive = (id: string, isActive: boolean) => {
    toggleActive.mutate({ id, isActive });
  };

  const typeStats = allResources.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <MainLayout>
      <SEOHead
        title="Recursos"
        description="Baixe planilhas, templates, checklists e ferramentas exclusivas para acelerar a operação do seu e-commerce."
        canonical="/recursos"
        noIndex
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recursos</h1>
            <p className="text-muted-foreground mt-1">
              Biblioteca de templates, planilhas e ferramentas por marketplace
            </p>
          </div>
          {isAdmin && <AddResourceModal />}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(typeIcons).map(([type, Icon]) => (
            <Card key={type} className="border-border/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{typeStats[type] || 0}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[type]}s</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Marketplace Sections */}
        {isLoading || materialsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : marketplaceGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum recurso encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {marketplaceGroups.map(group => (
              <MarketplaceSection
                key={group.key}
                title={group.title}
                subtitle={group.subtitle}
                icon={group.icon}
                accentColor={group.accentColor}
                resources={group.resources}
                isAdmin={isAdmin}
                isDownloading={incrementDownload.isPending}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
