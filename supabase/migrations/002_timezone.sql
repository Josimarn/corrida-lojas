-- ============================================================
-- SPRINT 2: TIMEZONE — America/Sao_Paulo
-- ============================================================

-- NOTA: No Supabase não é possível ALTER DATABASE (sem permissão).
-- Os TIMESTAMPTZ já são armazenados em UTC internamente — correto por design.
-- Use AT TIME ZONE 'America/Sao_Paulo' nas queries de exibição quando necessário.

-- Adiciona coluna identidade visual (se ainda não existir)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cor_primaria   TEXT DEFAULT '#FFBE00';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#CC8800';
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url       TEXT;

-- Garante que campos de data/hora registrem no fuso correto
-- lancamentos.created_at: já usa now() → pega o timezone do banco
-- Para exibição, os clientes devem ler com AT TIME ZONE 'America/Sao_Paulo'

-- View auxiliar para relatórios futuros (data já é DATE — sem conversão de fuso)
CREATE OR REPLACE VIEW vw_lancamentos_brt AS
SELECT
  l.*,
  (l.created_at AT TIME ZONE 'America/Sao_Paulo') AS criado_em_brt,
  l.data AS data_brt  -- DATE não tem fuso; já representa o dia correto
FROM lancamentos l;
