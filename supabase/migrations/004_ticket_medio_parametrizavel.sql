-- ============================================================
-- SPRINT: TICKET MÉDIO PARAMETRIZÁVEL
-- ============================================================

-- 1. Parametrização por empresa
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS calcular_ticket_auto BOOLEAN NOT NULL DEFAULT true;

-- 2. Campo ticket_medio no lançamento diário
--    NULL = calcular automaticamente (vendas / atendimentos)
--    Valor preenchido = usar o valor informado manualmente
ALTER TABLE lancamentos
  ADD COLUMN IF NOT EXISTS ticket_medio NUMERIC(10,2) DEFAULT NULL;

-- 3. Trigger de auditoria na tabela empresas
--    Monitora alterações em configurações sensíveis
DROP TRIGGER IF EXISTS tg_audit_empresas ON empresas;
CREATE TRIGGER tg_audit_empresas
AFTER INSERT OR UPDATE OR DELETE ON empresas
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- 4. Índice para facilitar consulta de logs por empresa
CREATE INDEX IF NOT EXISTS idx_audit_log_registro ON audit_log(registro_id);
