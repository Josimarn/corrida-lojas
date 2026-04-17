'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'
import Avatar from '@/components/Avatar'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getWeeksOfMonth, getMonthDateKeys, toDateKey, calcScore, aggregateLancamentos,
  fmtR, fmtN, fmtPct, MESES, MEDALS, getCor
} from '@/lib/helpers'

const TODAY = new Date()

/* ── inteligência ── */

function gerarMensagem(score) {
  if (score >= 100) return '🏆 Meta batida!'
  if (score >= 70)  return '🔥 Tá perto!'
  if (score >= 40)  return '⚠️ Dá pra melhorar'
  return '🚨 Precisa reagir'
}

function gerarInsight(score) {
  if (score >= 100) return '🏁 Você já bateu a meta!'
  if (score >= 70)  return '🎯 Continue nesse ritmo para bater a meta'
  if (score >= 40)  return '⚠️ Ritmo abaixo do ideal'
  return '🚨 Ritmo crítico — precisa reagir hoje'
}

function alertaHoje(vendasHoje, media) {
  if (!media) return ''
  return vendasHoje > media ? '🔥 Hoje você está acima da média' : '⚠️ Hoje está abaixo do esperado'
}

function calcularMetaPercentual(scoreAtual, diaAtual, diasTotais) {
  const restante      = Math.max(100 - scoreAtual, 0)
  const diasRestantes = Math.max(diasTotais - diaAtual + 1, 1)
  return { metaHoje: restante / diasRestantes, diasRestantes, faltaPercentual: restante }
}

function preverPercentual(scoreAtual, diaAtual, diasTotais) {
  const mediaAtual    = scoreAtual / Math.max(diaAtual, 1)
  const previsaoFinal = mediaAtual * diasTotais
  if (previsaoFinal >= 100) return '🔥 No ritmo atual você fecha o mês batendo a meta'
  return `🚨 No ritmo atual você fechará o mês com ${(100 - previsaoFinal).toFixed(1)}% abaixo da meta`
}

function preverUltrapassagem(ranking, vendedorId, scoreAtual, metaHoje) {
  const pos = ranking.findIndex(v => v.id === vendedorId)
  if (pos <= 0) return null
  const acima = ranking[pos - 1]
  return (acima.score - scoreAtual) <= metaHoje ? acima : null
}

function calcularStreak(vendasPorDia, metaHoje) {
  let streak = 0
  for (let i = vendasPorDia.length - 1; i >= 0; i--) {
    if (vendasPorDia[i] >= metaHoje) streak++
    else break
  }
  return streak
}

function getNivel(streak) {
  if (streak >= 10) return { nome: 'Lenda',    cor: 'text-yellow-400', icon: '👑' }
  if (streak >= 5)  return { nome: 'Pro',       cor: 'text-purple-400', icon: '🔥' }
  if (streak >= 3)  return { nome: 'Em ritmo',  cor: 'text-blue-400',   icon: '⚡' }
  return               { nome: 'Iniciante', cor: 'text-gray-400',   icon: '🌱' }
}

function getMensagemStreak(streak) {
  if (streak >= 10) return '👑 Você está dominando o jogo!'
  if (streak >= 5)  return '🔥 Continue assim!'
  if (streak >= 3)  return '⚡ Boa sequência!'
  return '🚀 Comece hoje!'
}

/* ── página ── */

export default function VendedorPage() {
  const router   = useRouter()
  const supabase = createClientComponent()

  // ── estado ──
  const [usuario,      setUsuario]      = useState(null)
  const [vendedor,     setVendedor]     = useState(null)
  const [loja,         setLoja]         = useState(null)
  const [metaLoja,     setMetaLoja]     = useState(null)
  const [metaMes,      setMetaMes]      = useState(null)
  const [lancamentos,  setLancamentos]  = useState([])
  const [semanas,      setSemanas]      = useState([])
  const [colegas,      setColegas]      = useState([])
  const [metasColegas, setMetasColegas] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [vY,           setVY]           = useState(TODAY.getFullYear())
  const [vM,           setVM]           = useState(TODAY.getMonth())
  const [ultrapassou,  setUltrapassou]  = useState(false)
  const [prevPos,      setPrevPos]      = useState(null)
  const audioRef = useRef(null)

  // ── data fetch ──
  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const [{ data: u }, { data: v }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('id', user.id).single(),
      supabase.from('vendedores').select('*').eq('usuario_id', user.id).eq('ativo', true).limit(1).maybeSingle(),
    ])
    setUsuario(u)
    if (!v) { setLoading(false); return }
    setVendedor(v)

    const monthKeys = getMonthDateKeys(vY, vM)
    const [{ data: l }, { data: ml }, { data: mm }, { data: lcs }, { data: vs }, { data: mvAll }] = await Promise.all([
      supabase.from('lojas').select('*').eq('id', v.loja_id).single(),
      supabase.from('metas_loja').select('*').eq('loja_id', v.loja_id).eq('ano', vY).eq('mes', vM + 1).maybeSingle(),
      supabase.from('metas_vendedor').select('*').eq('vendedor_id', v.id).eq('ano', vY).eq('mes', vM + 1).is('semana', null).maybeSingle(),
      supabase.from('lancamentos').select('*').eq('loja_id', v.loja_id).in('data', monthKeys),
      supabase.from('vendedores').select('id,nome,foto_url').eq('loja_id', v.loja_id).eq('ativo', true),
      supabase.from('metas_vendedor').select('*').eq('loja_id', v.loja_id).eq('ano', vY).eq('mes', vM + 1).is('semana', null),
    ])
    setLoja(l)
    setMetaLoja(ml)
    setMetaMes(mm)
    setLancamentos(lcs || [])
    setColegas(vs || [])
    setMetasColegas(mvAll || [])
    setLoading(false)
  }, [router, vY, vM])

  // ── cálculos (antes dos useEffects para evitar TDZ) ──
  const meusLcs      = lancamentos.filter(l => vendedor && l.vendedor_id === vendedor.id)
  const stats        = aggregateLancamentos(meusLcs)
  const pesos        = { peso_venda: metaLoja?.peso_venda || 40, peso_ticket: metaLoja?.peso_ticket || 30, peso_pa: metaLoja?.peso_pa || 30 }
  const mvMinha      = metasColegas.find(m => vendedor && m.vendedor_id === vendedor.id) || metaMes || {}
  const nVendAtivos  = colegas.length || 1
  const metaFallback = metaLoja?.meta_total > 0 ? metaLoja.meta_total / nVendAtivos : 0
  const meta         = {
    meta_venda:  mvMinha.meta_venda  || metaFallback,
    meta_ticket: mvMinha.meta_ticket || 0,
    meta_pa:     mvMinha.meta_pa     || 0,
  }
  const scored = calcScore(stats, meta, pesos)
  const idx    = colegas.findIndex(v => vendedor && v.id === vendedor.id)
  const c      = getCor(idx)

  const rankData = colegas.map((col, i) => {
    const lcs     = lancamentos.filter(l => l.vendedor_id === col.id)
    const st      = aggregateLancamentos(lcs)
    const mv      = metasColegas.find(m => m.vendedor_id === col.id) || {}
    const metaCol = { meta_venda: mv.meta_venda || 0, meta_ticket: mv.meta_ticket || 0, meta_pa: mv.meta_pa || 0 }
    const sc      = calcScore(st, metaCol, pesos)
    return { col, i, score: sc.score }
  }).sort((a, b) => b.score - a.score)

  const minhaPosicao = rankData.findIndex(r => vendedor && r.col.id === vendedor.id) + 1

  // ── hooks (minhaPosicao já está definido) ──
  useEffect(() => { load() }, [load])
  useEffect(() => { setSemanas(getWeeksOfMonth(vY, vM)) }, [vY, vM])
  useEffect(() => {
    if (prevPos !== null && minhaPosicao > 0 && minhaPosicao < prevPos) {
      setUltrapassou(true)
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      }
      setTimeout(() => setUltrapassou(false), 2500)
    }
    if (minhaPosicao > 0) setPrevPos(minhaPosicao)
  }, [minhaPosicao])

  function changeMonth(d) {
    let nm = vM + d, ny = vY
    if (nm > 11) { nm = 0; ny++ }
    if (nm < 0)  { nm = 11; ny-- }
    setVM(nm); setVY(ny)
  }

  // ── derivados para UI ──
  const atingiu   = scored.score >= 100
  const falta     = Math.max((meta.meta_venda || 0) - stats.vendas, 0)
  const todayKey  = toDateKey(TODAY)
  const vendasHoje  = meusLcs.filter(l => l.data === todayKey).reduce((s, l) => s + (l.vendas || 0), 0)
  const diasComVenda = [...new Set(meusLcs.filter(l => l.vendas > 0).map(l => l.data))].length
  const mediaDiaria  = diasComVenda > 0 ? stats.vendas / diasComVenda : 0

  const alertaDia = alertaHoje(vendasHoje, mediaDiaria)
  const mensagem  = gerarMensagem(scored.score)
  const insight   = gerarInsight(scored.score)

  const diasTotais    = new Date(vY, vM + 1, 0).getDate()
  const diaAtual      = vY === TODAY.getFullYear() && vM === TODAY.getMonth() ? TODAY.getDate() : diasTotais
  const { metaHoje, diasRestantes, faltaPercentual } = calcularMetaPercentual(scored.score, diaAtual, diasTotais)
  const previsao      = preverPercentual(scored.score, diaAtual, diasTotais)

  const rankingSimples = rankData.map(({ col, score: s }) => ({ id: col.id, nome: col.nome, score: s }))
  const rival          = vendedor ? preverUltrapassagem(rankingSimples, vendedor.id, scored.score, metaHoje) : null

  const vendasPorDia = Object.entries(
    meusLcs.reduce((acc, lc) => { acc[lc.data] = (acc[lc.data] || 0) + (lc.vendas || 0); return acc }, {})
  ).sort(([a], [b]) => a.localeCompare(b))
   .map(([, v]) => meta.meta_venda > 0 ? (v / meta.meta_venda) * 100 : 0)

  const streak         = calcularStreak(vendasPorDia, metaHoje)
  const nivel          = getNivel(streak)
  const mensagemStreak = getMensagemStreak(streak)

  // ── renders de loading/erro ──
  if (loading) return (
    <div className="min-h-screen bg-[#070F1F] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  )

  if (!vendedor) return (
    <div className="min-h-screen bg-[#070F1F] flex items-center justify-center p-4">
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 max-w-sm text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-semibold text-white">Perfil de vendedor não encontrado</p>
        <p className="text-sm text-gray-400 mt-1">Solicite ao gerente que vincule seu usuário.</p>
      </div>
    </div>
  )

  return (
    <motion.div
      animate={ultrapassou ? { x: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#070F1F] text-white"
    >

      <audio ref={audioRef} src="/sounds/overtake.mp3" preload="auto" />

      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-5 flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">🏁 Meu Desempenho</h1>
          <p className="text-sm text-gray-400">{loja?.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">Vendedor</span>
          <button onClick={() => router.replace('/')}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-all">
            Sair
          </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 pb-8 space-y-4">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-xl text-black"
          style={{ background: 'linear-gradient(135deg, #facc15 0%, #ea580c 100%)' }}
        >
          <div className="flex items-center gap-4">
            <img
              src={vendedor.foto_url || '/avatar.png'}
              alt={vendedor.nome}
              className="w-16 h-16 rounded-full border-2 border-white object-cover flex-shrink-0"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black/60">
                🏁 {minhaPosicao > 0 ? `${minhaPosicao}º lugar` : '—'}
              </p>
              <p className="text-3xl font-extrabold leading-tight">{fmtPct(scored.score)}</p>
              <p className="text-sm mt-0.5">{mensagem}</p>
            </div>
            <div className="text-4xl select-none">🏎️</div>
          </div>
          <div className="mt-4 h-3 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(scored.score, 100)}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-black/70 rounded-full"
            />
          </div>
          <p className="text-xs text-black/50 mt-2">{insight}</p>
        </motion.div>


        {/* Alerta do dia */}
        {alertaDia && (
          <div className="text-sm text-yellow-400 px-1">{alertaDia}</div>
        )}

        {/* Meta diária */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)' }}
        >
          <p className="text-xs text-white/70 mb-1">🎯 Precisa ganhar por dia</p>
          <p className="text-3xl font-extrabold leading-tight">+{metaHoje.toFixed(1)}%</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
            <span>📉 {faltaPercentual.toFixed(1)}% faltam na meta mensal</span>
            <span className="text-white/30">·</span>
            <span>📅 {diasRestantes} dia{diasRestantes !== 1 ? 's' : ''}</span>
          </div>
          {previsao && (
            <p className="text-xs text-white/50 mt-2 pt-2 border-t border-white/20">{previsao}</p>
          )}
          {rival && (
            <p className="text-xs text-white/80 font-medium mt-1">🏎️ Você pode ultrapassar {rival.nome}</p>
          )}
        </motion.div>

        {/* Pista de disputa direta */}
        {rival && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="p-5 bg-white/5 border border-white/10 rounded-xl"
          >
            <p className="text-xs text-gray-400 mb-3">🏁 Disputa direta — {rival.nome}</p>
            <div className="relative h-10 bg-black/40 rounded-full overflow-hidden">
              {/* rival */}
              <motion.div
                animate={{ left: `${Math.min(rival.score, 97)}%` }}
                transition={{ type: 'spring', stiffness: 80, damping: 14 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xl select-none"
              >
                🚗
              </motion.div>
              {/* você */}
              <motion.div
                animate={{ left: `${Math.min(scored.score, 97)}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 14 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 text-xl select-none"
              >
                🏎️
              </motion.div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{rival.nome}: {fmtPct(rival.score)}</span>
              <span>Você: {fmtPct(scored.score)}</span>
            </div>
          </motion.div>
        )}

        {/* Streak */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)' }}
        >
          <p className="text-xs text-white/70 mb-1">🎮 Sequência</p>
          <p className="text-3xl font-extrabold leading-tight">🔥 {streak} dia{streak !== 1 ? 's' : ''}</p>
          <p className={`text-sm mt-1 font-semibold ${nivel.cor}`}>{nivel.icon} {nivel.nome}</p>
          <p className="text-xs text-white/60 mt-2">{mensagemStreak}</p>
        </motion.div>

        {/* Nav mês */}
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">‹</button>
          <h2 className="text-base font-bold text-white">{MESES[vM]} {vY}</h2>
          <button onClick={() => changeMonth(1)}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">›</button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Venda',  value: fmtPct(scored.pv), sub: `meta ${fmtR(meta.meta_venda)}`,      color: c.fill,    pct: scored.pv },
            { label: 'Ticket', value: fmtPct(scored.pt), sub: `meta ${fmtR(meta.meta_ticket)}`,     color: c.border,  pct: scored.pt },
            { label: 'PA',     value: fmtPct(scored.pp), sub: `meta ${fmtN(meta.meta_pa, 1)} pçs`,  color: '#10b981', pct: scored.pp },
          ].map(({ label, value, sub, color, pct }) => (
            <motion.div key={label} whileHover={{ scale: 1.03 }}
              className="p-4 bg-white/5 rounded-xl flex flex-col items-center text-center border border-white/10">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-2xl font-black leading-none mb-2" style={{ color }}>{value}</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
              </div>
              <p className="text-xs text-gray-500">{sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Atendimentos', stats.atendimentos],
            ['Peças',        stats.pecas],
            ['Ticket Médio', fmtR(stats.ticket)],
          ].map(([l, v]) => (
            <div key={l} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-white">{v}</p>
              <p className="text-xs text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Semanas */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">Semanas</p>
          <div className="space-y-3">
            {semanas.map((semana, wi) => {
              const dias  = semana.filter(d => d.inMonth).map(d => d.key)
              const lcs   = meusLcs.filter(l => dias.includes(l.data))
              const total = lcs.reduce((a, l) => a + (l.vendas || 0), 0)
              const metaW = meta.meta_venda > 0 ? meta.meta_venda / semanas.length : 0
              const pct   = metaW > 0 ? Math.min(total / metaW * 100, 100) : 0
              const f  = semana.find(d => d.inMonth)
              const l2 = [...semana].reverse().find(d => d.inMonth)
              return (
                <div key={wi}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span className="font-medium">S{wi + 1} <span className="text-gray-600">({f?.date.getDate()}–{l2?.date.getDate()})</span></span>
                    <span className="font-bold" style={{ color: pct >= 100 ? '#10b981' : pct > 0 ? c.fill : '#4b5563' }}>{fmtPct(pct)}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c.fill }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ranking */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">🏁 Ranking da Loja</p>
          <div className="space-y-2">
            {rankData.map(({ col, i, score: s }, r) => {
              const isMe = vendedor && col.id === vendedor.id
              const cc   = getCor(i)
              return (
                <div key={col.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${isMe ? 'border border-white/20' : 'hover:bg-white/5'}`}
                  style={isMe ? { background: `${c.fill}25` } : {}}>
                  <span className="text-base min-w-[28px]">{MEDALS[r] || `${r + 1}º`}</span>
                  <Avatar nome={isMe ? col.nome : '?'} fotoUrl={isMe ? col.foto_url : null} index={i} size={28} />
                  <p className={`flex-1 text-sm truncate ${isMe ? 'font-extrabold text-white' : 'text-gray-600'}`}>
                    {isMe ? col.nome.split(' ')[0] : '— — —'}
                    {isMe && <span className="text-xs font-normal text-gray-500 ml-1">(você)</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full"
                        style={{ width: `${Math.min(s, 100)}%`, background: isMe ? cc.fill : 'rgba(255,255,255,0.15)' }} />
                    </div>
                    {isMe && (
                      <span className="text-xs font-bold w-12 text-right" style={{ color: cc.border }}>
                        {fmtPct(s)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* 💥 Efeito de ultrapassagem */}
      <AnimatePresence>
        {ultrapassou && (
          <>
            {/* Flash */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-yellow-400 z-50 pointer-events-none"
            />

            {/* Texto */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1.5 }}
              exit={{ scale: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            >
              <div className="text-5xl font-extrabold text-yellow-300 drop-shadow-lg">
                🏆 ULTRAPASSOU!
              </div>
            </motion.div>

            {/* Confete */}
            <div className="fixed inset-0 pointer-events-none z-50">
              {[...Array(25)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400) }}
                  animate={{ y: typeof window !== 'undefined' ? window.innerHeight : 800, opacity: 0 }}
                  transition={{ duration: 1 + Math.random() }}
                  className="absolute w-2 h-2 bg-yellow-300 rounded"
                />
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  )
}
