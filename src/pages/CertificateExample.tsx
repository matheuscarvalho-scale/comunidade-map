import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function CertificateExample() {
  const navigate = useNavigate();

  const bgColor = '#0a0a0a';
  const accentColor = '#BFFF00';
  const textColor = '#ffffff';
  const mutedColor = '#888888';
  const logoUrl = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663348192924/FysRjiCOPkbXTSzg.png';
  const signatureUrl = 'https://res.cloudinary.com/dbnpjgskw/image/upload/v1773344219/ChatGPT_Image_12_de_mar._de_2026_16_36_39_nzxkcy.png';
  const userName = 'JOÃO SILVA';
  const formationTitle = 'Fundamentos do E-commerce';
  const completedDate = '15 de março de 2026';
  const certificateNumber = 'MAP-ABC123-XY9Z';

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 850" width="100%" style="max-width:1200px; display:block; margin:0 auto">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a1a" stroke-width="1"/>
        </pattern>
      </defs>

      <rect width="1200" height="850" fill="${bgColor}"/>
      <rect width="1200" height="850" fill="url(#grid)"/>

      <path d="M 30 90 L 30 30 L 90 30" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
      <path d="M 1170 30 L 1110 30" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
      <path d="M 1170 30 L 1170 90" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
      <path d="M 30 760 L 30 820 L 90 820" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
      <path d="M 1170 820 L 1110 820" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>
      <path d="M 1170 820 L 1170 760" stroke="${accentColor}" stroke-width="6" fill="none" stroke-linecap="square"/>

      <image x="510" y="45" width="180" height="75"
        href="${logoUrl}"
        xlink:href="${logoUrl}"/>

      <text x="600" y="195" text-anchor="middle" font-family="Sora, sans-serif" font-size="48" font-weight="800" fill="${textColor}">CERTIFICADO</text>
      <text x="600" y="240" text-anchor="middle" font-family="Sora, sans-serif" font-size="24" letter-spacing="4" fill="${accentColor}">DE CONCLUSÃO</text>

      <line x1="400" y1="270" x2="800" y2="270" stroke="${accentColor}" stroke-width="1"/>

      <text x="600" y="330" text-anchor="middle" font-family="Sora, sans-serif" font-size="20" fill="${mutedColor}">Certificamos que</text>

      <text x="600" y="400" text-anchor="middle" font-family="Sora, sans-serif" font-size="44" font-weight="700" fill="${textColor}">${userName}</text>

      <line x1="250" y1="420" x2="950" y2="420" stroke="${accentColor}" stroke-width="2"/>

      <text x="600" y="470" text-anchor="middle" font-family="Sora, sans-serif" font-size="16" fill="${mutedColor}">concluiu com êxito todas as aulas e atividades da formação</text>

      <text x="600" y="520" text-anchor="middle" font-family="Sora, sans-serif" font-size="32" font-weight="700" fill="${textColor}">${formationTitle}</text>

      <text x="600" y="570" text-anchor="middle" font-family="Sora, sans-serif" font-size="14" fill="${mutedColor}">demonstrando dedicação e comprometimento com seu desenvolvimento profissional no e-commerce.</text>

      <text x="600" y="620" text-anchor="middle" font-family="Sora, sans-serif" font-size="16" fill="${mutedColor}">Concluído em ${completedDate}</text>

      <g id="signature" transform="translate(600, 642)">
        <image
          href="${signatureUrl}"
          xlink:href="${signatureUrl}"
          x="-180" y="-18" width="360" height="84"
          preserveAspectRatio="xMidYMid meet"/>
        <line x1="-200" y1="72" x2="200" y2="72" stroke="${textColor}" stroke-width="1" opacity="0.6"/>
        <text x="0" y="98" text-anchor="middle" font-family="Sora, sans-serif" font-size="14" font-weight="700" fill="${textColor}">Pedro Spinelli</text>
        <text x="0" y="116" text-anchor="middle" font-family="Sora, sans-serif" font-size="11" fill="${mutedColor}">Cofundador e CEO da MAP Educação</text>
      </g>

      <text x="600" y="840" text-anchor="middle" font-family="Sora, sans-serif" font-size="10" fill="${mutedColor}">Valide este certificado em: acelera.mapeducacao.com/validar-certificado?code=${certificateNumber}</text>
    </svg>
  `;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Preview do Certificado</h1>
        </div>

        <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border p-4">
          <div
            className="w-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
            style={{ maxWidth: '100%' }}
          />
        </div>

        <div className="mt-8 p-6 bg-muted rounded-lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Dados de Exemplo</h2>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li>• <strong>Nome:</strong> {userName}</li>
            <li>• <strong>Formação:</strong> {formationTitle}</li>
            <li>• <strong>Data:</strong> {completedDate} (dinâmica)</li>
            <li>• <strong>Código:</strong> {certificateNumber} (gerado automaticamente)</li>
            <li>• <strong>Assinatura:</strong> Pedro Spinelli</li>
            <li>• <strong>Formato de saída:</strong> SVG (vetor)</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Este é o modelo exato gerado pela Edge Function. Diga o que quer mudar: layout, cores, textos, formato, etc.
          </p>
        </div>
      </div>
    </div>
  );
}
