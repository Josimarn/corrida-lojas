'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { fmtR, fmtPct } from '@/lib/helpers'
import Link from 'next/link'

const TABS = [
  { key: 'lojas',      label: '🏁 Corrida',  activeClass: 'bg-white text-black' },
  { key: 'regionais',  label: '🗺️ Regional',  activeClass: 'bg-white text-black' },
  { key: 'diaria',     label: '📅 Diário',    activeClass: 'bg-white text-black' },
  { key: 'anual',      label: '📈 Anual',     activeClass: 'bg-white text-black' },
  { key: 'guerra',     label: '⚔️ Guerra',    activeClass: 'bg-red-600 text-white' },
]

function gerarInsights({ ranking, vendasHoje, vendasOntem, metaTotal }) {
  const insights = []

  if (vendasOntem > 0) {
    const variacao = ((vendasHoje - vendasOntem) / vendasOntem) * 100
    if (variacao > 10)       insights.push(`🔥 Acelerando (${variacao.toFixed(0)}% vs ontem)`)
    else if (variacao < -10) insights.push(`🚨 Queda forte (${Math.abs(variacao).toFixed(0)}% vs ontem)`)
  }

  if (ranking?.length) insights.push(`🏁 ${ranking[0].nome} lidera o ranking`)

  const abaixo = (ranking || []).filter(r => r.percentual < 50).length
  if (abaixo > 0) insights.push(`⚠️ ${abaixo} loja${abaixo > 1 ? 's' : ''} abaixo de 50%`)

  const totalVendas = (ranking || []).reduce((acc, r) => acc + (r.totalVendas || 0), 0)
  const atingimento = metaTotal > 0 ? (totalVendas / metaTotal) * 100 : 0
  if (atingimento > 0 && atingimento < 60) insights.push('🚨 Meta do mês em risco')

  return insights.slice(0, 3)
}

function InsightsBar({ insights }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (insights.length <= 1) return
    const t = setInterval(() => setIdx(i => (i + 1) % insights.length), 4000)
    return () => clearInterval(t)
  }, [insights.length])

  if (!insights.length) return null

  return (
    <div className="mt-3 h-7 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0,  opacity: 1 }}
          exit={{   y: -14, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="text-sm text-gray-300 flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
          {insights[idx]}
          {insights.length > 1 && (
            <span className="text-xs text-gray-500 ml-1">{idx + 1}/{insights.length}</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function HeaderAbsurdo({
  totalVendas    = 0,
  metaTotal      = 0,
  atingimento    = 0,
  vendedores     = 0,
  ranking        = [],
  mesLabel       = '',
  visao          = 'lojas',
  setVisao,
  onPrev,
  onNext,
  onSair,
  vendasHoje     = 0,
  vendasOntem    = 0,
  // Props de personalização por perfil
  titulo         = '🏁 Diretoria',
  subtitulo      = null,          // se null, usa contagem de lojas
  perfil         = 'Dono',
  perfilCor      = 'bg-purple-500/20 text-purple-300',
  labelVendas    = 'Vendas da Rede',
  labelMeta      = 'Meta da Rede',
  labelAting     = 'rede geral',
  labelVend      = 'Vendedores',
  tvHref         = '/dono/tv',
  tabs           = TABS,
  // Props opcionais para cards duplos (gerente)
  atingimentoLoja = null,
  atingimentoVend = null,
  metaTotalVend   = null,   // meta dos vendedores (quando diferente de metaTotal)
}) {
  const insights = gerarInsights({ ranking, vendasHoje, vendasOntem, metaTotal })

  const subtext = subtitulo !== null
    ? subtitulo
    : `${ranking.length} loja${ranking.length !== 1 ? 's' : ''} ativa${ranking.length !== 1 ? 's' : ''} • atualização em tempo real`

  return (
    <div className="mb-6">

      {/* TOPO */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{titulo}</h1>
          <p className="text-sm text-gray-400">{subtext}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${perfilCor}`}>
            {perfil}
          </span>
          <button onClick={onSair} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-all">
            Sair
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-400">{labelVendas}</p>
          <p className="text-xl font-bold text-green-400">{fmtR(totalVendas)}</p>
          {vendasHoje > 0
            ? <p className="text-xs text-gray-500">hoje: {fmtR(vendasHoje)}</p>
            : <p className="text-xs text-gray-500">no mês</p>
          }
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-400">{labelMeta}</p>
          {metaTotalVend !== null ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">🏬 Loja:</span>
                <span className="text-base font-bold text-white leading-none">{fmtR(metaTotal)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">🧑‍💼 Vend.:</span>
                <span className="text-base font-bold text-white leading-none">{fmtR(metaTotalVend)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xl font-bold text-white">{fmtR(metaTotal)}</p>
          )}
          <p className="text-xs text-gray-500">no mês</p>
        </motion.div>

        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className={`p-4 rounded-xl border ${
            atingimento >= 70 ? 'bg-green-500/10 border-green-400/30'
            : atingimento >= 40 ? 'bg-yellow-500/10 border-yellow-400/30'
            : 'bg-red-500/10 border-red-400/30'
          }`}
        >
          <p className="text-xs text-gray-400">Atingimento</p>
          {atingimentoLoja !== null && atingimentoVend !== null ? (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400">🏬</span>
                <span className={`text-lg font-extrabold leading-none ${
                  atingimentoLoja >= 70 ? 'text-green-400' : atingimentoLoja >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>{fmtPct(atingimentoLoja)}</span>
                <span className="text-xs text-gray-500">(meta da loja)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-400">🧑‍💼</span>
                <span className={`text-lg font-extrabold leading-none ${
                  atingimentoVend >= 70 ? 'text-green-400' : atingimentoVend >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>{fmtPct(atingimentoVend)}</span>
                <span className="text-xs text-gray-500">(meta da equipe)</span>
              </div>
            </div>
          ) : (
            <p className={`text-2xl font-extrabold ${
              atingimento >= 70 ? 'text-green-400' : atingimento >= 40 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {fmtPct(atingimento)}
            </p>
          )}
          <p className="text-xs text-gray-500">{labelAting}</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-400">{labelVend}</p>
          <p className="text-xl font-bold text-white">{vendedores}</p>
          <p className="text-xs text-gray-500">ativos</p>
        </motion.div>

      </div>

      {/* INSIGHTS */}
      <InsightsBar insights={insights} />

      {/* CONTROLES MÊS + TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        {visao !== 'anual' && (
          <div className="flex items-center gap-2">
            <button onClick={onPrev} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white transition-all">◀</button>
            <span className="font-semibold text-white">{mesLabel}</span>
            <button onClick={onNext} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white transition-all">▶</button>
          </div>
        )}
        {visao === 'anual' && <div />}

        <div className="flex gap-2 flex-wrap">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setVisao?.(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                visao === tab.key ? tab.activeClass : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}>
              {tab.label}
            </button>
          ))}
          {tvHref && (
            <Link href={tvHref} target="_blank"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/20 transition-all">
              📺 TV
            </Link>
          )}
        </div>
      </div>

    </div>
  )
}
