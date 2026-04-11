-- ============================================================
-- CORRIDA DAS LOJAS — SCHEMA SaaS PROFISSIONAL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM PERFIL
CREATE TYPE perfil_usuario AS ENUM ('dono', 'supervisor', 'gerente', 'vendedor');

-- ============================================================
-- 🏢 EMPRESAS (CLIENTES SaaS)
-- ============================================================

CREATE TABLE empresas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  ativo        BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 💳 PLANOS (FUTURO MONETIZAÇÃO)
-- ============================================================

CREATE TABLE planos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome               TEXT NOT NULL,
  limite_vendedores  INT DEFAULT 5,
  valor              NUMERIC(10,2) DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE empresas ADD COLUMN plano_id UUID REFERENCES planos(id);

-- ============================================================
-- 🏪 LOJAS
-- ============================================================

CREATE TABLE lojas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  cidade       TEXT,
  estado       TEXT,
  ativo        BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 👤 USUÁRIOS
-- ============================================================

CREATE TABLE usuarios (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  UUID REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  perfil      perfil_usuario NOT NULL DEFAULT 'vendedor',
  foto_url    TEXT,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RELACIONAMENTOS
-- ============================================================

CREATE TABLE loja_gerentes (
  loja_id            UUID REFERENCES lojas(id) ON DELETE CASCADE,
  usuario_id         UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  visao_consolidada  BOOLEAN DEFAULT false,
  PRIMARY KEY (loja_id, usuario_id)
);

CREATE TABLE loja_supervisores (
  loja_id     UUID REFERENCES lojas(id) ON DELETE CASCADE,
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (loja_id, usuario_id)
);

-- ============================================================
-- 🧑‍💼 VENDEDORES
-- ============================================================

CREATE TABLE vendedores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  loja_id     UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  foto_url    TEXT,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 🎯 METAS
-- ============================================================

CREATE TABLE metas_loja (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id      UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  ano          INT NOT NULL,
  mes          INT NOT NULL,
  meta_total   NUMERIC(14,2) DEFAULT 0,
  peso_venda   INT DEFAULT 40,
  peso_ticket  INT DEFAULT 30,
  peso_pa      INT DEFAULT 30,
  UNIQUE (loja_id, ano, mes)
);

CREATE TABLE metas_vendedor (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id  UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  loja_id      UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  ano          INT NOT NULL,
  mes          INT NOT NULL,
  semana       INT,
  meta_venda   NUMERIC(12,2) DEFAULT 0,
  meta_ticket  NUMERIC(10,2) DEFAULT 0,
  meta_pa      NUMERIC(6,2) DEFAULT 0,
  UNIQUE (vendedor_id, ano, mes, semana)
);

-- ============================================================
-- 📊 LANÇAMENTOS
-- ============================================================

CREATE TABLE lancamentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id   UUID NOT NULL REFERENCES vendedores(id) ON DELETE CASCADE,
  loja_id       UUID NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  data          DATE NOT NULL,
  vendas        NUMERIC(12,2) DEFAULT 0,
  atendimentos  INT DEFAULT 0,
  pecas         INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vendedor_id, data)
);

-- ============================================================
-- 🔐 FUNÇÕES
-- ============================================================

CREATE OR REPLACE FUNCTION fn_meu_perfil()
RETURNS perfil_usuario LANGUAGE sql STABLE AS $$
  SELECT perfil FROM usuarios WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION fn_minhas_lojas()
RETURNS SETOF UUID LANGUAGE sql STABLE AS $$
  SELECT loja_id FROM loja_gerentes WHERE usuario_id = auth.uid()
  UNION
  SELECT loja_id FROM loja_supervisores WHERE usuario_id = auth.uid()
  UNION
  SELECT loja_id FROM vendedores WHERE usuario_id = auth.uid();
$$;

-- ============================================================
-- 🔒 RLS
-- ============================================================

ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas_vendedor ENABLE ROW LEVEL SECURITY;

-- LOJAS
CREATE POLICY "lojas_read" ON lojas
FOR SELECT USING (
  empresa_id = (SELECT empresa_id FROM usuarios WHERE id = auth.uid())
);

-- VENDEDORES
CREATE POLICY "vendedores_read" ON vendedores
FOR SELECT USING (
  loja_id IN (SELECT fn_minhas_lojas())
);

CREATE POLICY "vendedores_write" ON vendedores
FOR ALL USING (
  loja_id IN (SELECT loja_id FROM loja_gerentes WHERE usuario_id = auth.uid())
);

-- LANÇAMENTOS
CREATE POLICY "lancamentos_read" ON lancamentos
FOR SELECT USING (
  loja_id IN (SELECT fn_minhas_lojas())
);

CREATE POLICY "lancamentos_write" ON lancamentos
FOR ALL USING (
  loja_id IN (SELECT loja_id FROM loja_gerentes WHERE usuario_id = auth.uid())
);

-- METAS DA LOJA
CREATE POLICY "metas_loja_read" ON metas_loja
FOR SELECT USING (
  loja_id IN (SELECT fn_minhas_lojas())
);

CREATE POLICY "metas_loja_write" ON metas_loja
FOR ALL USING (
  loja_id IN (SELECT loja_id FROM loja_gerentes WHERE usuario_id = auth.uid())
);

-- METAS DO VENDEDOR
CREATE POLICY "metas_vendedor_read" ON metas_vendedor
FOR SELECT USING (
  loja_id IN (SELECT fn_minhas_lojas())
);

CREATE POLICY "metas_vendedor_write" ON metas_vendedor
FOR ALL USING (
  loja_id IN (SELECT loja_id FROM loja_gerentes WHERE usuario_id = auth.uid())
);

-- ============================================================
-- 👤 CRIAÇÃO AUTOMÁTICA DE USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO usuarios (id, nome, email)
  VALUES (
    NEW.id,
    split_part(NEW.email,'@',1),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ============================================================
-- 🖼️ STORAGE — bucket avatars (executar no Supabase Dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- CREATE POLICY "avatars público leitura" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "avatars upload autenticado" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
-- CREATE POLICY "avatars delete autenticado" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
