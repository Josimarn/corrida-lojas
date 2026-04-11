# Projeto: corrida-lojas

## Descrição
Sistema de gestão do gerenciamento de metas por vendedores.
Possibilita acompanhar em tempo real o ranking de cada vendedoras em um tabuleiro de corrida.
É um sistema com permissão de acesso.

## Stack
Node.js, React

## Banco de dados
Supabase


## Como rodar
docker-compose up -d, VS Code

## Observações
Esse projeto será desenvolvido local e posteriormente hospedado em uma página web para acessos multiplos.


cat > CLAUDE.md << 'EOF'
# Corrida das Lojas

## Stack
- Next.js + Supabase + Vercel
- Local: http://localhost:3000

## Como rodar
npm install
npm run dev

## Perfis
- dono, supervisor, gerente, vendedor

## Métricas
- Venda 40% + Ticket Médio 30% + PA 30% = Score

## Banco
- Tabelas: usuarios, lojas, loja_gerentes, loja_supervisores
- Schema em: supabase/schema.sql

## Ambiente
- Credenciais em .env.local (nunca commitar)
EOF
