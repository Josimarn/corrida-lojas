# 🏁 Corrida das Lojas — Guia de Instalação Completo

Siga este guia passo a passo para colocar o sistema no ar. Tempo estimado: **30 a 45 minutos**.

---

## PASSO 1 — Criar conta no Supabase (banco de dados)

1. Acesse **https://supabase.com** e clique em **Start for free**
2. Entre com sua conta Google ou crie uma conta com e-mail
3. Clique em **New Project**
4. Preencha:
   - **Organization**: nome da sua empresa
   - **Project name**: `corrida-lojas`
   - **Database Password**: crie uma senha forte e **anote em local seguro**
   - **Region**: `South America (São Paulo)`
5. Clique em **Create new project** e aguarde ~2 minutos

---

## PASSO 2 — Criar o banco de dados

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. Copie **todo o conteúdo** e cole no SQL Editor
5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Aguarde a mensagem **"Success"**

---

## PASSO 3 — Copiar as credenciais do Supabase

1. No Supabase, vá em **Project Settings** (ícone de engrenagem) → **API**
2. Copie:
   - **Project URL** (começa com `https://`)
   - **anon public** key (chave longa)

---

## PASSO 4 — Criar conta na Vercel (hospedagem)

1. Acesse **https://vercel.com** e clique em **Sign Up**
2. Entre com sua conta GitHub (crie uma em github.com se não tiver)
3. Conclua o cadastro

---

## PASSO 5 — Publicar o projeto

### Opção A — Via GitHub (recomendado)

1. Crie uma conta no **https://github.com**
2. Clique em **New repository**, nomeie `corrida-lojas`, clique em **Create**
3. Instale o Git no seu computador: https://git-scm.com
4. Abra o terminal na pasta do projeto e execute:
```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/corrida-lojas.git
git push -u origin main
```
5. Na Vercel, clique em **Add New Project** → importe o repositório `corrida-lojas`
6. Na tela de configuração, clique em **Environment Variables** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = sua Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = sua anon key
7. Clique em **Deploy**
8. Aguarde ~3 minutos. A Vercel fornecerá um link como `corrida-lojas.vercel.app`

### Opção B — Via Vercel CLI

```bash
npm install -g vercel
cd corrida-lojas
vercel
# Siga as instruções, adicione as variáveis de ambiente quando solicitado
```

---

## PASSO 6 — Configurar o arquivo de ambiente local (para desenvolvimento)

1. Na pasta do projeto, copie o arquivo de exemplo:
```bash
cp .env.local.example .env.local
```
2. Abra `.env.local` e preencha com suas credenciais:
```
NEXT_PUBLIC_SUPABASE_URL=https://seuprojecid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

---

## PASSO 7 — Criar o primeiro usuário (Dono)

1. No Supabase, vá em **Authentication** → **Users** → **Add user**
2. Preencha o e-mail e senha do dono
3. Clique em **Create User**
4. Volte ao **SQL Editor** e execute:
```sql
UPDATE usuarios SET perfil = 'dono' WHERE email = 'email_do_dono@exemplo.com';
```
5. Acesse o sistema pelo link da Vercel e faça login com esse usuário

---

## PASSO 8 — Criar lojas e usuários

### Criar lojas (como Dono logado no sistema)
1. Acesse o painel do Dono
2. Clique em **+ Nova Loja**
3. Preencha nome, cidade e estado

### Criar usuários (Gerente, Supervisor, Vendedor)
1. No Supabase → **Authentication** → **Users** → **Add user** → preencha e-mail e senha
2. No **SQL Editor**, defina o perfil:
```sql
-- Gerente
UPDATE usuarios SET perfil = 'gerente' WHERE email = 'gerente@loja.com';

-- Vincula gerente à loja (substitua os IDs)
INSERT INTO loja_gerentes (loja_id, usuario_id)
SELECT l.id, u.id
FROM lojas l, usuarios u
WHERE l.nome = 'Nome da Loja' AND u.email = 'gerente@loja.com';

-- Supervisor
UPDATE usuarios SET perfil = 'supervisor' WHERE email = 'supervisor@empresa.com';
INSERT INTO loja_supervisores (loja_id, usuario_id)
SELECT l.id, u.id FROM lojas l, usuarios u
WHERE l.nome = 'Nome da Loja' AND u.email = 'supervisor@empresa.com';
```

### Criar vendedores (como Gerente logado)
Os vendedores são cadastrados diretamente pelo Gerente na tela **Equipe** do painel.

---

## PASSO 9 — Definir metas

Como **Gerente** logado:
1. Clique em **⚙ Metas** no painel
2. Defina:
   - **Meta total da loja** no mês
   - **Pesos** (Venda % + Ticket % + PA % = 100%)
   - **Meta individual** de cada vendedor (venda, ticket médio, PA)
   - **Meta semanal** de cada vendedor (pode ser diferente por semana)

---

## PASSO 10 — Usar no dia a dia

| Quem | O que faz |
|------|-----------|
| **Gerente** | Lança vendas diárias de cada vendedor, define metas, gerencia equipe |
| **Supervisor** | Acompanha ranking de lojas, vê pista de cada loja |
| **Vendedor** | Vê apenas seus próprios resultados e posição no ranking |
| **Dono** | Visão consolidada de todas as lojas, cria lojas e usuários |

---

## Acessar no celular / tablet

O sistema é responsivo e funciona em qualquer navegador.

Para instalar como app no celular (PWA):
- **iPhone**: abra no Safari → toque em Compartilhar → **Adicionar à Tela de Início**
- **Android**: abra no Chrome → toque nos 3 pontos → **Adicionar à Tela Inicial**

---

## Executar localmente (desenvolvimento)

```bash
cd corrida-lojas
npm install
npm run dev
# Acesse http://localhost:3000
```

---

## Suporte e Dúvidas

- Documentação Supabase: https://supabase.com/docs
- Documentação Next.js: https://nextjs.org/docs
- Documentação Vercel: https://vercel.com/docs

---

## Resumo das URLs importantes

| Serviço | URL | Para quê |
|---------|-----|----------|
| Supabase Dashboard | https://supabase.com/dashboard | Banco de dados, usuários, SQL |
| Vercel Dashboard   | https://vercel.com/dashboard   | Deploy, variáveis, logs |
| Sistema (produção) | https://corrida-lojas.vercel.app | Acesso dos usuários |
| Sistema (local)    | http://localhost:3000 | Desenvolvimento |
