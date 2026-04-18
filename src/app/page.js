'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createClientComponent } from '../lib/supabase-browser'
import { useRouter } from 'next/navigation'
import CorridaItem from '../components/CorridaItem'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [eventos,  setEventos]  = useState([])

  const router   = useRouter()
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

  const ranking = [
    { nome: 'João', percentual: 100, cor: 'from-pink-500 to-purple-500' },
    { nome: 'Maria', percentual: 72, cor: 'from-blue-500 to-cyan-500' },
    { nome: 'Lucas', percentual: 56, cor: 'from-green-500 to-emerald-500' },
  ]

  useEffect(() => {
    const lista = [
      '🔥 João fechou uma venda',
      '🎉 Maria bateu a meta!',
      '🚀 Lucas acelerou nas vendas',
      '💰 Nova venda registrada',
    ]

    const interval = setInterval(() => {
      const novo = lista[Math.floor(Math.random() * lista.length)]
      setEventos((prev) => [novo, ...prev.slice(0, 3)])
    }, 2500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex antialiased">

      {/* LADO ESQUERDO */}
      <div className="hidden md:flex w-1/2 relative overflow-hidden text-white p-12 flex-col justify-between
        bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#4338ca]">

        {/* Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.4),transparent)] blur-3xl" />

        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-indigo-300 mb-2">
            Plataforma de Gestão
          </p>

          <h1 className="text-4xl font-bold mb-4 leading-tight tracking-tight">
            Sistema completo para gestão de lojas
          </h1>

          <p className="text-lg text-gray-300">
            Controle vendas, estoque e performance em tempo real
          </p>
        </div>

        {/* RANKING */}
        <div className="relative z-10 space-y-1">

          {ranking.map((item, index) => (
            <CorridaItem
              key={index}
              nome={item.nome}
              percentual={item.percentual}
              index={index}
              cor={item.cor}
            />
          ))}

          {/* EVENTOS */}
          <div className="mt-4 space-y-2">
            {eventos.map((evento, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2
                text-sm text-white backdrop-blur hover:scale-[1.02] transition-all"
              >
                {evento}
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="w-full md:w-1/2 flex items-center justify-center
        bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/70 backdrop-blur-2xl
            shadow-[0_30px_80px_rgba(0,0,0,0.35)]
            border border-white/20
            rounded-2xl p-10 w-full max-w-md mx-4"
        >
          <h2 className="text-2xl font-bold mb-2 text-gray-800">Entrar</h2>
          <p className="text-gray-500 mb-6">Entre com suas credenciais</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full p-3 rounded-xl border border-gray-300 bg-white/60
                focus:ring-2 focus:ring-purple-500 focus:outline-none focus:bg-white
                transition-all text-black"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-xl border border-gray-300 bg-white/60
                focus:ring-2 focus:ring-purple-500 focus:outline-none focus:bg-white
                transition-all text-black"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="text-right text-sm">
              <a href="/recuperar-senha" className="text-gray-500 hover:text-purple-600 transition">
                Esqueci minha senha
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold
                bg-gradient-to-r from-purple-500 to-blue-600
                hover:scale-105 hover:shadow-xl active:scale-95
                transition-all duration-300 flex items-center justify-center
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            Acesso restrito. Entre em contato com seu gestor.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
