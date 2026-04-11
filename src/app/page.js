'use client'

import { useState } from 'react'
import { createClientComponent } from '../lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = createClientComponent()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message || 'E-mail ou senha inválidos. Tente novamente.')
    } else {
      router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — visual */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-stone-900 p-12 relative overflow-hidden">
        {/* Pista decorativa */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute h-px bg-white" style={{ top: `${12 + i * 11}%`, left: 0, right: 0 }} />
          ))}
          {[25, 50, 75].map(p => (
            <div key={p} className="absolute top-0 bottom-0 w-px bg-white" style={{ left: `${p}%` }} />
          ))}
        </div>

        {/* Carros na pista */}
        <div className="absolute inset-0 flex flex-col justify-center gap-6 px-12 opacity-10 pointer-events-none">
          {['🏎️', '🚗', '🚕', '🚙'].map((car, i) => (
            <div key={i} className="flex items-center">
              <div className="h-7 rounded-full bg-white" style={{ width: `${50 + i * 10}%` }} />
              <span className="text-xl ml-2">{car}</span>
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <span className="text-white font-bold text-xl tracking-tight">Corrida das Lojas</span>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-white text-4xl font-extrabold leading-tight mb-4">
            Acompanhe seu<br />time em tempo real
          </h2>
          <p className="text-stone-300 text-base leading-relaxed">
            Visualize o ranking de vendas, metas e desempenho de cada vendedor — tudo em um painel dinâmico.
          </p>
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex gap-1">
            {['🥇', '🥈', '🥉'].map((m, i) => (
              <span key={i} className="text-xl">{m}</span>
            ))}
          </div>
          <p className="text-stone-300 text-sm">Venda · Ticket Médio · PA</p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <span className="text-2xl">🏁</span>
            <span className="font-bold text-stone-900 text-lg">Corrida das Lojas</span>
          </div>

          <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Bem-vindo de volta</h1>
          <p className="text-stone-500 text-sm mb-8">Entre com suas credenciais para acessar o painel.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-field">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="label-field">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <a href="/recuperar-senha" className="text-xs text-stone-400 hover:text-stone-700">
                Esqueci minha senha
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-10">
            Acesso restrito. Entre em contato com seu gestor para obter credenciais.
          </p>
        </div>
      </div>
    </div>
  )
}
