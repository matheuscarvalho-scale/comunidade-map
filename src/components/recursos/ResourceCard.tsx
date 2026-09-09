import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Download, FileSpreadsheet, FileText, Layout, Presentation, Star, TrendingUp, Trash2, Wrench } from "lucide-react";
import { EditResourceModal } from "./EditResourceModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Resource } from "@/hooks/useResources";

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

interface ResourceCardProps {
  resource: Resource;
  isAdmin: boolean;
  isDownloading: boolean;
  onDownload: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  orderNumber?: number;
}

export function ResourceCard({ resource, isAdmin, isDownloading, onDownload, onDelete, onToggleActive, orderNumber }: ResourceCardProps) {
  const TypeIcon = typeIcons[resource.type] || FileText;
  const comingSoon = !resource.file_url && !resource.external_url;
  const isInactive = !resource.is_active;
  const canManage = isAdmin && !resource.readOnly;

  return (
    <Card className={`group hover:shadow-md transition-all duration-200 border-border/60 ${comingSoon ? 'opacity-60' : ''} ${isInactive && isAdmin ? 'opacity-50 border-dashed' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {orderNumber !== undefined && (
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                {String(orderNumber).padStart(2, '0')}
              </span>
            )}
            <div className={`p-2 rounded-lg ${comingSoon ? 'bg-muted' : 'bg-primary/10 group-hover:bg-primary/20'} transition-colors`}>
              <TypeIcon className={`h-4 w-4 ${comingSoon ? 'text-muted-foreground' : 'text-primary'}`} />
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {isInactive && isAdmin && (
              <Badge variant="outline" className="gap-1 text-xs border-destructive/50 text-destructive">
                Inativo
              </Badge>
            )}
            {comingSoon && (
              <Badge variant="secondary" className="gap-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                Em Breve
              </Badge>
            )}
            {resource.is_premium && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Star className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-base mt-2 leading-tight">
          {resource.title.replace(/^\d+_/, '').replace(/_/g, ' ')}
        </CardTitle>
        <CardDescription className="text-xs line-clamp-2">{resource.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{resource.downloads_count} downloads</span>
          </div>
          <div className="flex items-center gap-1">
            {resource.readOnly && (
              <Badge variant="outline" className="text-[10px] mr-1">
                Material da aula
              </Badge>
            )}
            {canManage && onToggleActive && (
              <div className="flex items-center mr-1" title={resource.is_active ? "Ativo" : "Inativo"}>
                <Switch
                  checked={resource.is_active}
                  onCheckedChange={(checked) => onToggleActive(resource.id, checked)}
                  className="scale-75"
                />
              </div>
            )}
            {canManage && <EditResourceModal resource={resource} />}
            {canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 p-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover recurso</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover "{resource.title}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(resource.id)}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              size="sm"
              variant={comingSoon ? "outline" : "default"}
              onClick={() => onDownload(resource)}
              disabled={isDownloading || comingSoon}
              className="h-7 text-xs px-3"
            >
              <Download className="h-3 w-3 mr-1" />
              {comingSoon ? "Em Breve" : "Baixar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
