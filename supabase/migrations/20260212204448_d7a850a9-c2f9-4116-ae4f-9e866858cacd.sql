
-- Adicionar as novas roles ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'mapa_de_map';
