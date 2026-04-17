'use client'

import { motion } from 'framer-motion'
import { fmtPct } from '@/lib/helpers'

const CORES_F1 = [
  { text: '#facc15', bar: 'from-yellow-400 to-orange-500' },
  { text: '#94a3b8', bar: 'from-slate-400 to-slate-300' },
  { text: '#f59e0b', bar: 'from-amber-700 to-amber-500' },
  { text: '#818cf8', bar: 'from-indigo-500 to-purple-500' },
  { text: '#34d399', bar: 'from-green-500 to-emerald-400' },
]
function corF1(index) { return CORES_F1[index] || CORES_F1[4] }

// Aceita duas APIs:
// Nova: <RaceTrack ranking={[{ id, nome, codigo, percentual }]} />
// Antiga: <RaceTrack vendedores={[...]} scores={{ [id]: { score, scoreDisplay } }} semanas={4} />
export default function RaceTrack({ ranking: rankingProp, vendedores, scores, semanas = 4 }) {

  // Normaliza para o formato { id, nome, codigo, percentual }
  const ranking = rankingProp
    ? rankingProp
    : (vendedores || [])
        .map(v => {
          const sc = scores?.[v.id] || { score: 0, scoreDisplay: 0 }
          return {
            id: v.id,
            nome: v.nome,
            codigo: v.label || null,
            percentual: sc.scoreDisplay ?? sc.score,
          }
        })
        .sort((a, b) => b.percentual - a.percentual)

  if (!ranking.length) return (
    <div className="text-sm text-stone-400 text-center py-8">
      Nenhum dado disponível.
    </div>
  )

  const lider = ranking[0]

  return (
    <div className="bg-[#0b1220] rounded-xl p-5 text-white relative overflow-hidden">

      {/* HEADER INTELIGENTE */}
      <div className="mb-4 text-sm text-gray-300">
        🏁 Líder: <span className="text-yellow-400 font-bold">{lider?.nome}</span>
        {ranking[1] && <> · 🔥 Destaque: {ranking[1].nome}</>}
        {ranking.filter(r => r.percentual < 50).length > 0 && (
          <> · ⚠️ Abaixo de 50%: {ranking.filter(r => r.percentual < 50).length}</>
        )}
      </div>

      {/* GRID SEMANAS */}
      {semanas > 0 && (
        <div className="grid grid-cols-12 text-xs text-gray-400 mb-2">
          <div className="col-span-2" />
          <div className="col-span-10 grid grid-cols-4 text-center">
            {Array.from({ length: semanas }, (_, i) => (
              <span key={i}>Sem {i + 1}</span>
            ))}
          </div>
        </div>
      )}

      {ranking.map((item, index) => {
        const pct       = Math.min(item.percentual, 100)
        const bateuMeta = item.percentual >= 100

        return (
          <motion.div
            key={item.id}
            layout
            className={`mb-3 p-3 rounded-lg transition-all ${
              index === 0
                ? 'bg-yellow-500/10 border border-yellow-400/40 shadow-[0_0_25px_rgba(255,215,0,0.4)]'
                : 'bg-white/5 border border-white/5'
            }`}
          >
            {/* HEADER DA PISTA */}
            <div className="flex justify-between items-center mb-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs w-4 text-gray-400">{index + 1}</span>
                {item.codigo && (
                  <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {String(item.codigo).slice(0, 3)}
                  </div>
                )}
                <span className={`truncate ${index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-300'}`}>
                  {index === 0 ? '👑 ' : ''}{item.nome}
                </span>
              </div>
              <span className="font-semibold" style={{ color: bateuMeta ? '#facc15' : corF1(index).text }}>
                {fmtPct(item.percentual)}
                {bateuMeta && ' 🏆'}
              </span>
            </div>

            {/* PISTA */}
            <div className="relative h-12 rounded-full bg-black/40 overflow-hidden">

              {/* ZONAS DAS SEMANAS */}
              {semanas > 0 && (
                <div className="absolute inset-0 grid grid-cols-4">
                  <div className="bg-blue-500/5" />
                  <div className="bg-yellow-500/5" />
                  <div className="bg-orange-500/5" />
                  <div className="bg-red-500/5" />
                </div>
              )}

              {/* LINHAS DIVISÓRIAS */}
              {semanas > 0 && (
                <div className="absolute inset-0 grid grid-cols-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="border-r border-white/10" />
                  ))}
                </div>
              )}

              {/* BARRA DE PROGRESSO */}
              <motion.div
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1 }}
                className={`h-full bg-gradient-to-r ${corF1(index).bar} ${bateuMeta ? 'shadow-[0_0_20px_rgba(255,215,0,0.6)] animate-pulse' : ''}`}
              />

              {/* EFEITO VIDA */}
              <motion.div
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white/5 pointer-events-none"
              />

              {/* CARRINHO */}
              <motion.div
                animate={{ left: `${Math.min(pct, 97)}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 14, mass: 0.8 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              >
                <motion.span
                  animate={{
                    scaleX: [-1, -1],
                    rotate: [0, 8, -6, 4, 0],
                    scale: index === 0 ? [1, 1.15, 1] : 1,
                  }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ display: 'inline-block', scaleX: -1 }}
                  className="text-3xl"
                >
                  🚗
                </motion.span>
              </motion.div>

              {/* META ATINGIDA */}
              {bateuMeta && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.4, 1] }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                >
                  🏁✨
                </motion.div>
              )}

              {/* MARCA 50% */}
              <div className="absolute left-1/2 top-0 h-full border-l border-white/10 flex items-end justify-center pointer-events-none">
                <span className="text-[9px] text-gray-500 mb-0.5">50%</span>
              </div>

            </div>
          </motion.div>
        )
      })}

      {/* RODAPÉ */}
      <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
        <span>Largada</span>
        <span>50%</span>
        <span>100% Meta</span>
      </div>
    </div>
  )
}
