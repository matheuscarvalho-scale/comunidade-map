# Regularizar CNPJ dos membros antigos + limpar Dashboard

## 1. Pedir o CNPJ de quem já concluiu o onboarding

Hoje 98 dos 102 membros que já concluíram o onboarding estão sem CNPJ preenchido.

- Novo modal "Regularize seu CNPJ" que aparece automaticamente para membro logado que já concluiu o onboarding e está sem CNPJ.
- Conteúdo: título curto, explicação de que o CNPJ passou a ser obrigatório no cadastro, campo único com máscara `00.000.000/0000-00`, validação de 14 dígitos e botão "Salvar".
- Salvando, o CNPJ vai para o mesmo campo do onboarding (`user_onboarding.cnpj`) e o modal não aparece mais.
- Botão secundário "Preencher depois" fecha o modal na sessão atual; volta a aparecer no próximo acesso até ser preenchido (assim ninguém fica travado, mas todos são cobrados).
- Contas secundárias (logins de equipe) não recebem o pedido — o CNPJ é da empresa titular.

## 2. Remover o card "Feed da Comunidade" do Dashboard

- Remover o card do feed (input de post + lista de posts + likes/comentários) do Dashboard, já que o módulo Comunidade foi descontinuado.
- Limpar os imports/estado que ficam sem uso (posts, criar post, curtir) e o layout passa a mostrar mentoria, formações e conquistas.

## Detalhes técnicos

- `src/hooks/useCnpjRegularization.ts`: query em `user_onboarding` (`cnpj`, `completed_at`) + mutation de update por `user_id`; usa `useIsSecondaryAccount` para excluir contas secundárias.
- `src/components/CnpjRegularizationModal.tsx`: reaproveita a máscara/validação já usada em `StepBusinessProfile.tsx`.
- Montado em `src/components/layout/MainLayout.tsx`, ao lado do `MentoriasMigrationNoticeModal`, para valer em toda a área logada.
- `src/pages/Dashboard.tsx`: remover o bloco do feed (linhas ~197-283) e os hooks/imports relacionados (`usePosts`, `Input`, `Send`, `Heart`, `MessageCircle`, `newComment`, `handleNewPost`, `handleLike`).
- Sem mudança de schema: a coluna `cnpj` já existe em `user_onboarding` com RLS de dono.
