import { SEOHead } from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { CURRENT_TERMS_VERSION } from "@/hooks/useOnboarding";

export default function Termos() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Termos de Uso | MAP Acelera"
        description="Termos e Condições de Uso da MAP Acelera (MAP EDUCACAO LTDA)."
      />

      <header className="border-b border-border/50">
        <div className="container mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Voltar para o início
          </Link>
          <span className="text-xs text-muted-foreground">MAP Acelera</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        <article className="prose prose-invert max-w-none prose-headings:font-semibold prose-h1:text-3xl md:prose-h1:text-4xl prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-primary">
          <h1>Termos e Condições de Uso — MAP Acelera</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Versão {CURRENT_TERMS_VERSION}</strong> | Última atualização: 22 de julho de 2026
          </p>

          <p>
            Bem-vindo à <strong>Plataforma MAP Acelera</strong> ("Plataforma"), um ambiente digital
            de aprendizado e colaboração operado pela <strong>Map Educação LTDA</strong> ("Empresa").
          </p>
          <p>
            Ao se cadastrar, acessar ou utilizar a Plataforma, você ("Usuário") declara ter lido,
            compreendido e concordado integralmente com estes <strong>Termos e Condições de Uso</strong>{" "}
            ("Termos") e com nossa <strong>Política de Privacidade</strong>. Caso não concorde com qualquer
            disposição aqui presente, você não deverá utilizar a Plataforma.
          </p>
          <p>
            Estes Termos constituem um contrato legalmente vinculante entre o Usuário e a Empresa. O uso
            contínuo da Plataforma após qualquer atualização destes Termos implica na aceitação das novas
            condições.
          </p>

          <h2>1. Descrição do Serviço</h2>
          <p>
            A Plataforma oferece ao Usuário acesso a uma variedade de conteúdos e serviços educacionais,
            incluindo, mas não se limitando a: <strong>Formações e Cursos</strong> (trilhas de aprendizado
            estruturadas com videoaulas, materiais de apoio e avaliações), <strong>Comunidade</strong>{" "}
            (fóruns de discussão, grupos de estudo e canais de networking), <strong>Mentorias</strong>{" "}
            (sessões de orientação individuais ou em grupo com especialistas), <strong>Soluções e Ferramentas</strong>{" "}
            (recursos práticos, templates e softwares) e <strong>Eventos</strong> (webinars, workshops e
            eventos exclusivos online).
          </p>
          <p>
            Os serviços são disponibilizados em diferentes modalidades de planos de assinatura, cujos
            detalhes, preços e características estão descritos na seção "Planos" da Plataforma.
          </p>
          <p>
            <strong>1.1. Gravação de Sessões ao Vivo</strong> — O Usuário declara estar ciente e concorda
            que as sessões de mentoria ao vivo, aulas interativas, webinars e demais interações realizadas na
            Plataforma <strong>poderão ser gravadas em áudio e vídeo</strong> pela Empresa. As gravações serão
            disponibilizadas exclusivamente dentro da Plataforma MAP Acelera para acesso dos membros ativos,
            podendo ser utilizadas de forma integral ou parcial (incluindo trechos editados) para fins
            educacionais. Ao participar de qualquer sessão ao vivo, o Usuário autoriza, a título gratuito, o
            uso de sua imagem e voz nos termos aqui descritos, sem prejuízo do consentimento específico
            solicitado no momento do check-in da sessão, conforme previsto no Termo de Autorização de Uso de
            Imagem e Voz.
          </p>
          <p>
            <strong>1.2. Irretratabilidade Relativa e Preservação do Conteúdo</strong> — O Usuário reconhece
            que, uma vez publicado o conteúdo gravado dentro da plataforma MAP Acelera, a revogação da
            autorização de uso de imagem e voz <strong>não implica na obrigação de remoção retroativa</strong>{" "}
            das gravações já disponibilizadas, tendo em vista a impossibilidade técnica e operacional de edição
            de conteúdo já publicado e o direito de acesso dos demais membros. A revogação produzirá efeitos
            apenas para gravações futuras, a partir da data de comunicação formal ao e-mail{" "}
            <a href="mailto:sucesso@mapeducacao.com">sucesso@mapeducacao.com</a>.
          </p>

          <h2>2. Cadastro, Conta e Segurança</h2>
          <p>
            Para acessar os recursos da Plataforma, o Usuário deverá criar uma conta pessoal e intransferível,
            fornecendo informações verdadeiras, precisas e atualizadas. A criação de conta por menores de 18 anos
            só é permitida com a autorização e supervisão dos pais ou responsáveis legais.
          </p>
          <p>
            O Usuário é o único responsável pela confidencialidade de sua senha e por todas as atividades que
            ocorrerem em sua conta. A Empresa não se responsabiliza por qualquer dano resultante do uso não
            autorizado da conta do Usuário. O Usuário concorda em notificar a Empresa imediatamente sobre
            qualquer suspeita de uso indevido de sua conta através do e-mail:{" "}
            <a href="mailto:sucesso@mapeducacao.com">sucesso@mapeducacao.com</a>.
          </p>

          <h2>3. Regras de Uso e Conduta (Uso Aceitável)</h2>
          <p>O Usuário concorda em utilizar a Plataforma de forma ética, legal e em conformidade com estes Termos. É estritamente proibido:</p>
          <ul>
            <li>Publicar conteúdo difamatório, obsceno, racista ou de ódio;</li>
            <li>Copiar, distribuir ou vender conteúdo da Plataforma sem autorização;</li>
            <li>Tentar obter acesso não autorizado a sistemas ou dados da Plataforma;</li>
            <li>Utilizar a Plataforma para enviar spam ou promover produtos de terceiros sem permissão;</li>
            <li>Criar contas falsas ou se passar por outra pessoa.</li>
          </ul>
          <p>
            A violação destas regras poderá resultar na suspensão ou encerramento imediato da conta do
            Usuário, sem prejuízo das medidas legais cabíveis.
          </p>

          <h2>4. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo disponibilizado na Plataforma, incluindo textos, vídeos, imagens, logotipos,
            marcas, software e design, é de propriedade exclusiva da Empresa ou de seus parceiros e
            licenciantes, protegido pelas leis de direitos autorais e propriedade intelectual.
          </p>
          <p>
            Ao adquirir um plano, o Usuário recebe uma licença limitada, não exclusiva e intransferível para
            acessar e usar o conteúdo da Plataforma para fins pessoais e não comerciais. É vedada a
            reprodução, download não autorizado, distribuição ou criação de obras derivadas sem a permissão
            explícita da Empresa.
          </p>
          <p>
            O conteúdo gerado pelo Usuário nos fóruns e comunidades concede à Empresa uma licença mundial,
            não exclusiva, isenta de royalties, para usar, reproduzir, modificar e exibir tal conteúdo no
            contexto da Plataforma.
          </p>

          <h2>5. Pagamentos, Assinaturas e Reembolsos</h2>
          <p>
            O acesso a determinados conteúdos está condicionado à contratação de um plano de assinatura pago.
            As assinaturas são renovadas automaticamente ao final de cada ciclo, a menos que o Usuário
            cancele antes da data de cobrança.
          </p>
          <p>
            Conforme o Código de Defesa do Consumidor (CDC), o Usuário tem o direito de solicitar o reembolso
            integral no prazo de 7 (sete) dias corridos a contar da data da compra. Após este período, não
            haverá reembolso dos valores já pagos, e o acesso será mantido até o final do ciclo vigente.
          </p>
          <p>
            <strong>5.1. Pagamento Recorrente (Parcelamento no Cartão de Crédito)</strong> — O Usuário declara
            estar ciente e concorda que, ao optar pela modalidade de pagamento recorrente via cartão de
            crédito, estará contratando o <strong>parcelamento do valor total do plano escolhido</strong>, e não
            uma mensalidade avulsa passível de cancelamento livre a qualquer momento. As cobranças recorrentes
            representam parcelas de um compromisso financeiro previamente assumido pelo Usuário no ato da
            contratação.
          </p>
          <p>
            O cancelamento da assinatura, a desistência do uso ou a não utilização da Plataforma{" "}
            <strong>não isentam o Usuário do pagamento das parcelas restantes</strong> do valor total
            contratado, uma vez que a obrigação de pagamento decorre do contrato firmado e não está
            condicionada ao uso efetivo dos serviços.
          </p>
          <p>
            A inadimplência de qualquer parcela acarretará o <strong>vencimento antecipado de todas as
            parcelas restantes</strong>, tornando-se exigível de imediato a totalidade do saldo devedor,
            acrescido dos encargos previstos nesta cláusula.
          </p>
          <p>Em caso de inadimplência, a Empresa poderá adotar as seguintes medidas, sem prejuízo de outras cabíveis na legislação vigente:</p>
          <ul>
            <li>Realizar cobranças por meios administrativos e extrajudiciais;</li>
            <li>Aplicar multa moratória de 2% (dois por cento) sobre o valor em atraso, acrescida de juros de mora de 1% (um por cento) ao mês e correção monetária pelo índice IPCA/IBGE, ou outro que venha a substituí-lo;</li>
            <li>Encaminhar a dívida para empresas especializadas em cobrança;</li>
            <li>Registrar o débito em órgãos de proteção ao crédito, tais como SERASA e SPC, nos termos da legislação aplicável.</li>
          </ul>
          <p>
            <strong>Autorização expressa para negativação:</strong> Ao aceitar estes Termos, o Usuário autoriza
            expressamente a Empresa a registrar seu nome e CPF nos cadastros de inadimplentes mantidos por
            órgãos de proteção ao crédito (SERASA, SPC e similares) em caso de débitos vencidos e não pagos,
            nos termos do artigo 43 do Código de Defesa do Consumidor e da Lei nº 12.414/2011.
          </p>
          <p>
            Antes de proceder à negativação, a Empresa realizará ao menos <strong>uma tentativa de contato
            prévio</strong> com o Usuário, por meio de e-mail ou outro canal de comunicação cadastrado,
            concedendo prazo razoável de no mínimo 5 (cinco) dias úteis para regularização do débito. A
            ausência de resposta ou de pagamento dentro do prazo concedido autorizará a Empresa a efetuar o
            registro nos órgãos competentes.
          </p>
          <p>
            O acesso à Plataforma poderá ser <strong>suspenso imediatamente</strong> em caso de inadimplência,
            sendo restabelecido somente após a regularização integral dos valores pendentes. A suspensão do
            acesso não exime o Usuário da obrigação de quitação das parcelas em aberto.
          </p>

          <h2>6. Privacidade e Proteção de Dados (LGPD)</h2>
          <p>
            A proteção dos seus dados pessoais é nossa prioridade. Coletamos e tratamos seus dados em total
            conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). Você tem o direito
            de acessar, corrigir, excluir e portar seus dados pessoais a qualquer momento. Para exercer esses
            direitos, entre em contato pelo e-mail:{" "}
            <a href="mailto:sucesso@mapeducacao.com">sucesso@mapeducacao.com</a>.
          </p>
          <p>
            Nossa <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>{" "}
            completa, que é parte integrante destes Termos, detalha como coletamos, usamos, armazenamos e
            protegemos suas informações.
          </p>

          <h2>7. Limitação de Responsabilidade</h2>
          <p>
            A Empresa se esforça para manter a Plataforma sempre disponível e funcional. No entanto, não
            garante que o serviço será ininterrupto ou livre de erros. A Plataforma é fornecida "no estado em
            que se encontra", sem garantias de qualquer tipo.
          </p>
          <p>
            Em nenhuma circunstância a Empresa, seus diretores ou colaboradores serão responsáveis por quaisquer
            danos diretos ou indiretos, lucros cessantes, perda de dados ou outras perdas intangíveis
            resultantes do uso ou da incapacidade de usar a Plataforma. O conteúdo educacional tem o objetivo
            de informar e capacitar, mas a Empresa não garante resultados específicos ou sucesso profissional.
          </p>

          <h2>8. Não Aliciamento de Colaboradores</h2>
          <p>
            O Usuário compromete-se a <strong>não contratar, direta ou indiretamente</strong>, os
            funcionários e colaboradores da Empresa, pelo prazo de até <strong>1 (um) ano</strong> após a
            extinção do vínculo contratual firmado por meio destes Termos, seja qual for a sua modalidade ou
            motivo de encerramento.
          </p>
          <p>
            A vedação abrange a contratação sob qualquer forma ou regime (empregatício, autônomo, prestação de
            serviços, sociedade ou consultoria), bem como o aliciamento realizado por intermédio de terceiros
            ou empresas relacionadas ao Usuário.
          </p>
          <p>
            O descumprimento desta cláusula sujeitará o Usuário ao pagamento de <strong>multa equivalente a 15
            (quinze) vezes o valor do último salário bruto</strong> do funcionário ou colaborador contratado em
            violação a esta disposição, sem prejuízo da apuração de perdas e danos adicionais.
          </p>

          <h2>9. Modificações dos Termos</h2>
          <p>
            A Empresa reserva-se o direito de modificar estes Termos a qualquer momento. As alterações
            entrarão em vigor imediatamente após a publicação da nova versão na Plataforma. Notificaremos os
            Usuários sobre alterações significativas através de e-mail ou aviso destacado na Plataforma. O uso
            contínuo após as alterações constituirá aceitação tácita dos novos Termos.
          </p>

          <h2>10. Lei Aplicável e Foro</h2>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer
            controvérsias decorrentes destes Termos, fica eleito o foro da Comarca de Nova Friburgo/RJ, com
            renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </p>

          <h2>11. Contato</h2>
          <p>
            Em caso de dúvidas, sugestões ou problemas relacionados a estes Termos de Uso, entre em contato
            conosco:
            <br />
            <strong>E-mail:</strong>{" "}
            <a href="mailto:sucesso@mapeducacao.com">sucesso@mapeducacao.com</a>
            <br />
            <strong>Horário de atendimento:</strong> Segunda a Sexta, das 8h às 18h (horário de Brasília).
          </p>
        </article>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} MAP EDUCACAO LTDA. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
