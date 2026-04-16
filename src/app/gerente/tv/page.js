'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { getMonthDateKeys, calcScore, aggregateLancamentos } from '@/lib/helpers'

const TODAY = new Date()

export default function GerenteTVPage() {
  const supabase = createClient()
  const [ranking, setRanking] = useState([])
  const [nomeLoja, setNomeLoja] = useState('')
  const [alerta, setAlerta] = useState(null)

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: lgs } = await supabase.from('loja_gerentes')
      .select('loja_id, lojas(id, nome)').eq('usuario_id', user.id)
    if (!lgs?.length) return

    const loja = lgs[0].lojas
    setNomeLoja(loja?.nome || '')

    const mes       = TODAY.getMonth()
    const ano       = TODAY.getFullYear()
    const monthKeys = getMonthDateKeys(ano, mes)

    const { data: vs }  = await supabase.from('vendedores').select('id, nome').eq('loja_id', loja.id).eq('ativo', true)
    const { data: lcs } = await supabase.from('lancamentos').select('*').eq('loja_id', loja.id).in('data', monthKeys)
    const { data: ml }  = await supabase.from('metas_loja').select('*').eq('loja_id', loja.id).eq('ano', ano).eq('mes', mes + 1).maybeSingle()
    const { data: mvs } = await supabase.from('metas_vendedor').select('*').eq('loja_id', loja.id).eq('ano', ano).eq('mes', mes + 1).is('semana', null)

    const pesos = { peso_venda: ml?.peso_venda || 40, peso_ticket: ml?.peso_ticket || 30, peso_pa: ml?.peso_pa || 30 }

    const novoRanking = (vs || []).map(v => {
      const lcsV = (lcs || []).filter(l => l.vendedor_id === v.id)
      const st   = aggregateLancamentos(lcsV)
      const mv   = (mvs || []).find(m => m.vendedor_id === v.id) || {}
      const meta = { meta_venda: mv.meta_venda || 0, meta_ticket: mv.meta_ticket || 0, meta_pa: mv.meta_pa || 0 }
      const calc = calcScore(st, meta, pesos)
      return { id: v.id, nome: v.nome, percentual: calc.score }
    }).sort((a, b) => b.percentual - a.percentual)

    setRanking(novoRanking)
  }

  useEffect(() => {
    carregarDados()
    const channel = supabase.channel('tv-gerente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, carregarDados)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    if (!ranking.length) return
    const interval = setInterval(() => {
      const r = ranking[Math.floor(Math.random() * ranking.length)]
      const msgs = [`🚀 ${r.nome} acelerou!`, `🔥 ${r.nome} reagiu!`, `⚡ ${r.nome} está na frente!`]
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
        className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-black to-purple-900" />

      <div className="relative text-center mb-8 z-10">
        <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}
          className="text-5xl font-extrabold tracking-tight">🏁 CORRIDA DOS VENDEDORES</motion.h1>
        <p className="text-lg text-indigo-300 mt-1">{nomeLoja}</p>
        <p className="text-xl text-yellow-400 mt-2">
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
                  className={`h-full ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : index === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-300' : index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'} ${bateuMeta ? 'animate-pulse' : ''}`} />
                <motion.div animate={{ left: `${Math.min(pct, 97)}%` }} transition={{ type: 'spring', stiffness: 100, damping: 14 }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2">
                  <motion.span animate={{ scaleX: [-1,-1], rotate: [0,8,-6,4,0], y: [0,-1,1,-1,0] }} transition={{ duration: 0.6, repeat: Infinity }}
                    style={{ display: 'inline-block', scaleX: -1, fontSize: 28 }}>🚗</motion.span>
                </motion.div>
                {bateuMeta && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-2xl">🏁</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="relative text-center z-10 flex justify-between items-center text-sm text-gray-400 mt-4">
        <span>📺 Clique para fullscreen</span>
        <span>📊 {ranking.filter(r => r.percentual >= 100).length} de {ranking.length} vendedores bateram a meta</span>
        <span className="text-gray-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  )
}
