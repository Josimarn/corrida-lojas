'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { fmtR, fmtPct, aggregateLancamentos } from '@/lib/helpers'

const CORES_F1 = [
  { text: '#facc15', bar: 'from-yellow-400 to-orange-500' },
  { text: '#94a3b8', bar: 'from-slate-400 to-slate-300' },
  { text: '#f59e0b', bar: 'from-amber-700 to-amber-500' },
  { text: '#818cf8', bar: 'from-indigo-500 to-purple-500' },
  { text: '#34d399', bar: 'from-green-500 to-emerald-400' },
]
function corF1(index) { return CORES_F1[index] || CORES_F1[4] }

export default function CardsDesempenho({ ranking = [], lojaData = {} }) {
  const [prevRanking, setPrevRanking] = useState([])
  const [movimentos, setMovimentos] = useState({})

  // 🔥 Detecta mudanças de posição
  useEffect(() => {
    if (!prevRanking.length) {
      setPrevRanking(ranking)
      return
    }

    const mov = {}
    ranking.forEach((loja, index) => {
      const prevIndex = prevRanking.findIndex(l => l.id === loja.id)
      if (prevIndex !== -1 && prevIndex !== index) {
        mov[loja.id] = prevIndex > index ? 'up' : 'down'
      }
    })

    setMovimentos(mov)
    setPrevRanking(ranking)
    setTimeout(() => setMovimentos({}), 2000)
  }, [ranking])

  return (
    <div className="mt-2">
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {ranking.map((loja, index) => {
            const d      = lojaData[loja.id] || {}
            const st     = aggregateLancamentos(d.lancamentos || [])
            const score  = Math.min(loja.percentual || 0, 100)
            const isTop  = index === 0
            const mov    = movimentos[loja.id]

            const cor     = corF1(index)
            const bgClass = index === 0
              ? 'bg-yellow-500/10 border-yellow-400/40 shadow-[0_0_25px_rgba(255,215,0,0.3)]'
              : index === 1
              ? 'bg-slate-500/10 border-slate-400/30'
              : index === 2
              ? 'bg-amber-500/10 border-amber-600/30'
              : index === 3
              ? 'bg-indigo-500/10 border-indigo-400/30'
              : 'bg-emerald-500/10 border-emerald-400/30'

            return (
              <motion.div
                key={loja.id}
                layout
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 80 }}
                className={`p-4 rounded-xl border relative overflow-hidden ${bgClass}`}
              >
                {/* FLASH: SUBIU */}
                {mov === 'up' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 bg-green-400/20 pointer-events-none"
                  />
                )}

                {/* FLASH: CAIU */}
                {mov === 'down' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 bg-red-400/20 pointer-events-none"
                  />
                )}

                {/* HEADER */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">#{index + 1}</span>
                    {index === 0 && <span>🥇</span>}
                    {index === 1 && <span>🥈</span>}
                    {index === 2 && <span>🥉</span>}
                    <span className={`font-semibold ${isTop ? 'text-yellow-300' : 'text-white'}`}>
                      {loja.nome}
                    </span>
                  </div>
                  <motion.span
                    key={score}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-lg font-bold"
                    style={{ color: cor.text }}
                  >
                    {fmtPct(loja.percentual)}
                  </motion.span>
                </div>

                {/* BARRA */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full bg-gradient-to-r ${cor.bar}`}
                  />
                </div>

                {/* MÉTRICAS */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-400">Vendas</p>
                    <p className="font-bold text-white">{fmtR(st.vendas)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Meta</p>
                    <p className="font-bold text-white">{fmtR((d.metaLoja?.meta_loja ?? 0) > 0 ? d.metaLoja.meta_loja : (d.metaLoja?.meta_total || 0))}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Atend.</p>
                    <p className="font-bold text-white">{st.atendimentos}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Ticket</p>
                    <p className="font-bold text-white">{fmtR(st.ticket)}</p>
                  </div>
                </div>

                {/* ALERTAS */}
                <div className="mt-3 text-xs min-h-[16px]">
                  {mov === 'up' && <span className="text-green-400">🚀 Subindo no ranking</span>}
                  {mov === 'down' && <span className="text-red-400">🔻 Perdeu posição</span>}
                  {!mov && loja.percentual >= 100 && <span className="text-yellow-400">🏆 Meta atingida!</span>}
                </div>

                {/* BORDA LÍDER PULSANDO */}
                {isTop && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 border-2 border-yellow-400/40 rounded-xl pointer-events-none"
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
