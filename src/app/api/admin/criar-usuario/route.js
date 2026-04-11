import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req) {
  try {
    // ── Parse do body ────────────────────────────────────────
    let body
    try { body = await req.json() }
    catch { return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 }) }

    const { nome, email, senha, perfil, empresa_id } = body

    // ── Validações básicas do payload ────────────────────────
    if (!nome?.trim() || !email || !senha || !empresa_id) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
    }
    const PERFIS_PERMITIDOS = ['gerente', 'supervisor', 'vendedor']
    if (!PERFIS_PERMITIDOS.includes(perfil)) {
      return NextResponse.json({ error: `Perfil "${perfil}" não permitido.` }, { status: 403 })
    }

    // ── Valida sessão e permissão do caller ──────────────────
    const cookieStore = await cookies()
    const supaSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supaSession.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { data: caller } = await supaSession.from('usuarios')
      .select('perfil, empresa_id').eq('id', user.id).single()

    if (!caller || caller.perfil !== 'dono') {
      return NextResponse.json({ error: 'Acesso negado. Requer perfil dono.' }, { status: 403 })
    }
    // Dono só gerencia a própria empresa
    if (empresa_id !== caller.empresa_id) {
      return NextResponse.json({ error: 'Acesso negado a essa empresa.' }, { status: 403 })
    }

    // ── Cria no Auth com service role ────────────────────────
    const supaAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: authData, error: authErr } = await supaAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: { nome: nome.trim() },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const newId = authData.user?.id
    if (!newId) return NextResponse.json({ error: 'Usuário criado mas sem ID.' }, { status: 500 })

    // ── Insere na tabela usuarios (com rollback se falhar) ───
    const { error: dbErr } = await supaAdmin.from('usuarios').upsert({
      id: newId,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil,
      empresa_id,
      ativo: true,
    }, { onConflict: 'id' })

    if (dbErr) {
      // Rollback: remove do Auth para não deixar usuário fantasma
      await supaAdmin.auth.admin.deleteUser(newId)
      return NextResponse.json({ error: 'Erro ao salvar perfil. Operação revertida.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: newId })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
