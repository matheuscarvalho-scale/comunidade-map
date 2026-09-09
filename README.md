# Plataforma Comunidade MAP

Crie uma plataforma de membros completa para a Comunidade MAP (e-commerce education) com as seguintes especificações:

**IDENTIDADE VISUAL (Dark Mode Premium):**
- Fundo principal: preto (#000000)
- Cards e elementos: cinza escuro (#0A0A0A)
- Cor de destaque/primária: verde lima (#BFFF00)
- Tipografia: Inter ou sans-serif moderna
- Cards arredondados (12-16px border-radius)
- Botões pill-shaped (rounded-full)
- Transições suaves e hover states com feedback visual
- Scrollbar customizada para dark theme

**ESTRUTURA DE NAVEGAÇÃO:**
1. Sidebar fixa à esquerda com:
   - Logo "map" em verde lima
   - Badge de dias consecutivos (gamificação)
   - Menu hierárquico: INÍCIO (Dashboard), APRENDIZADO (Formações, Mentorias, Comunidade), FERRAMENTAS (Recursos, Networking, Conquistas)
   - Perfil do usuário no rodapé da sidebar

**PÁGINAS NECESSÁRIAS:**

1. **Dashboard** (/):
   - Saudação personalizada "Bom dia, [Nome]! 👋"
   - 3 cards de métricas: Formações Concluídas, Mentorias Participadas, Dias Consecutivos
   - Card de próxima mentoria com contador regressivo e botão de check-in
   - Card de atualizações da plataforma
   - Card "Continue Aprendendo" com progresso do curso atual
   - Feed da comunidade (últimos posts)
   - Conquistas recentes

2. **Formações** (/formacoes):
   - Campo de busca
   - Filtros por categoria e nível (Iniciante, Intermediário, Avançado)
   - Grid de cards de cursos com: thumbnail, título, descrição, categoria, nível, número de aulas, alunos, duração
   - Seção "Em Andamento" para cursos iniciados
   - Barra de progresso nos cards

3. **Comunidade** (/comunidade):
   - Campo de busca
   - Botão "Criar Tópico" (abre modal)
   - Tabs de filtro: Recentes, Populares, Sem Respostas
   - Sidebar com categorias: Geral, Suporte, Implementação, Feedback
   - Lista de posts com: avatar, autor, título, preview, categoria (badge colorido), replies, views, tempo

4. **Mentorias** (/mentorias):
   - Calendário mensal interativo mostrando dias com sessões
   - Tabs: Mentorias em Grupo, Mentorias Individuais, Meus Check-ins
   - Cards de sessões com: mentor (avatar, nome), título, data/hora, duração, vagas, botão check-in
   - Seção de mentores com: foto, bio, especialidades (badges), rating com estrelas

5. **Conquistas** (/conquistas):
   - Stats overview: Pontos Totais, Badges Conquistados, Dias Consecutivos
   - Seção "Conquistas Recentes"
   - Seção "Próximas Conquistas" com progresso
   - Grid de badges organizados por categoria (Acesso, Aprendizado, Comunidade, Mentorias)
   - Badges bloqueados aparecem com opacidade reduzida e ícone de cadeado

**COMPONENTES UI:**
- Use shadcn/ui components
- Progress bars para progresso de cursos
- Avatars com fallback de iniciais
- Badges coloridos por categoria
- Cards com hover effect (glow verde sutil)
- Toasts para feedback de ações

**DADOS MOCK:**
- Crie dados mockados realistas para todas as seções
- Usuário logado: nome "João Silva", 7 dias consecutivos, 3 cursos concluídos

Integração com Supabase será feita posteriormente. Por agora, use dados mock.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://comunidade-map.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cd7f60f0-0600-458c-b00e-7574a0b763cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
