
-- Nota: as funções get_engagement_stats e get_inactive_members atualmente NÃO filtram secondary_logins,
-- mas vamos garantir explicitamente que NÃO há filtro adicionado, mantendo apenas a exclusão de roles internas e IDs internos manuais.
-- Esta migration é um no-op de segurança que documenta a regra: secundárias são contadas no Analytics.
SELECT 1;
