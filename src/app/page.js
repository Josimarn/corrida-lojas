'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createClientComponent } from '../lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

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

  const [players, setPlayers] = useState([
    { id: 1, nome: 'João',  progress: 82, color: 'from-purple-500 to-pink-500'   },
    { id: 2, nome: 'Maria', progress: 71, color: 'from-blue-500 to-cyan-500'     },
    { id: 3, nome: 'Lucas', progress: 55, color: 'from-green-500 to-emerald-500' },
  ])
  const [events, setEvents] = useState([])
  const [sales,  setSales]  = useState(43214)
  const [boost,  setBoost]  = useState(null)
  const [winner, setWinner] = useState(null)

  const frases = [
    '🔥 João fechou uma venda',
    '🚀 Maria acelerou nas vendas',
    '💰 Nova venda registrada',
    '🏁 Lucas encostou no líder',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setSales(prev => prev + Math.floor(Math.random() * 300))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => {
        let updated = prev.map(p => ({
          ...p,
          progress: Math.min(p.progress + Math.random() * 3, 100),
        }))
        updated.sort((a, b) => b.progress - a.progress)
        prev.forEach(oldP => {
          const newPos = updated.findIndex(p => p.id === oldP.id)
          const oldPos = prev.findIndex(p => p.id === oldP.id)
          if (newPos < oldPos) {
            addEvent(`🔥 ${oldP.nome} ultrapassou alguém!`)
            setBoost(oldP.id)
            setTimeout(() => setBoost(null), 800)
          }
        })
        updated.forEach(p => {
          if (p.progress >= 100 && winner !== p.id) {
            setWinner(p.id)
            addEvent(`🎉 ${p.nome} bateu a meta!`)
          }
          if (p.progress >= 90 && p.progress < 100) {
            addEvent(`⚡ ${p.nome} está quase lá!`)
          }
        })
        if (Math.random() > 0.7) {
          addEvent(frases[Math.floor(Math.random() * frases.length)])
        }
        return [...updated]
      })
    }, 2500)
    return () => clearInterval(interval)
  }, [winner])

  function addEvent(text) {
    setEvents(prev => {
      if (prev.includes(text)) return prev
      return [text, ...prev].slice(0, 4)
    })
  }

  return (
    <div className="h-screen flex bg-[#0B0B0F] text-white overflow-hidden relative">

      {/* FUNDO */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(124,58,237,0.25),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.25),transparent_40%)]" />

      {/* ESQUERDA */}
      <div className="hidden lg:flex w-1/2 px-10 py-8 flex-col justify-center relative z-10">

        <h1 className="text-4xl font-bold mb-2">
          🏁 Sua equipe está competindo agora
        </h1>
        <p className="text-gray-400 mb-6">
          Times que usam esse painel aumentam performance em poucos dias
        </p>

        <div className="mb-6">
          <p className="text-sm text-gray-400">💰 Vendas hoje</p>
          <h2 className="text-3xl font-bold text-green-400">
            R$ {sales.toLocaleString('pt-BR')}
          </h2>
        </div>

        <p className="text-sm text-gray-400 mb-3">🔥 Ranking ao vivo</p>

        <div className="space-y-4 relative">
          {players.map((p, i) => {
            const isNear = p.progress >= 90 && p.progress < 100
            return (
              <div key={p.id}>
                <motion.div
                  className={`relative h-12 rounded-full overflow-hidden ${
                    i === 0
                      ? 'border border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.5)]'
                      : 'border border-white/10 bg-white/5'
                  }`}
                  animate={winner === p.id ? { x: [0, -2, 2, -2, 2, 0] } : {}}
                >
                  <motion.div
                    className={`h-full bg-gradient-to-r ${p.color} ${i === 0 ? 'ring-2 ring-yellow-400' : ''}`}
                    animate={{
                      width: `${p.progress}%`,
                      boxShadow: isNear
                        ? '0 0 15px rgba(250,204,21,0.8)'
                        : winner === p.id
                        ? '0 0 20px rgba(34,197,94,0.8)'
                        : 'none',
                    }}
                  />
                  <motion.div
                    className="absolute top-1/2 text-xl"
                    animate={
                      winner === p.id
                        ? { scale: [1, 1.5, 1], y: [-10, -20, -10] }
                        : isNear
                        ? { x: [0, 5, -5, 5, 0] }
                        : boost === p.id
                        ? { scale: [1, 1.3, 1], rotate: [90, 100, 80, 90] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.4 }}
                    style={{ left: `${p.progress}%`, transform: 'translateY(-50%) rotate(90deg)' }}
                  >
                    🚗
                  </motion.div>
                  <motion.img
                    src="/flag.svg"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 brightness-200"
                    animate={{
                      skewX: isNear ? [0, 20, -15, 20, 0] : [0, 12, -12, 12, 0],
                      scale: isNear ? [1, 1.2, 1] : 1,
                    }}
                    transition={{ duration: isNear ? 0.3 : 0.6, repeat: Infinity }}
                  />
                </motion.div>
                <div className={`flex justify-between text-sm mt-1 ${i === 0 ? 'text-yellow-400 font-semibold drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]' : ''}`}>
                  <span>{['🥇','🥈','🥉'][i]} {p.nome}</span>
                  <span className="text-green-400">{p.progress.toFixed(0)}%</span>
                </div>
              </div>
            )
          })}

          {winner && (
            <motion.div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div key={i}
                  className="absolute w-2 h-2 bg-green-400 rounded-full"
                  initial={{ x: '50%', y: '50%' }}
                  animate={{ x: `${Math.random() * 100}%`, y: `${Math.random() * 100}%` }}
                  transition={{ duration: 1 }}
                />
              ))}
            </motion.div>
          )}
        </div>

        <div className="mt-6 space-y-2">
          <AnimatePresence>
            {events.map((e, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white/5 px-4 py-2 rounded-lg text-sm border border-white/10">
                {e}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* DIREITA */}
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB] text-black relative z-10">

        <div className="bg-white/80 backdrop-blur-md shadow-2xl rounded-2xl p-8 w-full max-w-[380px] mx-4">

          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <span className="text-2xl">🏁</span>
            <span className="font-bold text-stone-900 text-lg">Corrida das Lojas</span>
          </div>

          <h2 className="text-2xl font-bold mb-1">Entrar</h2>
          <p className="text-gray-500 text-sm mb-5">Entre com suas credenciais</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <a href="/recuperar-senha" className="text-xs text-gray-400 hover:text-gray-700">
                Esqueci minha senha
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

          <p className="text-xs text-gray-400 text-center mt-6">
            Acesso restrito. Entre em contato com seu gestor para obter credenciais.
          </p>
        </div>
      </div>
    </div>
  )
}
