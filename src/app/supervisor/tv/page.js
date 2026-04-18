'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { getMonthDateKeys } from '@/lib/helpers'

const TODAY = new Date()

export default function SupervisorTVPage() {
  const supabase = createClient()
  const [ranking, setRanking] = useState([])
  const [alerta, setAlerta] = useState(null)

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: ls } = await supabase.from('loja_supervisores')
      .select('loja_id, lojas(id, nome, codigo)').eq('usuario_id', user.id)
    const lojas = (ls || []).map(r => r.lojas).filter(Boolean)

    const mes       = TODAY.getMonth()
    const ano       = TODAY.getFullYear()
    const monthKeys = getMonthDateKeys(ano, mes)
    const novoRanking = []

    for (const loja of lojas) {
      const { data: lcs } = await supabase.from('lancamentos').select('vendas').eq('loja_id', loja.id).in('data', monthKeys)
      const { data: ml }  = await supabase.from('metas_loja').select('meta_total,meta_loja').eq('loja_id', loja.id).eq('ano', ano).eq('mes', mes + 1).maybeSingle()
      const metaRef     = (ml?.meta_loja ?? 0) > 0 ? ml.meta_loja : (ml?.meta_total ?? 0)
      const totalVendas = (lcs || []).reduce((s, l) => s + (l.vendas || 0), 0)
      const percentual  = metaRef > 0 ? Math.round(totalVendas / metaRef * 1000) / 10 : 0
      novoRanking.push({ id: loja.id, nome: loja.nome, codigo: loja.codigo, percentual })
    }

    novoRanking.sort((a, b) => b.percentual - a.percentual)
    setRanking(novoRanking)
  }

  useEffect(() => {
    carregarDados()
    const channel = supabase.channel('tv-sup')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, carregarDados)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (!ranking.length) return
    const interval = setInterval(() => {
      const r = ranking[Math.floor(Math.random() * ranking.length)]
      const msgs = [`🚀 ${r.nome} acelerou!`, `🔥 ${r.nome} reagiu!`, `⚡ ${r.nome} está acelerando!`]
      setAlerta(msgs[Math.floor(Math.random() * msgs.length)])
      setTimeout(() => setAlerta(null), 3500)
    }, 7000)
    return () => clearInterval(interval)
  }, [ranking])

  useEffect(() => {
    function entrarFull() {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {})
    }
    window.addEventListener('click', entrarFull)
    return () => window.removeEventListener('click', entrarFull)
  }, [])

  const top5 = ranking.slice(0, 5)

  if (!ranking.length) return (
    <div className="h-screen w-full bg-black text-white flex items-center justify-center">
      <p className="text-gray-400 text-lg">Carregando corrida...</p>
    </div>
  )

  return (
    <div className="h-screen w-full bg-black text-white p-10 flex flex-col relative overflow-hidden select-none">
      <motion.div animate={{ opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 6, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900" />

      <div className="relative text-center mb-8 z-10">
        <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold tracking-tight">🏁 CORRIDA DAS LOJAS</motion.h1>
        <p className="text-xl text-yellow-400 mt-3">
          👑 Líder: <span className="font-bold">{ranking[0]?.nome}</span> — {ranking[0]?.percentual.toFixed(1)}%
        </p>
      </div>

      <AnimatePresence>
        {alerta && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="relative text-center text-3xl text-red-400 mb-4 z-10 font-semibold">{alerta}</motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 flex flex-col justify-center gap-6 z-10">
        {top5.map((item, index) => {
          const pct = Math.min(item.percentual, 100)
          const bateuMeta = item.percentual >= 100
          return (
            <div key={item.id}>
              <div className="flex justify-between items-center text-2xl mb-2">
                <span className={index === 0 ? 'text-yellow-300 font-bold' : 'text-gray-200'}>
                  {index === 0 ? '👑 ' : `${index + 1}º `}{item.nome}
                </span>
                <span className={`font-bold ${bateuMeta ? 'text-yellow-400' : index === 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {item.percentual.toFixed(1)}%{bateuMeta ? ' 🏆' : ''}
                </span>
              </div>
              <div className="relative h-12 bg-white/10 rounded-full overflow-hidden">
                {[25, 50, 75].map(p => <div key={p} className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: `${p}%` }} />)}
                <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 1 }}
                  className={`h-full ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : index === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-300' : index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'} ${bateuMeta ? 'animate-pulse' : ''}`} />
                <motion.div animate={{ left: `${Math.min(pct, 97)}%` }} transition={{ type: 'spring', stiffness: 100, damping: 14 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2">
                  <motion.span animate={{ scaleX: [-1,-1], rotate: [0,8,-6,4,0], y: [0,-1,1,-1,0] }} transition={{ duration: 0.6, repeat: Infinity }}
                    style={{ display: 'inline-block', scaleX: -1, fontSize: 32, filter: ['hue-rotate(40deg) saturate(2) brightness(1.1)','grayscale(1) brightness(1.8)','hue-rotate(20deg) saturate(2)','hue-rotate(200deg) saturate(1.5) brightness(1.3)','hue-rotate(120deg) saturate(1.5)'][index] ?? 'hue-rotate(120deg) saturate(1.5)' }}>🏎️</motion.span>
                </motion.div>
                {bateuMeta && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl">🏁</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="relative text-center z-10 flex justify-between items-center text-sm text-gray-400 mt-4">
        <span>📺 Clique para fullscreen</span>
        <span>📊 {ranking.filter(r => r.percentual >= 100).length} de {ranking.length} lojas bateram a meta</span>
        <span className="text-gray-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
