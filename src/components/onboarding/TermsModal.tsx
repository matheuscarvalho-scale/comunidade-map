import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAcceptTerms, CURRENT_TERMS_VERSION } from "@/hooks/useOnboarding";
import { Loader2 } from "lucide-react";

export function TermsModal() {
  const [accepted, setAccepted] = useState(false);
  const acceptTerms = useAcceptTerms();

  const handleContinue = () => {
    acceptTerms.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-lime rounded-xl flex items-center justify-center">
            <span className="text-black font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-foreground">MAP Acelera</span>
        </div>
        <h1 className="text-2xl font-bold text-center text-foreground">
          Termos e Condições de Uso
        </h1>
        <p className="text-muted-foreground text-center mt-2">
          Por favor, leia atentamente os termos abaixo antes de continuar
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-8 text-muted-foreground leading-relaxed pb-8">
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">1. Visão Geral e Aceitação dos Termos</h2>
            <p className="mb-4">
              Bem-vindo à <strong>Plataforma MAP Acelera</strong> ("Plataforma"), um ambiente digital de aprendizado e colaboração operado pela Map Educação LTDA ("Empresa").
            </p>
            <p>
              Ao se cadastrar, acessar ou utilizar a Plataforma, você ("Usuário") declara ter lido, compreendido e concordado integralmente com estes <strong>Termos e Condições de Uso</strong> ("Termos") e com nossa <strong>Política de Privacidade</strong>. Caso não concorde com qualquer disposição aqui presente, você não deverá utilizar a Plataforma.
            </p>
            <p className="mt-4">
              Estes Termos constituem um contrato legalmente vinculante entre o Usuário e a Empresa. O uso contínuo da Plataforma após qualquer atualização destes Termos implica na aceitação das novas condições.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">2. Descrição do Serviço</h2>
            <p className="mb-4">
              A Plataforma oferece ao Usuário acesso a uma variedade de conteúdos e serviços educacionais, incluindo, mas não se limitando a: Formações e Cursos (trilhas de aprendizado estruturadas com videoaulas, materiais de apoio e avaliações), Comunidade (fóruns de discussão, grupos de estudo e canais de networking), Mentorias (sessões de orientação individuais ou em grupo com especialistas), Soluções e Ferramentas (recursos práticos, templates e softwares), e Eventos (webinars, workshops e eventos exclusivos online).
            </p>
            <p className="mb-4">
              Os serviços são disponibilizados em diferentes modalidades de planos de assinatura, cujos detalhes, preços e características estão descritos na seção "Planos" da Plataforma.
            </p>
            <p className="mb-4 font-medium text-foreground">
              2.1. Gravação de Sessões ao Vivo
            </p>
            <p className="mb-4">
              O Usuário declara estar ciente e concorda que as sessões de mentoria ao vivo, aulas interativas, webinars e demais interações realizadas na Plataforma <strong>poderão ser gravadas em áudio e vídeo</strong> pela Empresa. As gravações serão disponibilizadas exclusivamente dentro da Plataforma MAP Acelera para acesso dos membros ativos, podendo ser utilizadas de forma integral ou parcial (incluindo trechos editados) para fins educacionais. Ao participar de qualquer sessão ao vivo, o Usuário autoriza, a título gratuito, o uso de sua imagem e voz nos termos aqui descritos, sem prejuízo do consentimento específico solicitado no momento do check-in da sessão, conforme previsto no Termo de Autorização de Uso de Imagem e Voz.
            </p>
            <p className="mb-4 font-medium text-foreground">
              2.2. Irretratabilidade Relativa e Preservação do Conteúdo
            </p>
            <p>
              O Usuário reconhece que, uma vez publicado o conteúdo gravado dentro da plataforma MAP Acelera, a revogação da autorização de uso de imagem e voz <strong>não implica na obrigação de remoção retroativa</strong> das gravações já disponibilizadas, tendo em vista a impossibilidade técnica e operacional de edição de conteúdo já publicado e o direito de acesso dos demais membros. A revogação produzirá efeitos apenas para gravações futuras, a partir da data de comunicação formal ao e-mail sucesso@mapeducacao.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">3. Cadastro, Conta e Segurança</h2>
            <p className="mb-4">
              Para acessar os recursos da Plataforma, o Usuário deverá criar uma conta pessoal e intransferível, fornecendo informações verdadeiras, precisas e atualizadas. A criação de conta por menores de 18 anos só é permitida com a autorização e supervisão dos pais ou responsáveis legais.
            </p>
            <p>
              O Usuário é o único responsável pela confidencialidade de sua senha e por todas as atividades que ocorrerem em sua conta. A Empresa não se responsabiliza por qualquer dano resultante do uso não autorizado da conta do Usuário. O Usuário concorda em notificar a Empresa imediatamente sobre qualquer suspeita de uso indevido de sua conta através do e-mail: sucesso@mapeducacao.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">4. Regras de Uso e Conduta (Uso Aceitável)</h2>
            <p className="mb-2">O Usuário concorda em utilizar a Plataforma de forma ética, legal e em conformidade com estes Termos. É estritamente proibido:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Publicar conteúdo difamatório, obsceno, racista ou de ódio;</li>
              <li>Copiar, distribuir ou vender conteúdo da Plataforma sem autorização;</li>
              <li>Tentar obter acesso não autorizado a sistemas ou dados da Plataforma;</li>
              <li>Utilizar a Plataforma para enviar spam ou promover produtos de terceiros sem permissão;</li>
              <li>Criar contas falsas ou se passar por outra pessoa.</li>
            </ul>
            <p>
              A violação destas regras poderá resultar na suspensão ou encerramento imediato da conta do Usuário, sem prejuízo das medidas legais cabíveis.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">5. Propriedade Intelectual</h2>
            <p className="mb-4">
              Todo o conteúdo disponibilizado na Plataforma, incluindo textos, vídeos, imagens, logotipos, marcas, software e design, é de propriedade exclusiva da Empresa ou de seus parceiros e licenciantes, protegido pelas leis de direitos autorais e propriedade intelectual.
            </p>
            <p className="mb-4">
              Ao adquirir um plano, o Usuário recebe uma licença limitada, não exclusiva e intransferível para acessar e usar o conteúdo da Plataforma para fins pessoais e não comerciais. É vedada a reprodução, download não autorizado, distribuição ou criação de obras derivadas sem a permissão explícita da Empresa.
            </p>
            <p>
              O conteúdo gerado pelo Usuário nos fóruns e comunidades concede à Empresa uma licença mundial, não exclusiva, isenta de royalties, para usar, reproduzir, modificar e exibir tal conteúdo no contexto da Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">6. Pagamentos, Assinaturas e Reembolsos</h2>
            <p className="mb-4">
              O acesso a determinados conteúdos está condicionado à contratação de um plano de assinatura pago. As assinaturas são renovadas automaticamente ao final de cada ciclo, a menos que o Usuário cancele antes da data de cobrança.
            </p>
            <p className="mb-4">
              Conforme o Código de Defesa do Consumidor (CDC), o Usuário tem o direito de solicitar o reembolso integral no prazo de 7 (sete) dias corridos a contar da data da compra. Após este período, não haverá reembolso dos valores já pagos, e o acesso será mantido até o final do ciclo vigente.
            </p>
            <p className="mb-4 font-medium text-foreground">
              6.1. Pagamento Recorrente (Parcelamento no Cartão de Crédito)
            </p>
            <p className="mb-4">
              O Usuário declara estar ciente e concorda que, ao optar pela modalidade de pagamento recorrente via cartão de crédito, estará contratando o <strong>parcelamento do valor total do plano escolhido</strong>, e não uma mensalidade avulsa passível de cancelamento livre a qualquer momento. As cobranças recorrentes representam parcelas de um compromisso financeiro previamente assumido pelo Usuário no ato da contratação.
            </p>
            <p className="mb-4">
              O cancelamento da assinatura, a desistência do uso ou a não utilização da Plataforma <strong>não isentam o Usuário do pagamento das parcelas restantes</strong> do valor total contratado, uma vez que a obrigação de pagamento decorre do contrato firmado e não está condicionada ao uso efetivo dos serviços.
            </p>
            <p className="mb-4">
              A inadimplência de qualquer parcela acarretará o <strong>vencimento antecipado de todas as parcelas restantes</strong>, tornando-se exigível de imediato a totalidade do saldo devedor, acrescido dos encargos previstos nesta cláusula.
            </p>
            <p className="mb-2">
              Em caso de inadimplência, a Empresa poderá adotar as seguintes medidas, sem prejuízo de outras cabíveis na legislação vigente:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Realizar cobranças por meios administrativos e extrajudiciais;</li>
              <li>Aplicar multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pelo índice IPCA/IBGE, ou outro que venha a substituí-lo;</li>
              <li>Encaminhar a dívida para empresas especializadas em cobrança;</li>
              <li>Registrar o débito em órgãos de proteção ao crédito, tais como SERASA e SPC, nos termos da legislação aplicável.</li>
            </ul>
            <p className="mb-4">
              <strong>Autorização expressa para negativação:</strong> Ao aceitar estes Termos, o Usuário autoriza expressamente a Empresa a registrar seu nome e CPF nos cadastros de inadimplentes mantidos por órgãos de proteção ao crédito (SERASA, SPC e similares) em caso de débitos vencidos e não pagos, nos termos do artigo 43 do Código de Defesa do Consumidor e da Lei nº 12.414/2011.
            </p>
            <p className="mb-4">
              Antes de proceder à negativação, a Empresa realizará ao menos <strong>uma tentativa de contato prévio</strong> com o Usuário, por meio de e-mail ou outro canal de comunicação cadastrado, concedendo prazo razoável de no mínimo 5 (cinco) dias úteis para regularização do débito. A ausência de resposta ou de pagamento dentro do prazo concedido autorizará a Empresa a efetuar o registro nos órgãos competentes.
            </p>
            <p>
              O acesso à Plataforma poderá ser <strong>suspenso imediatamente</strong> em caso de inadimplência, sendo restabelecido somente após a regularização integral dos valores pendentes. A suspensão do acesso não exime o Usuário da obrigação de quitação das parcelas em aberto.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">7. Privacidade e Proteção de Dados (LGPD)</h2>
            <p className="mb-4">
              A proteção dos seus dados pessoais é nossa prioridade. Coletamos e tratamos seus dados em total conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Você tem o direito de acessar, corrigir, excluir e portar seus dados pessoais a qualquer momento. Para exercer esses direitos, entre em contato pelo e-mail: sucesso@mapeducacao.com.
            </p>
            <p>
              Nossa Política de Privacidade completa, que é parte integrante destes Termos, detalha como coletamos, usamos, armazenamos e protegemos suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">8. Limitação de Responsabilidade</h2>
            <p className="mb-4">
              A Empresa se esforça para manter a Plataforma sempre disponível e funcional. No entanto, não garante que o serviço será ininterrupto ou livre de erros. A Plataforma é fornecida "no estado em que se encontra", sem garantias de qualquer tipo.
            </p>
            <p>
              Em nenhuma circunstância a Empresa, seus diretores ou colaboradores serão responsáveis por quaisquer danos diretos ou indiretos, lucros cessantes, perda de dados ou outras perdas intangíveis resultantes do uso ou da incapacidade de usar a Plataforma. O conteúdo educacional tem o objetivo de informar e capacitar, mas a Empresa não garante resultados específicos ou sucesso profissional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">9. Não Aliciamento de Colaboradores</h2>
            <p className="mb-4">
              O Usuário compromete-se a <strong>não contratar, direta ou indiretamente</strong>, os funcionários e colaboradores da Empresa, pelo prazo de até <strong>1 (um) ano</strong> após a extinção do vínculo contratual firmado por meio destes Termos, seja qual for a sua modalidade ou motivo de encerramento.
            </p>
            <p className="mb-4">
              A vedação abrange a contratação sob qualquer forma ou regime (empregatício, autônomo, prestação de serviços, sociedade ou consultoria), bem como o aliciamento realizado por intermédio de terceiros ou empresas relacionadas ao Usuário.
            </p>
            <p>
              O descumprimento desta cláusula sujeitará o Usuário ao pagamento de <strong>multa equivalente a 15 (quinze) vezes o valor do último salário bruto</strong> do funcionário ou colaborador contratado em violação a esta disposição, sem prejuízo da apuração de perdas e danos adicionais.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">10. Modificações dos Termos</h2>
            <p>
              A Empresa reserva-se o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação da nova versão na Plataforma. Notificaremos os Usuários sobre alterações significativas através de e-mail ou aviso destacado na Plataforma. O uso contínuo após as alterações constituirá aceitação tácita dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">11. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer controvérsias decorrentes destes Termos, fica eleito o foro da Comarca de Nova Friburgo/RJ, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">12. Contato</h2>
            <p>
              Em caso de dúvidas, sugestões ou problemas relacionados a estes Termos de Uso, entre em contato conosco: <strong>E-mail:</strong> sucesso@mapeducacao.com | <strong>Horário de atendimento:</strong> Segunda a Sexta, das 8h às 18h (horário de Brasília).
            </p>
          </section>

          <div className="text-sm text-muted-foreground pt-8 border-t border-border/50 text-center">
            Versão {CURRENT_TERMS_VERSION} | Última atualização: 22 de julho de 2026
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <Checkbox
              id="terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-1 border-lime data-[state=checked]:bg-lime data-[state=checked]:text-black"
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium cursor-pointer leading-relaxed"
            >
              Declaro que li, compreendi e concordo integralmente com os Termos de Uso e Condições Gerais e com a Política de Privacidade do MAP Acelera.
            </label>
          </div>
          
          <Button
            onClick={handleContinue}
            disabled={!accepted || acceptTerms.isPending}
            className="w-full bg-lime text-black hover:bg-lime/90 disabled:opacity-50 h-12 text-base font-semibold"
          >
            {acceptTerms.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Registrando aceite...
              </>
            ) : (
              "Aceitar e Continuar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}