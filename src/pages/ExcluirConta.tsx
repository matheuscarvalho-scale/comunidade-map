import { SEOHead } from "@/components/SEOHead";
import { Link } from "react-router-dom";

export default function ExcluirConta() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Excluir conta | MAP Acelera"
        description="Como excluir sua conta MAP Acelera e os dados associados."
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
          <h1>Excluir minha conta</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Última atualização:</strong> 15 de junho de 2026
          </p>

          <p>
            Você pode excluir sua conta MAP Acelera a qualquer momento, sem
            custo. Esta página explica como fazer isso e o que é removido.
          </p>

          <h2>Como excluir pelo app</h2>
          <ol>
            <li>Entre na sua conta em <a href="/auth">acelera.mapeducacao.com</a>.</li>
            <li>Acesse <strong>Meu Perfil → Segurança</strong>.</li>
            <li>Role até a seção <strong>Excluir minha conta</strong> e clique no botão.</li>
            <li>Confirme a exclusão no diálogo. A ação é imediata e irreversível.</li>
          </ol>

          <h2>Como excluir por e-mail</h2>
          <p>
            Se preferir, envie um pedido de exclusão a partir do e-mail
            cadastrado na sua conta para{" "}
            <a href="mailto:automacao@mapeducacao.com">automacao@mapeducacao.com</a>{" "}
            com o assunto <em>"Excluir minha conta"</em>. Processaremos a
            solicitação em até 15 dias.
          </p>

          <h2>O que é apagado</h2>
          <ul>
            <li>Sua conta de acesso (login, e-mail e senha).</li>
            <li>Seu perfil público e privado (nome, avatar, bio, contatos).</li>
            <li>Seu progresso em formações, trilhas, aulas e mentorias.</li>
            <li>Suas conquistas, pontos e certificados.</li>
            <li>Suas mensagens privadas, posts e comentários na comunidade.</li>
            <li>Suas preferências, notificações e tokens de notificação push.</li>
            <li>Dados de onboarding e consentimentos de imagem.</li>
          </ul>

          <h2>O que pode ser retido</h2>
          <p>
            Por obrigação legal ou contábil, podemos manter, de forma
            segregada e pelo prazo exigido por lei, registros de pagamentos,
            faturas, recibos fiscais e logs de auditoria (LGPD, art. 16). Esses
            dados não são mais usados para qualquer finalidade comercial.
          </p>

          <h2>Prazo</h2>
          <p>
            Exclusão via app: <strong>imediata</strong>. Exclusão via e-mail:{" "}
            <strong>em até 15 dias</strong> após a solicitação.
          </p>

          <h2>Dúvidas</h2>
          <p>
            Em caso de dúvidas sobre privacidade ou proteção de dados, fale
            com nosso encarregado:{" "}
            <a href="mailto:automacao@mapeducacao.com">automacao@mapeducacao.com</a>.
          </p>
        </article>
      </main>
    </div>
  );
}
