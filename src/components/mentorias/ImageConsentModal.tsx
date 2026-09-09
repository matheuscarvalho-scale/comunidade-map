import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText } from "lucide-react";

interface ImageConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  sessionTitle?: string;
}

export function ImageConsentModal({
  open,
  onAccept,
  onCancel,
  isLoading,
  sessionTitle,
}: ImageConsentModalProps) {
  const [accepted, setAccepted] = useState(false);

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setAccepted(false);
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Termo de Cessão de Imagem e Voz
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[60vh] overflow-y-auto pr-4">
          <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
            <p className="font-semibold text-foreground">
              TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ
            </p>

            {sessionTitle && (
              <p>
                <strong>Sessão:</strong> {sessionTitle}
              </p>
            )}

            <p>
              Pelo presente instrumento, eu, na qualidade de <strong>CEDENTE</strong>,
              autorizo a empresa <strong>Map Educação LTDA</strong>, inscrita no CNPJ
              sob nº correspondente, com sede em Nova Friburgo/RJ, na qualidade de{" "}
              <strong>CESSIONÁRIA</strong>, a captar, armazenar e utilizar minha imagem
              e voz, nos termos a seguir:
            </p>

            <p className="font-semibold text-foreground">1. OBJETO</p>
            <p>
              A presente autorização tem por objeto a cessão gratuita do direito de uso
              de imagem e voz do CEDENTE, captados durante a sessão de mentoria ao vivo
              realizada na plataforma MAP Acelera.{" "}
              <strong>
                As mentorias são realizadas em ambiente coletivo e poderão ser gravadas
                em áudio e vídeo pela CESSIONÁRIA.
              </strong>{" "}
              O CEDENTE declara estar ciente do caráter coletivo das sessões e de que
              outros participantes também estarão presentes nas gravações.
            </p>

            <p className="font-semibold text-foreground">2. FINALIDADE</p>
            <p>
              A imagem e voz do CEDENTE poderão ser utilizadas exclusivamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Disponibilização da gravação integral ou parcial da mentoria dentro da
                plataforma MAP Acelera, para acesso dos membros ativos;
              </li>
              <li>
                Utilização de trechos ou cortes editados da gravação para fins
                educacionais, exclusivamente dentro da plataforma MAP Acelera;
              </li>
              <li>
                Arquivo interno para fins educacionais e de qualidade do conteúdo.
              </li>
            </ul>
            <p>
              Fica autorizado o uso integral ou parcial da gravação da mentoria,
              inclusive trechos editados, exclusivamente dentro da plataforma
              MAP Acelera.
            </p>

            <p className="font-semibold text-foreground">3. GRATUIDADE</p>
            <p>
              A presente cessão é realizada a título <strong>gratuito</strong>, não
              cabendo ao CEDENTE qualquer remuneração, indenização ou compensação
              financeira pelo uso de sua imagem e voz, conforme permitido pelo art. 20
              do Código Civil Brasileiro (Lei nº 10.406/2002).
            </p>

            <p className="font-semibold text-foreground">4. PRAZO E REVOGAÇÃO</p>
            <p>
              A autorização é concedida por prazo <strong>indeterminado</strong>,
              podendo o CEDENTE revogá-la a qualquer momento mediante comunicação
              escrita ao e-mail{" "}
              <strong>sucesso@mapeducacao.com</strong>.
            </p>
            <p>
              A revogação produzirá efeitos apenas para captações futuras,{" "}
              <strong>
                não implicando na obrigação de remoção ou edição de gravações já
                realizadas e disponibilizadas anteriormente
              </strong>{" "}
              na plataforma MAP Acelera, considerando o caráter coletivo das
              mentorias e o direito de acesso dos demais membros ao conteúdo
              educacional. A CESSIONÁRIA cessará a captação da imagem e voz do
              CEDENTE em novas sessões a partir da data de comunicação formal.
            </p>

            <p className="font-semibold text-foreground">5. ARMAZENAMENTO E PROTEÇÃO DE DADOS</p>
            <p>
              As gravações e dados pessoais do CEDENTE serão armazenados em servidores
              ou serviços de hospedagem utilizados pela plataforma MAP Acelera,
              podendo incluir provedores de infraestrutura em nuvem, em conformidade
              com a <strong>Lei nº 13.709/18 (LGPD)</strong>. A CESSIONÁRIA se
              compromete a adotar medidas técnicas e administrativas adequadas para
              proteger os dados pessoais do CEDENTE contra acessos não autorizados,
              situações acidentais ou ilícitas de destruição, perda, alteração ou
              comunicação indevida.
            </p>

            <p className="font-semibold text-foreground">6. GARANTIAS</p>
            <p>A CESSIONÁRIA se compromete a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Não utilizar a imagem e voz do CEDENTE de forma que atente contra sua
                honra, reputação, dignidade ou moral;
              </li>
              <li>
                Não ceder a terceiros os direitos aqui concedidos sem autorização
                prévia e por escrito do CEDENTE;
              </li>
              <li>
                Limitar o uso exclusivamente à plataforma MAP Acelera.
              </li>
            </ul>

            <p className="font-semibold text-foreground">7. FUNDAMENTO LEGAL</p>
            <p>
              Este termo está fundamentado nos seguintes dispositivos legais
              brasileiros:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Constituição Federal</strong> — Art. 5º, incisos V, X e XXVIII
                (direito à imagem e proteção da intimidade);
              </li>
              <li>
                <strong>Código Civil</strong> — Arts. 11 a 21 (direitos da
                personalidade) e Art. 20 (uso da imagem);
              </li>
              <li>
                <strong>Lei nº 9.610/98</strong> — Lei de Direitos Autorais;
              </li>
              <li>
                <strong>Lei nº 13.709/18 (LGPD)</strong> — Lei Geral de Proteção de
                Dados Pessoais, Art. 7º, inciso I (consentimento do titular) e Arts.
                46 a 49 (segurança e boas práticas no tratamento de dados).
              </li>
            </ul>

            <p className="font-semibold text-foreground">8. FORO</p>
            <p>
              Para dirimir quaisquer dúvidas ou controvérsias oriundas deste termo,
              fica eleito o foro da Comarca de Nova Friburgo/RJ, com exclusão de
              qualquer outro, por mais privilegiado que seja.
            </p>

            <p className="text-xs text-muted-foreground mt-4">
              Versão 2.0 — Ao aceitar este termo, o CEDENTE declara ter lido,
              compreendido e concordado com todas as cláusulas acima.
            </p>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-2 pt-2 border-t">
          <Checkbox
            id="consent-check"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
          />
          <label htmlFor="consent-check" className="text-sm cursor-pointer leading-snug">
            Li e aceito o Termo de Cessão de Imagem e Voz acima descrito. Estou ciente de que gravações já publicadas não serão removidas em caso de revogação ou cancelamento.
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={onAccept} disabled={!accepted || isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Aceitar e Fazer Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
