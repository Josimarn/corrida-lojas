'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { fmtPct, fmtR } from '@/lib/helpers'

const CORES_F1 = [
  { text: '#facc15', bar: 'from-yellow-400 to-orange-500' },
  { text: '#94a3b8', bar: 'from-slate-400 to-slate-300' },
  { text: '#f59e0b', bar: 'from-amber-700 to-amber-500' },
  { text: '#818cf8', bar: 'from-indigo-500 to-purple-500' },
  { text: '#34d399', bar: 'from-green-500 to-emerald-400' },
]
function corF1(index) { return CORES_F1[index] || CORES_F1[4] }

export default function RankingAbsurdo({ ranking = [], lojaData = {} }) {
  const [prev, setPrev] = useState([])
  const [mov, setMov] = useState({})

  // 🔥 Detecta ultrapassagem
  useEffect(() => {
    if (!prev.length) {
      setPrev(ranking)
      return
    }

    const changes = {}
    ranking.forEach((l, i) => {
      const oldIndex = prev.findIndex(p => p.id === l.id)
      if (oldIndex !== -1 && oldIndex !== i) {
        changes[l.id] = oldIndex > i ? 'up' : 'down'
      }
    })

    setMov(changes)
    setPrev(ranking)
    setTimeout(() => setMov({}), 2000)
  }, [ranking])

  const top3 = ranking.slice(0, 3)
  const resto = ranking.slice(3)

  return (
    <div className="mt-2">

      {/* TÍTULO */}
      <h2 className="text-lg font-bold text-white/70 mb-6 uppercase tracking-widest text-sm">
        🏆 Classificação das Lojas
      </h2>

      {/* PÓDIO TOP 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {top3.map((l, i) => {
          const score = l.percentual || 0
          const isTop = i === 0
          const cor   = corF1(i)

          return (
            <motion.div
              key={l.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: isTop ? 1.05 : 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 80 }}
              className={`p-6 rounded-2xl text-center border relative overflow-hidden ${
                i === 0
                  ? 'bg-yellow-500/10 border-yellow-400 shadow-[0_0_40px_rgba(255,215,0,0.4)]'
                  : i === 1
                  ? 'bg-slate-500/10 border-slate-400/50'
                  : 'bg-amber-500/10 border-amber-600/60'
              }`}
            >
              {/* PULSE LÍDER */}
              {isTop && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 border-2 border-yellow-400 rounded-2xl pointer-events-none"
                />
              )}

              {/* MEDALHA */}
              <div className="text-4xl mb-2">
                {i === 0 && '🥇'}
                {i === 1 && '🥈'}
                {i === 2 && '🥉'}
              </div>

              {/* NOME */}
              <p className={`font-bold text-lg ${isTop ? 'text-yellow-300' : 'text-white'}`}>
                {l.nome}
              </p>

              {/* SCORE */}
              <motion.p
                key={score}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-2xl font-extrabold mt-2"
                style={{ color: cor.text }}
              >
                {fmtPct(score)}
              </motion.p>

              {/* VALOR */}
              <p className="text-sm text-gray-400 mt-1">
                {fmtR(lojaData[l.id]?.totalVendas || 0)}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* LISTA DO 4º EM DIANTE */}
      {resto.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {resto.map((l, i) => {
              const score     = l.percentual || 0
              const movimento = mov[l.id]
              const cor       = corF1(i + 3)

              return (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-4 rounded-xl flex justify-between items-center relative overflow-hidden ${
                    movimento === 'up'
                      ? 'bg-green-500/10 border border-green-400/20'
                      : movimento === 'down'
                      ? 'bg-red-500/10 border border-red-400/20'
                      : 'bg-white/5 border border-white/5'
                  }`}
                >
                  {movimento === 'up' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-green-400/20 pointer-events-none"
                    />
                  )}
                  {movimento === 'down' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-red-400/20 pointer-events-none"
                    />
                  )}

                  <div className="flex items-center gap-3 relative">
                    <span className="text-gray-400 text-sm w-5">{i + 4}º</span>
                    <span className="text-white font-medium">{l.nome}</span>
                    {movimento === 'up' && <span className="text-green-400 text-xs">🚀 subiu</span>}
                    {movimento === 'down' && <span className="text-red-400 text-xs">🔻 caiu</span>}
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(score, 100)}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full bg-gradient-to-r ${cor.bar}`}
                      />
                    </div>
                    <span className="font-bold min-w-[48px] text-right" style={{ color: cor.text }}>
                      {fmtPct(score)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
