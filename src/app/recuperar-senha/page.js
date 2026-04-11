'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'

export default function RecuperarSenhaPage() {
  const router   = useRouter()
  const supabase = createClientComponent()

  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null) // { ok, text }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    const redirectTo = `${window.location.origin}/atualizar-senha`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })

    setLoading(false)

    if (error) {
      setMsg({ ok: false, text: error.message })
    } else {
      setMsg({ ok: true, text: 'Se esse e-mail estiver cadastrado, você receberá um link em instantes. Verifique sua caixa de entrada.' })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl">🏁</span>
          <span className="font-bold text-stone-900 text-lg">Corrida das Lojas</span>
        </div>

        <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Recuperar senha</h1>
        <p className="text-stone-500 text-sm mb-8">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        {msg?.ok ? (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">
            {msg.text}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            {msg?.ok === false && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {msg.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <button
          onClick={() => router.push('/')}
          className="mt-6 text-sm text-stone-400 hover:text-stone-700 w-full text-center block"
        >
          ← Voltar ao login
        </button>
      </div>
    </div>
  )
}
