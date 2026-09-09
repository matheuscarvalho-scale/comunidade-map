import { SEOHead } from "@/components/SEOHead";
import { Link } from "react-router-dom";

export default function Privacidade() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Política de Privacidade | MAP Acelera"
        description="Política de Privacidade da MAP Acelera (MAP EDUCACAO LTDA) em conformidade com a LGPD."
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
          <h1>Política de Privacidade — MAP Acelera</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Última atualização:</strong> 14 de junho de 2026
          </p>

          <p>
            Esta Política de Privacidade descreve como a <strong>MAP EDUCACAO LTDA</strong>,
            inscrita no CNPJ nº 66.362.370/0001-87, com sede na R. Vicente Sobrinho, 137,
            Apt 202 Fundos, Olaria, Nova Friburgo/RJ, CEP 28.623-400 ("MAP", "nós"), coleta,
            usa e protege os dados pessoais dos usuários do aplicativo e plataforma{" "}
            <strong>MAP Acelera</strong> ("Plataforma"), em conformidade com a Lei nº
            13.709/2018 (Lei Geral de Proteção de Dados — LGPD).
          </p>

          <h2>1. Dados que coletamos</h2>
          <ul>
            <li><strong>Dados de cadastro:</strong> nome e e-mail, fornecidos na criação da conta.</li>
            <li><strong>Dados de uso:</strong> progresso em trilhas e formações, presença em mentorias (check-ins), conquistas e interações na Plataforma.</li>
            <li><strong>Token de notificação (push):</strong> um identificador do seu dispositivo, usado exclusivamente para enviar notificações.</li>
            <li><strong>Dados de pagamento:</strong> quando você assina um plano, os dados são processados diretamente pelos provedores de pagamento. <strong>Não armazenamos dados completos de cartão de crédito.</strong></li>
            <li><strong>Dados de consentimento de imagem:</strong> quando aplicável, em sessões de mentoria.</li>
          </ul>

          <h2>2. Como usamos os dados</h2>
          <p>
            Utilizamos seus dados para: criar e gerenciar sua conta; fornecer o acesso aos
            conteúdos, mentorias e formações; enviar notificações sobre novos conteúdos,
            mentorias e avisos; processar pagamentos e assinaturas; melhorar a Plataforma;
            e cumprir obrigações legais.
          </p>

          <h2>3. Base legal (LGPD)</h2>
          <p>
            Tratamos dados com base na <strong>execução do contrato</strong> (prestação do
            serviço), no <strong>consentimento</strong> (ex.: notificações e uso de imagem)
            e no <strong>cumprimento de obrigações legais e regulatórias</strong>.
          </p>

          <h2>4. Compartilhamento com terceiros</h2>
          <p>
            Compartilhamos dados apenas com operadores necessários para o funcionamento da
            Plataforma, que tratam os dados em nosso nome:
          </p>
          <ul>
            <li><strong>Supabase</strong> — hospedagem de banco de dados e autenticação;</li>
            <li><strong>Google (Firebase Cloud Messaging)</strong> — envio de notificações push;</li>
            <li><strong>Google Analytics</strong> — métricas de uso;</li>
            <li><strong>Stripe, Asaas e Conta Azul</strong> — processamento de pagamentos;</li>
            <li><strong>Cloudflare</strong> — hospedagem e reprodução de vídeos.</li>
          </ul>
          <p>Não vendemos dados pessoais.</p>

          <h2>5. Notificações push</h2>
          <p>
            Coletamos um token do seu dispositivo para enviar notificações. Você pode{" "}
            <strong>desativar as notificações</strong> a qualquer momento nas configurações
            do seu aparelho, sem prejuízo do uso das demais funcionalidades.
          </p>

          <h2>6. Cookies e tecnologias de rastreamento</h2>
          <p>
            Usamos cookies e identificadores (inclusive via Google Analytics) para entender
            o uso e melhorar a experiência.
          </p>

          <h2>7. Armazenamento, segurança e transferência internacional</h2>
          <p>
            Adotamos medidas de segurança como <strong>criptografia em trânsito</strong> e
            controle de acesso. Alguns provedores (ex.: Supabase, Google, Cloudflare) podem
            armazenar dados em <strong>servidores fora do Brasil</strong>, com salvaguardas
            adequadas conforme a LGPD.
          </p>

          <h2>8. Retenção</h2>
          <p>
            Mantemos os dados enquanto sua conta estiver ativa ou pelo tempo necessário
            para cumprir as finalidades e obrigações legais. Após esse período, os dados
            são excluídos ou anonimizados.
          </p>

          <h2>9. Seus direitos</h2>
          <p>
            Conforme a LGPD, você pode solicitar: confirmação e acesso aos seus dados,
            correção, anonimização, portabilidade, eliminação e revogação de consentimento.
            Para exercer esses direitos, escreva para{" "}
            <a href="mailto:automacao@mapeducacao.com">automacao@mapeducacao.com</a>.
          </p>

          <h2>10. Público</h2>
          <p>
            A Plataforma é destinada a <strong>maiores de 18 anos</strong> e não é
            direcionada a menores de idade.
          </p>

          <h2>11. Alterações</h2>
          <p>
            Podemos atualizar esta Política periodicamente. A data da última atualização
            será sempre indicada no topo desta página.
          </p>

          <h2>12. Contato</h2>
          <p>
            Dúvidas ou solicitações sobre privacidade e proteção de dados:
            <br />
            <strong>MAP EDUCACAO LTDA</strong> —{" "}
            <a href="mailto:automacao@mapeducacao.com">automacao@mapeducacao.com</a>
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
