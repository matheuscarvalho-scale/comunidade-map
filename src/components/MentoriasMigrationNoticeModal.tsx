import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, PlayCircle } from "lucide-react";
const mentoriasTabAsset = { url: "/images/mentorias-gravadas-tab.png" };

interface Props {
  open: boolean;
  onDismiss: () => void;
  disabled?: boolean;
}

export function MentoriasMigrationNoticeModal({ open, onDismiss, disabled }: Props) {
  const navigate = useNavigate();

  const goToMentorias = () => {
    onDismiss();
    navigate("/mentorias");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-lime text-lime-foreground hover:bg-lime gap-1">
              <Sparkles className="h-3 w-3" />
              Novidade
            </Badge>
          </div>
          <DialogTitle className="text-2xl">
            As Mentorias Gravadas mudaram de lugar
          </DialogTitle>
          <DialogDescription className="pt-1">
            Elas saíram da <strong>Trilha de Conteúdo</strong> e agora ficam dentro da aba <strong>Mentorias</strong>, na sub-aba <strong>Gravadas</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Print da nova localização com destaque na aba Gravadas */}
        <div className="relative rounded-xl overflow-hidden border border-border bg-background">
          <img
            src={mentoriasTabAsset.url}
            alt="Aba Mentorias com destaque para a sub-aba Gravadas, onde ficam agora todas as mentorias gravadas"
            className="w-full h-auto block"
            loading="eager"
          />
          {/* Anel destacando a aba "Gravadas" */}
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-full ring-4 ring-lime animate-pulse-glow"
            style={{ top: "48%", left: "63%", width: "14%", height: "9%" }}
          />
          {/* Rótulo apontando */}
          <div
            aria-hidden
            className="pointer-events-none absolute hidden sm:flex items-center gap-1.5 rounded-md bg-lime text-lime-foreground px-2.5 py-1 text-xs font-semibold shadow-lg"
            style={{ top: "36%", left: "63%" }}
          >
            <PlayCircle className="h-3.5 w-3.5" />
            É aqui agora!
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Vá em <strong className="text-foreground">Mentorias</strong> no menu lateral e clique na aba <strong className="text-foreground">Gravadas</strong> — todas as gravações anteriores continuam disponíveis lá.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={onDismiss} disabled={disabled}>
            Entendi
          </Button>
          <Button onClick={goToMentorias} disabled={disabled} className="gap-1.5">
            Ir para Mentorias
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
