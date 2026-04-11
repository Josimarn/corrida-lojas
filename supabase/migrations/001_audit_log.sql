-- ============================================================
-- SPRINT 1: AUDITORIA
-- ============================================================

-- Tabela de log de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  tabela       TEXT NOT NULL,
  operacao     TEXT NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  usuario_id   UUID,
  registro_id  UUID,
  dados_antes  JSONB,
  dados_depois JSONB,
  criado_em    TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')
);

-- Índice para consultas por tabela/data
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela    ON audit_log(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_criado_em ON audit_log(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario   ON audit_log(usuario_id);

-- Habilita RLS; o trigger usa SECURITY DEFINER e bypassa a política de INSERT
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Somente super_admin pode ler; triggers inserem via SECURITY DEFINER
CREATE POLICY "audit_log_read_super_admin" ON audit_log
FOR SELECT USING (
  (SELECT perfil FROM usuarios WHERE id = auth.uid()) = 'super_admin'
);

-- ── Função genérica de auditoria ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (tabela, operacao, usuario_id, registro_id, dados_antes, dados_depois)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ── Triggers nas tabelas críticas ────────────────────────────

-- Lançamentos
DROP TRIGGER IF EXISTS tg_audit_lancamentos ON lancamentos;
CREATE TRIGGER tg_audit_lancamentos
AFTER INSERT OR UPDATE OR DELETE ON lancamentos
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- Metas por vendedor
DROP TRIGGER IF EXISTS tg_audit_metas_vendedor ON metas_vendedor;
CREATE TRIGGER tg_audit_metas_vendedor
AFTER INSERT OR UPDATE OR DELETE ON metas_vendedor
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- Metas por loja
DROP TRIGGER IF EXISTS tg_audit_metas_loja ON metas_loja;
CREATE TRIGGER tg_audit_metas_loja
AFTER INSERT OR UPDATE OR DELETE ON metas_loja
FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
