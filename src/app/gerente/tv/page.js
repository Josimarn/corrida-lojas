'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-browser'
import { getMonthDateKeys, calcScore, aggregateLancamentos, fmtPct } from '@/lib/helpers'

const TODAY = new Date()

/* =========================
   🎙️ NARRADOR TV
========================= */

function narrar(frase) {
  if (typeof window === 'undefined') return
  const speech = new SpeechSynthesisUtterance(frase)
  speech.lang  = 'pt-BR'
  speech.rate  = 1.05
  const voices = window.speechSynthesis.getVoices()
  const voz    = voices.find(v => v.lang.includes('pt-BR'))
  if (voz) speech.voice = voz
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(speech)
}

/* =========================
   🧠 INTELIGÊNCIA
========================= */

function gerarComentario(ranking) {
  if (!ranking.length) return ''
  const lider = ranking[0]
  return `${lider.nome} lidera a corrida com ${lider.percentual.toFixed(0)} por cento`
}

function detectarClima() {
  const hoje    = new Date().getDate()
  const diasMes = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0).getDate()
  return (diasMes - hoje) <= 5 ? 'final' : 'normal'
}

/* =========================
   🎨 CORES F1
========================= */

const coresF1 = [
  'from-yellow-400 to-orange-500',
  'from-slate-400 to-slate-300',
  'from-amber-700 to-amber-500',
  'from-indigo-500 to-purple-500',
  'from-green-500 to-emerald-400',
]

const corTexto = [
  '#facc15', // amarelo — 1º
  '#94a3b8', // prata   — 2º
  '#b45309', // bronze  — 3º
  '#818cf8', // índigo  — 4º
  '#34d399', // verde   — 5º
]

const carros = [
  '/cars/f1-red.svg',
  '/cars/f1-blue.svg',
  '/cars/f1-yellow.svg',
  '/cars/f1-green.svg',
  '/cars/f1-purple.svg',
]

/* =========================
   📺 PÁGINA TV GERENTE
========================= */

export default function GerenteTVPage() {
  const supabase = createClient()
  const [ranking,    setRanking]    = useState([])
  const [nomeLoja,   setNomeLoja]   = useState('')
  const [nomeEmpresa,setNomeEmpresa]= useState('')
  const [alerta,     setAlerta]     = useState(null)
  const [prevOrder,  setPrevOrder]  = useState([])

  const clima = detectarClima()

  const audioRef    = useRef(null)   // overtake.mp3
  const audioNormal = useRef(null)   // race-bg.mp3
  const audioFinal  = useRef(null)   // final-lap.mp3
  const prevScores  = useRef({})     // scores anteriores por vendedor
  const engineRefs  = useRef({})     // audio engine por vendedor

  /* ── Carrega dados ── */
  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: lgs } = await supabase.from('loja_gerentes')
      .select('loja_id, lojas(id, nome, empresas(nome))').eq('usuario_id', user.id)
    if (!lgs?.length) return

    const loja = lgs[0].lojas
    setNomeLoja(loja?.nome || '')
    setNomeEmpresa(loja?.empresas?.nome || '')

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

  /* ── Som de motor individual por aceleração ── */
  useEffect(() => {
    ranking.forEach(v => {
      const prev  = prevScores.current[v.id] || 0
      if (v.percentual > prev) {
        const audio = engineRefs.current[v.id]
        if (audio) {
          audio.currentTime = 0
          audio.volume = Math.min(0.2 + (v.percentual / 100) * 0.6, 0.8)
          audio.play().catch(() => {})
        }
      }
      prevScores.current[v.id] = v.percentual
    })
  }, [ranking])

  /* ── Trilha sonora ── */
  useEffect(() => {
    if (clima === 'normal') {
      audioFinal.current?.pause()
      if (audioNormal.current) {
        audioNormal.current.volume = 0.3
        audioNormal.current.play().catch(() => {})
      }
    } else {
      audioNormal.current?.pause()
      if (audioFinal.current) {
        audioFinal.current.volume = 0.6
        audioFinal.current.play().catch(() => {})
      }
      narrar('Atenção! Reta final do campeonato!')
    }
  }, [clima])

  /* ── Realtime + polling ── */
  useEffect(() => {
    carregarDados()
    const channel = supabase.channel('tv-gerente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, carregarDados)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  /* ── Detecta ultrapassagem ── */
  useEffect(() => {
    if (!prevOrder.length) {
      setPrevOrder(ranking.map(r => r.id))
      return
    }

    const curOrder = ranking.map(r => r.id)

    ranking.forEach((r, i) => {
      const antes = prevOrder.indexOf(r.id)
      if (antes !== -1 && antes > i) {
        const msg = `${r.nome} ganhou posição!`
        setAlerta(msg)
        narrar(msg)
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
        setTimeout(() => setAlerta(null), 3500)
      }
    })

    setPrevOrder(curOrder)
  }, [ranking])

  /* ── Comentário automático a cada 15s ── */
  useEffect(() => {
    if (!ranking.length) return
    const intervalo = setInterval(() => {
      const comentario = gerarComentario(ranking)
      if (comentario) narrar(comentario)
    }, 15000)
    return () => clearInterval(intervalo)
  }, [ranking])

  /* ── Fullscreen ao clicar ── */
  useEffect(() => {
    function entrarFull() {
      if (document.documentElement.requestFullscreen)
        document.documentElement.requestFullscreen().catch(() => {})
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
    <div className="h-screen w-full bg-black text-white flex flex-col relative overflow-hidden select-none">

      <audio ref={audioRef}    src="/sounds/overtake.mp3"  preload="auto" />
      <audio ref={audioNormal} src="/sounds/race-bg.mp3"   preload="auto" loop />
      <audio ref={audioFinal}  src="/sounds/final-lap.mp3" preload="auto" loop />

      {/* Fundo gradiente animado */}
      <motion.div
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-black to-purple-900"
      />

      {/* 📺 Header */}
      <div className="relative z-10 flex justify-between items-center px-10 pt-6 pb-2 border-b border-white/10">
        <motion.h1
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold tracking-tight"
        >
          🏁 CORRIDA DOS VENDEDORES
        </motion.h1>
        <div className="text-right">
          <p className="text-lg text-indigo-300">{nomeLoja}</p>
          <p className="text-yellow-400 font-bold text-sm mt-0.5">
            👑 Líder: {ranking[0]?.nome} — {ranking[0]?.percentual.toFixed(1)}%
          </p>
        </div>
        <span className="text-red-500 animate-pulse font-bold text-sm">● AO VIVO</span>
      </div>

      {/* 🔥 Banner reta final */}
      {clima === 'final' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="relative z-10 bg-red-600 text-white text-center text-2xl font-extrabold py-2 tracking-widest"
        >
          🔥 FINAL DE CAMPEONATO — RETA FINAL!
        </motion.div>
      )}

      {/* 🚨 Breaking news */}
      <div className="relative z-10 px-10">
        <AnimatePresence>
          {alerta && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0,   opacity: 1 }}
              exit={{   y: -50, opacity: 0 }}
              className="bg-red-600 text-white px-5 py-3 mt-3 rounded-xl text-center text-2xl font-bold shadow-lg"
            >
              🚨 {alerta}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🏎️ Pista */}
      <div className="relative z-10 flex-1 flex flex-col justify-center gap-4 px-10 py-4">
        {top5.map((item, index) => {
          const score     = Math.min(item.percentual, 100)
          const bateuMeta = item.percentual >= 100
          const carSrc    = carros[index % carros.length]

          return (
            <div key={item.id} className="relative">

              {/* 🔊 Motor individual */}
              <audio
                ref={el => { engineRefs.current[item.id] = el }}
                src="/sounds/engine.mp3"
                preload="auto"
              />

              {/* Header */}
              <div className="flex justify-between text-sm mb-2">
                <span className={`font-semibold ${index === 0 ? 'text-yellow-300' : 'text-white'}`}>
                  {index === 0 ? '👑 ' : `${index + 1}º `}{item.nome}
                </span>
                <span className="font-bold" style={{ color: corTexto[index] || corTexto[4] }}>
                  {fmtPct(item.percentual)}{bateuMeta ? ' 🏆' : ''}
                </span>
              </div>

              {/* Pista */}
              <div className="relative h-24 bg-gradient-to-r from-[#0f172a] to-[#1e293b] rounded-full overflow-hidden border border-white/10">

                {/* Barra de progresso colorida */}
                <motion.div
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1 }}
                  className={`absolute top-0 left-0 h-full bg-gradient-to-r ${coresF1[index] || coresF1[4]} opacity-30 ${bateuMeta ? 'animate-pulse' : ''}`}
                />

                {/* Linha central */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/10" />

                {/* Labels */}
                <div className="absolute inset-0 flex justify-between px-4 text-[10px] text-white/20 items-end pb-1">
                  <span>Largada</span>
                  <span>50%</span>
                  <span>Meta</span>
                </div>

                {/* Rastro */}
                <motion.div
                  animate={{ opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute top-1/2 -translate-y-1/2 h-2 w-32 bg-white/10 blur-md"
                  style={{ left: `calc(${score}% - 120px)` }}
                />

                {/* Sombra do carro */}
                <div
                  className="absolute top-[62%] h-3 w-[110px] bg-black/50 blur-md rounded-full"
                  style={{ left: `calc(${score}% - 55px)` }}
                />

                {/* Carro F1 — scaleX(-1) aponta para a direita */}
                <motion.img
                  src={carSrc}
                  alt={item.nome}
                  animate={{ left: `calc(${score}% - 60px)` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 15 }}
                  style={{ transform: 'translateY(-50%) scaleX(-1)' }}
                  className="absolute top-1/2 w-[120px] z-20"
                  draggable={false}
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'inline-block' }}
                />
                {/* Fallback emoji — scaleX(-1) aponta para a direita */}
                <span
                  className="hidden absolute top-1/2 z-20 text-4xl"
                  style={{ left: `calc(${score}% - 24px)`, transform: 'translateY(-50%) scaleX(-1)' }}
                >🚗</span>

                {bateuMeta && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl z-30">🏁</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* 📊 Status */}
      <div className="relative z-10 flex justify-between items-center text-sm text-gray-400 px-10 pb-8">
        <span>📺 Clique para fullscreen</span>
        <span>📊 {ranking.filter(r => r.percentual >= 100).length} de {ranking.length} bateram a meta</span>
        <span className="text-gray-600">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* 📡 Ticker */}
      <div className="relative z-10 border-t border-white/10 bg-black overflow-hidden">
        <motion.div
          animate={{ x: ['100vw', '-100%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="whitespace-nowrap py-2 px-4 text-sm text-yellow-400"
        >
          🏁 Corrida em andamento • Atualização em tempo real • Performance das lojas ao vivo{nomeEmpresa ? ` • ${nomeEmpresa} 🚀` : ' 🚀'}
        </motion.div>
      </div>

    </div>
  )
}
