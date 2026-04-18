'use client'

import { motion, AnimatePresence } from 'framer-motion'
import './corrida.css'

const CAR_FILTERS = [
  'hue-rotate(40deg) saturate(2) brightness(1.1)',
  'grayscale(1) brightness(1.8)',
  'hue-rotate(20deg) saturate(2)',
  'hue-rotate(200deg) saturate(1.5) brightness(1.3)',
  'hue-rotate(120deg) saturate(1.5)',
]

const CORES_BARRA = [
  'linear-gradient(90deg, #ff4d8d, #a855f7)',
  'linear-gradient(90deg, #3b82f6, #06b6d4)',
  'linear-gradient(90deg, #22c55e, #16a34a)',
  'linear-gradient(90deg, #818cf8, #a855f7)',
  'linear-gradient(90deg, #f59e0b, #f97316)',
]

const MEDALHAS = ['🥇', '🥈', '🥉']

export default function CorridaItem({ nome, percentual, index = 0, cor }) {
  const bateuMeta = percentual >= 100
  const progresso = Math.min(percentual, 100)

  const corBarra = cor?.startsWith('from-')
    ? undefined
    : (cor || CORES_BARRA[index] || CORES_BARRA[4])

  const classBarra = [
    'barra',
    cor?.startsWith('from-') ? `bg-gradient-to-r ${cor}` : '',
    bateuMeta ? 'meta-atingida' : '',
  ].filter(Boolean).join(' ')

  const baseFilter = CAR_FILTERS[index] || CAR_FILTERS[4]

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="corrida-item"
    >
      <p className="corrida-nome">
        <span>{MEDALHAS[index] ?? `${index + 1}º`}</span>
        {index === 0 && <span style={{ color: '#facc15' }}>👑</span>}
        <span style={index === 0 ? { color: '#fde68a', fontWeight: 600 } : {}}>{nome}</span>
      </p>

      {/* PISTA — overflow:visible para não clipar o carro */}
      <div className="pista">

        {/* Camada da barra com overflow:hidden isolado */}
        <div className="pista-fill">
          {bateuMeta && <div className="glow-meta" />}
          <div
            className={classBarra}
            style={{ width: `${progresso}%`, ...(corBarra ? { background: corBarra } : {}) }}
          />
          {bateuMeta && <div className="bandeira-meta">🏁</div>}
        </div>

        {/* CARRINHO — livre do clip, centralizado na pista */}
        <motion.div
          className={`carrinho${bateuMeta ? ' turbo' : ''}`}
          animate={{ left: `${Math.min(progresso, 97)}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 14 }}
          style={{ left: `${Math.min(progresso, 97)}%` }}
        >
          <span className="carro-emoji" style={{ filter: baseFilter }}>🏎️</span>
        </motion.div>

      </div>

      <p className="corrida-percentual">{progresso.toFixed(0)}%</p>

      <AnimatePresence>
        {bateuMeta && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: '0.7rem', color: '#facc15', marginTop: 2 }}
          >
            🎉 {nome} bateu a meta!
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function Corrida({ vendedores = [] }) {
  const ranking = [...vendedores].sort((a, b) => b.percentual - a.percentual)
  return (
    <div>
      <AnimatePresence>
        {ranking.map((v, index) => (
          <CorridaItem
            key={v.id ?? v.nome}
            nome={v.nome}
            percentual={v.percentual}
            index={index}
            cor={v.cor}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
