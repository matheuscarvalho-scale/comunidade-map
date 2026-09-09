# Aba "Gravadas" na página de Webinars

Hoje a aba "Gravadas" da página de Mentorias mostra as gravações das duas trilhas de conteúdo ("Mentorias" e "Webinars"). Por isso o webinar que você cadastrou na trilha de conteúdo apareceu dentro de Mentorias.

## O que muda

1. **Página de Mentorias**: a aba "Gravadas" passa a listar apenas as gravações da trilha "Mentorias" (o selo "Webinar" deixa de aparecer ali).
2. **Página de Webinars**: ganha uma terceira aba "Gravadas" (ao lado de "Próximos" e "Meus Check-ins"), com contador, listando as gravações da trilha "Webinars".
3. Os cards da nova aba seguem o mesmo layout já usado nas gravadas de mentorias: foto do palestrante à esquerda, selo "Webinar", título sem a data no final, nome do palestrante, data e duração, botão "Assistir" (player Cloudflare no topo da página) e botões de material quando houver.
4. Quando não houver gravações: estado vazio "Nenhum webinar gravado".

## Detalhes técnicos

- Extrair o card de gravação e a busca de `content_items` (+ `content_item_materials`) para um componente/hook compartilhado, parametrizado pelo slug da trilha, para as duas páginas usarem sem duplicar código.
- Em Mentorias, filtrar a query para `slug = "mentorias"`; em Webinars, para `slug = "webinars"`.
- Em Webinars, reaproveitar o `CloudflareStreamPlayer` com o mesmo padrão de estado de reprodução/fullscreen usado em Mentorias.
- Nenhuma mudança de banco de dados ou de permissões.
