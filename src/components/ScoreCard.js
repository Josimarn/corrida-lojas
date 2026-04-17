'use client'

import { motion } from 'framer-motion'
import Avatar from './Avatar'
import { fmtR, fmtN, fmtPct } from '@/lib/helpers'

/* Cores F1 por posição — alinha com RaceTrack e TV */
const CORES = [
  { bg: 'bg-yellow-500/10',  border: 'border-yellow-400/40',  glow: 'shadow-[0_0_25px_rgba(255,215,0,0.3)]',  bar: 'from-yellow-400 to-orange-500',  text: '#facc15' },
  { bg: 'bg-slate-500/10',   border: 'border-slate-400/30',   glow: '',                                        bar: 'from-slate-400 to-slate-300',    text: '#94a3b8' },
  { bg: 'bg-amber-500/10',   border: 'border-amber-600/30',   glow: '',                                        bar: 'from-amber-700 to-amber-500',    text: '#f59e0b' },
  { bg: 'bg-indigo-500/10',  border: 'border-indigo-400/30',  glow: '',                                        bar: 'from-indigo-500 to-purple-500',  text: '#818cf8' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-400/30', glow: '',                                        bar: 'from-green-500 to-emerald-400',  text: '#34d399' },
]

function corPorScore(score) {
  if (score >= 70) return { bg: 'bg-blue-500/10',   border: 'border-blue-400/30',   bar: 'from-blue-500 to-indigo-400',   text: '#60a5fa' }
  if (score >= 40) return { bg: 'bg-orange-500/10', border: 'border-orange-400/30', bar: 'from-orange-500 to-amber-400',  text: '#fb923c' }
  return               { bg: 'bg-red-500/10',    border: 'border-red-400/30',    bar: 'from-red-600 to-rose-500',      text: '#f87171' }
}

function BarraMini({ label, peso, pct, value, meta, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label} <span className="text-gray-600">({peso}%)</span></span>
        <span className="font-semibold" style={{ color }}>{fmtPct(pct)}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <div className="text-[10px] text-gray-500">{value} / {meta}</div>
    </div>
  )
}

export default function ScoreCard({ vendedor, stats, scored, index, movimento }) {
  const score   = Math.min(scored?.scoreDisplay ?? scored?.score ?? 0, 999)
  const atingiu = (scored?.scoreDisplay ?? scored?.score ?? 0) >= 100

  const cor   = CORES[index] ?? corPorScore(score)
  const medal = ['🥇', '🥈', '🥉'][index] ?? null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80 }}
      className={`relative p-4 rounded-xl border overflow-hidden ${cor.bg} ${cor.border} ${cor.glow || ''}`}
    >

      {/* Flash subiu */}
      {movimento === 'up' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-green-400/20 pointer-events-none"
        />
      )}

      {/* Flash caiu */}
      {movimento === 'down' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-red-400/20 pointer-events-none"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar nome={vendedor.nome} fotoUrl={vendedor.foto_url} index={index} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">#{index + 1}</span>
            {medal && <span>{medal}</span>}
            <span className={`font-semibold text-sm truncate ${index === 0 ? 'text-yellow-300' : 'text-white'}`}>
              {vendedor.nome}
            </span>
          </div>
          {movimento === 'up'   && <span className="text-xs text-green-400">🚀 Subindo</span>}
          {movimento === 'down' && <span className="text-xs text-red-400">🔻 Perdeu posição</span>}
          {!movimento && atingiu && <span className="text-xs text-yellow-400">🏆 Meta atingida!</span>}
        </div>
        <motion.span
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-xl font-extrabold"
          style={{ color: cor.text }}
        >
          {fmtPct(score)}
        </motion.span>
      </div>

      {/* Barra score geral */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8 }}
          className={`h-full bg-gradient-to-r ${cor.bar} ${atingiu ? 'animate-pulse' : ''}`}
        />
      </div>

      {/* Métricas individuais */}
      <div className="space-y-2.5">
        <BarraMini
          label="Venda" peso={scored?.pesos?.peso_venda || 40}
          pct={scored?.pv || 0}
          value={fmtR(stats?.vendas)} meta={fmtR(vendedor.meta?.meta_venda)}
          color="#facc15"
        />
        <BarraMini
          label="Ticket" peso={scored?.pesos?.peso_ticket || 30}
          pct={scored?.pt || 0}
          value={fmtR(stats?.ticket)} meta={fmtR(vendedor.meta?.meta_ticket)}
          color="#94a3b8"
        />
        <BarraMini
          label="PA" peso={scored?.pesos?.peso_pa || 30}
          pct={scored?.pp || 0}
          value={fmtN(stats?.pa) + ' pçs'} meta={fmtN(vendedor.meta?.meta_pa) + ' pçs'}
          color="#34d399"
        />
      </div>

      {/* Rodapé */}
      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-white/10">
        {[
          ['Atend.', stats?.atendimentos || 0],
          ['Peças',  stats?.pecas        || 0],
          ['Ticket', fmtR(stats?.ticket)],
        ].map(([l, v]) => (
          <div key={l} className="text-center">
            <p className="text-[10px] text-gray-500">{l}</p>
            <p className="text-sm font-bold text-white">{v}</p>
          </div>
        ))}
      </div>

      {/* Borda pulsante líder */}
      {index === 0 && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 border-2 border-yellow-400/40 rounded-xl pointer-events-none"
        />
      )}

    </motion.div>
  )
}
