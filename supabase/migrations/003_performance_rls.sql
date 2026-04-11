-- ============================================================
-- SPRINT 3: PERFORMANCE RLS
-- ============================================================

-- ── Índices para fn_minhas_lojas() ───────────────────────────
-- Cada SELECT da função faz lookup por usuario_id
CREATE INDEX IF NOT EXISTS idx_loja_gerentes_usuario    ON loja_gerentes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_loja_supervisores_usuario ON loja_supervisores(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendedores_usuario        ON vendedores(usuario_id);

-- Índices nas tabelas com RLS que filtram por loja_id
CREATE INDEX IF NOT EXISTS idx_lancamentos_loja       ON lancamentos(loja_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_vendedor   ON lancamentos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data       ON lancamentos(data DESC);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_loja    ON metas_vendedor(loja_id);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_vid     ON metas_vendedor(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_metas_loja_loja        ON metas_loja(loja_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa       ON usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lojas_empresa          ON lojas(empresa_id);

-- ── Otimizar fn_minhas_lojas ─────────────────────────────────
-- SECURITY DEFINER: executa como owner, evita recursão de RLS
-- SET search_path = public: evita search_path injection
CREATE OR REPLACE FUNCTION fn_minhas_lojas()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT loja_id FROM loja_gerentes    WHERE usuario_id = auth.uid()
  UNION
  SELECT loja_id FROM loja_supervisores WHERE usuario_id = auth.uid()
  UNION
  SELECT loja_id FROM vendedores        WHERE usuario_id = auth.uid();
$$;

-- ── Otimizar fn_meu_perfil ───────────────────────────────────
-- DROP antes: CREATE OR REPLACE não aceita mudança de tipo de retorno (ENUM → TEXT)
DROP FUNCTION IF EXISTS fn_meu_perfil();
CREATE FUNCTION fn_meu_perfil()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil::text FROM usuarios WHERE id = auth.uid();
$$;

-- ── Política para vendedor ler a si mesmo (sem recursão) ─────
-- (Se já existir, apenas garante)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendedores' AND policyname = 'vendedores_read_own'
  ) THEN
    EXECUTE 'CREATE POLICY "vendedores_read_own" ON vendedores
             FOR SELECT USING (usuario_id = auth.uid())';
  END IF;
END;
$$;

-- ── Policy de usuários: cada um lê o próprio registro ────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usuarios' AND policyname = 'usuarios_read_own'
  ) THEN
    EXECUTE 'CREATE POLICY "usuarios_read_own" ON usuarios
             FOR SELECT USING (id = auth.uid())';
  END IF;
END;
$$;

-- ── Função auxiliar: retorna empresa_id do usuário logado ────
-- SECURITY DEFINER evita recursão quando usada em policy de usuarios
CREATE OR REPLACE FUNCTION fn_minha_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM usuarios WHERE id = auth.uid();
$$;

-- ── Policy: usuários da mesma empresa ────────────────────────
-- Usa fn_minha_empresa_id() para evitar recursão na tabela usuarios
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'usuarios' AND policyname = 'usuarios_read_empresa'
  ) THEN
    EXECUTE 'CREATE POLICY "usuarios_read_empresa" ON usuarios
             FOR SELECT USING (empresa_id = fn_minha_empresa_id())';
  END IF;
END;
$$;
