'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'

export default function AtualizarSenhaPage() {
  const router   = useRouter()
  const supabase = createClientComponent()

  const [senha,    setSenha]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState(null)
  const [pronto,   setPronto]   = useState(false)

  // Supabase injeta o token na URL como fragment (#access_token=...)
  // O SDK detecta automaticamente quando a página carrega
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPronto(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleSubmit(e) {
    e.preventDefault()
    if (senha.length < 6) {
      setMsg({ ok: false, text: 'A senha deve ter no mínimo 6 caracteres.' })
      return
    }
    if (senha !== confirma) {
      setMsg({ ok: false, text: 'As senhas não coincidem.' })
      return
    }

    setLoading(true)
    setMsg(null)

    const { error } = await supabase.auth.updateUser({ password: senha })
    setLoading(false)

    if (error) {
      setMsg({ ok: false, text: error.message })
    } else {
      setMsg({ ok: true, text: 'Senha atualizada com sucesso! Redirecionando...' })
      setTimeout(() => router.replace('/'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl">🏁</span>
          <span className="font-bold text-stone-900 text-lg">Corrida das Lojas</span>
        </div>

        <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Nova senha</h1>
        <p className="text-stone-500 text-sm mb-8">Escolha uma nova senha para sua conta.</p>

        {!pronto ? (
          <div className="text-stone-400 text-sm text-center py-8">
            Verificando link de recuperação...
          </div>
        ) : msg?.ok ? (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
            {msg.text}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Nova senha</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label-field">Confirmar senha</label>
              <input
                type="password"
                placeholder="Repita a nova senha"
                value={confirma}
                onChange={e => setConfirma(e.target.value)}
                required
              />
            </div>

            {msg?.ok === false && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !senha || !confirma}
              className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
