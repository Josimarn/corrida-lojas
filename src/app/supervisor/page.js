'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import HeaderAbsurdo from '@/components/HeaderAbsurdo'
import RaceTrack from '@/components/RaceTrack'
import ScoreCard from '@/components/ScoreCard'
import CardsDesempenho from '@/components/CardsDesempenho'
import RankingAbsurdo from '@/components/RankingAbsurdo'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  getWeeksOfMonth, getMonthDateKeys, toDateKey, calcScore, aggregateLancamentos,
  fmtR, fmtPct, MESES, MEDALS, getCor, getWeekNumber, applyWeekPos
} from '@/lib/helpers'

function SalaDeGuerra({ lojas, lojaData, supabase }) {
  const audioRef = useRef(null)
  const [alerta, setAlerta] = useState(null)
  const [liderAtual, setLiderAtual] = useState(null)

  function tocarSom() {
    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}) }
  }

  const ranking = [...lojas].map(loja => {
    const d = lojaData[loja.id] || { lancamentos: [], metaLoja: null }
    const totalVendas = d.lancamentos.reduce((s, l) => s + (l.vendas || 0), 0)
    const percentual  = d.metaLoja?.meta_total > 0 ? Math.round(totalVendas / d.metaLoja.meta_total * 1000) / 10 : 0
    return { id: loja.id, nome: loja.nome, codigo: loja.codigo, percentual }
  }).sort((a, b) => b.percentual - a.percentual)

  useEffect(() => {
    if (!ranking.length) return
    const novoLider = ranking[0]
    if (liderAtual && liderAtual.id !== novoLider.id) {
      setAlerta(`🚨 ${novoLider.nome} assumiu a liderança!`)
      tocarSom()
      setTimeout(() => setAlerta(null), 3000)
    }
    setLiderAtual(novoLider)
  }, [lojaData])

  useEffect(() => {
    const channel = supabase.channel('guerra-sup')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos' }, () => tocarSom())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [supabase])

  return (
    <div className="bg-[#0f172a] rounded-xl p-6 shadow-xl space-y-4 relative text-white">
      <audio ref={audioRef} src="/som.mp3" preload="none" />
      <AnimatePresence>
        {alerta && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-5 py-2 rounded-lg shadow-lg z-50 text-sm font-semibold whitespace-nowrap">
            {alerta}
          </motion.div>
        )}
      </AnimatePresence>
      <h2 className="text-lg font-bold flex items-center gap-2">
        ⚔️ Sala de Guerra — Ranking ao Vivo
        <span className="text-xs font-normal text-white/40 ml-1">tempo real</span>
      </h2>
      {ranking.map((item, index) => {
        const bateuMeta = item.percentual >= 100
        return (
          <motion.div key={item.id} layout className={`p-3 rounded-lg transition-all ${index === 0 ? 'bg-yellow-500/10 border border-yellow-400/30' : 'bg-white/5 border border-white/10'}`}>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40 w-4">{index + 1}</span>
                <span className="text-lg">{['🥇','🥈','🥉'][index] ?? null}</span>
                {item.codigo && <div className="w-7 h-7 rounded-full bg-white text-black text-xs flex items-center justify-center font-bold">{String(item.codigo).slice(0,3)}</div>}
                <span className="text-sm font-semibold">{item.nome}</span>
              </div>
              <span className={`font-bold text-sm ${bateuMeta ? 'text-yellow-400' : 'text-green-400'}`}>{item.percentual.toFixed(1)}%{bateuMeta && ' 🏆'}</span>
            </div>
            <div className="w-full h-6 bg-white/10 rounded-full relative overflow-hidden">
              <motion.div animate={{ width: `${Math.min(item.percentual, 100)}%` }} transition={{ duration: 0.8 }}
                className={`h-full bg-gradient-to-r ${index === 0 ? 'from-yellow-400 to-orange-500' : index === 1 ? 'from-slate-400 to-slate-300' : index === 2 ? 'from-amber-700 to-amber-500' : 'from-purple-500 to-blue-500'} ${bateuMeta ? 'animate-pulse' : ''}`} />
              <motion.div animate={{ left: `${Math.min(item.percentual, 98)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 12, mass: 0.8 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2">
                <motion.span animate={{ scaleX: [-1,-1], rotate: [0,8,-6,4,0], y: [0,-1,1,-1,0] }} transition={{ duration: 0.6, repeat: Infinity }}
                  style={{ display: 'inline-block', scaleX: -1 }} className="text-lg">🚗</motion.span>
              </motion.div>
              {bateuMeta && <div className="absolute right-2 top-1 text-sm">🏁</div>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function LojaCard({ loja, dados, index }) {
  const c = getCor(index)
  const lcs    = dados.lancamentos || []
  const meta   = dados.metaLoja
  const st     = aggregateLancamentos(lcs)
  const pv = meta?.meta_total > 0 ? (st.vendas / meta.meta_total) * 100 : 0
  const score = Math.round(pv * 10) / 10
  const atingiu = score >= 100

  function MetricBar({ label, pct, value, metaVal, color }) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{label}</span>
          <span className="font-semibold" style={{ color }}>{fmtPct(pct)}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
        </div>
        <div className="text-xs text-gray-500">{value} / {metaVal}</div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-xl border ${atingiu ? 'border-green-400/30 bg-green-500/10' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: c.bg, color: c.border }}>
          {loja.nome.split(' ').map(w => w[0]).join('').slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-white truncate">{loja.nome}</p>
          {loja.cidade && <p className="text-xs text-gray-400">{loja.cidade}</p>}
          {atingiu && <span className="text-xs font-bold text-green-400">Meta atingida! 🏆</span>}
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-extrabold" style={{ color: c.border }}>{fmtPct(score)}</p>
          <p className="text-xs text-gray-400">score</p>
        </div>
      </div>

      <div className="space-y-3">
        <MetricBar label="Venda"
          pct={pv} value={fmtR(st.vendas)} metaVal={fmtR(meta?.meta_total || 0)} color={c.fill} />
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-white/10">
        <div className="text-center">
          <p className="text-xs text-gray-400">Atend.</p>
          <p className="text-sm font-bold text-white">{st.atendimentos}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Peças</p>
          <p className="text-sm font-bold text-white">{st.pecas}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Ticket</p>
          <p className="text-sm font-bold text-white">{fmtR(st.ticket)}</p>
        </div>
      </div>
    </div>
  )
}

const TABS_SUPERVISOR = [
  { key: 'lojas',      label: '🏪 Corrida',   activeClass: 'bg-white text-black' },
  { key: 'vendedores', label: '👤 Vendedores', activeClass: 'bg-white text-black' },
  { key: 'diaria',     label: '📅 Diário',    activeClass: 'bg-white text-black' },
  { key: 'anual',      label: '📈 Anual',     activeClass: 'bg-white text-black' },
  { key: 'guerra',     label: '⚔️ Guerra',    activeClass: 'bg-red-600 text-white' },
]

const TODAY = new Date()

export default function SupervisorPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [usuario,  setUsuario]  = useState(null)
  const [lojas,    setLojas]    = useState([])
  const [lojaData, setLojaData] = useState({})
  const [selLoja,  setSelLoja]  = useState(null)
  const [visao,    setVisao]    = useState('lojas') // 'lojas' | 'vendedores' | 'diaria' | 'anual' | 'guerra'
  const [loading,  setLoading]  = useState(true)
  const [vY, setVY] = useState(TODAY.getFullYear())
  const [vM, setVM] = useState(TODAY.getMonth())
  const [semanas,  setSemanas]  = useState([])
  const [selD,     setSelD]     = useState(toDateKey(TODAY))
  const [selDs,    setSelDs]    = useState([toDateKey(TODAY)])
  const [anossel,  setAnosSel]  = useState([TODAY.getFullYear()])
  const [dadosAnual, setDadosAnual] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)

    const { data: ls } = await supabase.from('loja_supervisores')
      .select('loja_id, lojas(*)').eq('usuario_id', user.id)
    const minhasLojas = (ls || []).map(r => r.lojas).filter(Boolean)
    setLojas(minhasLojas)
    if (minhasLojas.length > 0 && !selLoja) setSelLoja(minhasLojas[0].id)

    const monthKeys = getMonthDateKeys(vY, vM)
    const dados = {}

    for (const loja of minhasLojas) {
      const { data: vs }  = await supabase.from('vendedores').select('*').eq('loja_id', loja.id).eq('ativo', true).order('nome')
      const { data: ml }  = await supabase.from('metas_loja').select('*').eq('loja_id', loja.id).eq('ano', vY).eq('mes', vM + 1).maybeSingle()
      const { data: lcs } = await supabase.from('lancamentos').select('*').eq('loja_id', loja.id).in('data', monthKeys)
      const { data: mvs } = await supabase.from('metas_vendedor').select('*').eq('loja_id', loja.id).eq('ano', vY).eq('mes', vM + 1).is('semana', null)
      const pesos = { peso_venda: ml?.peso_venda || 40, peso_ticket: ml?.peso_ticket || 30, peso_pa: ml?.peso_pa || 30 }
      const scores = {}
      const weekNumber = getWeekNumber(vY, vM)
      ;(vs || []).forEach(v => {
        const st   = aggregateLancamentos((lcs || []).filter(l => l.vendedor_id === v.id))
        const mv   = (mvs || []).find(m => m.vendedor_id === v.id) || {}
        const meta = { meta_venda: mv.meta_venda || 0, meta_ticket: mv.meta_ticket || 0, meta_pa: mv.meta_pa || 0 }
        const calc = calcScore(st, meta, pesos)
        scores[v.id] = { ...calc, scoreDisplay: calc.score, score: applyWeekPos(calc.score, weekNumber), stats: st, pesos }
      })
      dados[loja.id] = { vendedores: vs || [], scores, metaLoja: ml, metasVendedor: mvs || [], lancamentos: lcs || [] }
    }
    setLojaData(dados)
    setLoading(false)
  }, [router, vY, vM])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const wks = getWeeksOfMonth(vY, vM)
    setSemanas(wks)
  }, [vY, vM])

  const loadAnual = useCallback(async (anos, lojaIds) => {
    if (!lojaIds?.length) return
    const resultado = {}
    for (const ano of anos) {
      resultado[ano] = {}
      for (let mes = 1; mes <= 12; mes++) {
        const keys = getMonthDateKeys(ano, mes - 1)
        const porLoja = {}
        for (const lojaId of lojaIds) {
          const { data: lcs } = await supabase.from('lancamentos').select('vendas').eq('loja_id', lojaId).in('data', keys)
          const { data: ml }  = await supabase.from('metas_loja').select('meta_total').eq('loja_id', lojaId).eq('ano', ano).eq('mes', mes).maybeSingle()
          porLoja[lojaId] = { vendas: (lcs || []).reduce((s, l) => s + (l.vendas || 0), 0), meta: ml?.meta_total || 0 }
        }
        const totalVendas = Object.values(porLoja).reduce((s, d) => s + d.vendas, 0)
        const totalMeta   = Object.values(porLoja).reduce((s, d) => s + d.meta, 0)
        resultado[ano][mes] = { vendas: totalVendas, meta: totalMeta, porLoja }
      }
    }
    setDadosAnual(resultado)
  }, [supabase])

  useEffect(() => {
    if (visao === 'anual' && lojas.length > 0) loadAnual(anossel, lojas.map(l => l.id))
  }, [visao, anossel, lojas, loadAnual])

  function changeMonth(d) {
    let nm = vM + d, ny = vY
    if (nm > 11) { nm = 0; ny++ }
    if (nm < 0)  { nm = 11; ny-- }
    setVM(nm); setVY(ny)
    setSelDs([toDateKey(new Date(ny, nm, new Date().getDate()))])
  }

  // Score por loja (para a pista de lojas)
  const lojasParaPista = lojas.map(l => ({ id: l.id, nome: l.nome, foto_url: null }))
  const scoresLojas = {}
  const weekNumberLojas = getWeekNumber(vY, vM)
  lojas.forEach(loja => {
    const d = lojaData[loja.id] || { lancamentos: [], metaLoja: null }
    const tv = d.lancamentos.reduce((s, l) => s + (l.vendas || 0), 0)
    const meta = d.metaLoja?.meta_total || 0
    const rawScore = meta > 0 ? Math.round((tv / meta) * 1000) / 10 : 0
    scoresLojas[loja.id] = { scoreDisplay: rawScore, score: applyWeekPos(rawScore, weekNumberLojas) }
  })

  const dadosLojaSel = lojaData[selLoja] || { vendedores: [], scores: {}, metaLoja: null, metasVendedor: [] }
  const todayKey = toDateKey(TODAY)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  )

  // ── KPIs para o header ──
  const todayKey2   = toDateKey(TODAY)
  const ontemDate   = new Date(TODAY); ontemDate.setDate(ontemDate.getDate() - 1)
  const ontemKey    = toDateKey(ontemDate)
  const totalVendas = lojas.reduce((s, l) => {
    const d = lojaData[l.id] || { lancamentos: [] }
    return s + d.lancamentos.reduce((ss, lc) => ss + (lc.vendas || 0), 0)
  }, 0)
  const metaTotal = lojas.reduce((s, l) => s + (lojaData[l.id]?.metaLoja?.meta_total || 0), 0)
  const atingimento = metaTotal > 0 ? (totalVendas / metaTotal) * 100 : 0
  const vendasHoje = lojas.reduce((s, l) => {
    const d = lojaData[l.id] || { lancamentos: [] }
    return s + d.lancamentos.filter(lc => lc.data === todayKey2).reduce((ss, lc) => ss + (lc.vendas || 0), 0)
  }, 0)
  const vendasOntem = lojas.reduce((s, l) => {
    const d = lojaData[l.id] || { lancamentos: [] }
    return s + d.lancamentos.filter(lc => lc.data === ontemKey).reduce((ss, lc) => ss + (lc.vendas || 0), 0)
  }, 0)
  const totalVendedores = lojas.reduce((s, l) => s + (lojaData[l.id]?.vendedores?.length || 0), 0)
  const rankingInsights = lojas.map(l => {
    const d = lojaData[l.id] || { lancamentos: [], metaLoja: null }
    const tv = d.lancamentos.reduce((s, lc) => s + (lc.vendas || 0), 0)
    const pct = d.metaLoja?.meta_total > 0 ? Math.round(tv / d.metaLoja.meta_total * 1000) / 10 : 0
    return { id: l.id, nome: l.nome, percentual: pct, totalVendas: tv }
  }).sort((a, b) => b.percentual - a.percentual)

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        <HeaderAbsurdo
          titulo="🗺️ Coordenação Regional"
          subtitulo={`${lojas.length} loja${lojas.length !== 1 ? 's' : ''} supervisionada${lojas.length !== 1 ? 's' : ''} • atualização em tempo real`}
          perfil="Coordenador"
          perfilCor="bg-blue-500/20 text-blue-300"
          totalVendas={totalVendas}
          metaTotal={metaTotal}
          atingimento={atingimento}
          vendedores={totalVendedores}
          ranking={rankingInsights}
          mesLabel={`${MESES[vM]} ${vY}`}
          visao={visao}
          setVisao={setVisao}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          onSair={() => router.replace('/')}
          vendasHoje={vendasHoje}
          vendasOntem={vendasOntem}
          labelVendas="Vendas da Regional"
          labelMeta="Meta da Regional"
          labelAting="regional no mês"
          labelVend="Vendedores"
          tvHref="/supervisor/tv"
          tabs={TABS_SUPERVISOR}
        />

        {/* ── VISÃO: CORRIDA DAS LOJAS ── */}
        {visao === 'lojas' && (
          <>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pista das Lojas — {MESES[vM]} {vY}</p>
              <RaceTrack vendedores={lojasParaPista} scores={scoresLojas} semanas={4} />
            </div>

            {(() => {
              const rankLojas = [...lojas].map(loja => {
                const d = lojaData[loja.id] || { lancamentos: [], metaLoja: null }
                const tv = d.lancamentos.reduce((s, l) => s + (l.vendas || 0), 0)
                const score = d.metaLoja?.meta_total > 0 ? Math.round(tv / d.metaLoja.meta_total * 1000) / 10 : 0
                return { id: loja.id, nome: loja.nome, percentual: score }
              }).sort((a, b) => b.percentual - a.percentual)

              const lojaDataEnriquecido = {}
              lojas.forEach(loja => {
                const d = lojaData[loja.id] || { lancamentos: [], metaLoja: null }
                lojaDataEnriquecido[loja.id] = { ...d, totalVendas: d.lancamentos.reduce((s, l) => s + (l.vendas || 0), 0) }
              })

              return (
                <>
                  <div className="bg-[#0f172a] rounded-xl p-5">
                    <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">Desempenho das Lojas</p>
                    <CardsDesempenho ranking={rankLojas} lojaData={lojaDataEnriquecido} />
                  </div>
                  <div className="bg-[#0f172a] rounded-xl p-5">
                    <RankingAbsurdo ranking={rankLojas} lojaData={lojaDataEnriquecido} />
                  </div>
                </>
              )
            })()}
          </>
        )}

        {/* ── VISÃO: VENDEDORES POR LOJA ── */}
        {visao === 'vendedores' && (
          <>
            <div className="flex flex-wrap gap-2">
              {lojas.map(l => (
                <button key={l.id} onClick={() => setSelLoja(l.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${l.id === selLoja ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>
                  {l.nome}
                  {l.cidade && <span className="text-xs opacity-60 ml-1">{l.cidade}</span>}
                </button>
              ))}
            </div>

            {selLoja && (
              <>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lojas.find(l => l.id === selLoja)?.nome} — Pista do Mês</p>
                    <span className="text-xs text-gray-400">
                      Meta: {dadosLojaSel.metaLoja ? fmtR(dadosLojaSel.metaLoja.meta_total) : '—'}
                    </span>
                  </div>
                  <RaceTrack vendedores={dadosLojaSel.vendedores} scores={dadosLojaSel.scores} semanas={4} />
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Desempenho dos Vendedores</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                    {[...dadosLojaSel.vendedores]
                      .map((v, i) => ({ v, i }))
                      .sort((a, b) => (dadosLojaSel.scores[b.v.id]?.scoreDisplay ?? 0) - (dadosLojaSel.scores[a.v.id]?.scoreDisplay ?? 0))
                      .map(({ v, i }) => {
                        const mv = dadosLojaSel.metasVendedor.find(m => m.vendedor_id === v.id) || {}
                        return (
                          <ScoreCard key={v.id}
                            vendedor={{ ...v, meta: { meta_venda: mv.meta_venda || 0, meta_ticket: mv.meta_ticket || 0, meta_pa: mv.meta_pa || 0 } }}
                            stats={dadosLojaSel.scores[v.id]?.stats}
                            scored={dadosLojaSel.scores[v.id]}
                            index={i} />
                        )
                      })}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Classificação</p>
                  <div className="space-y-2 mt-3">
                    {[...dadosLojaSel.vendedores]
                      .map((v, i) => ({ v, i, score: dadosLojaSel.scores[v.id]?.scoreDisplay ?? dadosLojaSel.scores[v.id]?.score ?? 0 }))
                      .sort((a, b) => b.score - a.score)
                      .map(({ v, i, score }, r) => {
                        const c = getCor(i)
                        return (
                          <div key={v.id} className="flex items-center gap-3 py-2 border-b border-white/10 last:border-0">
                            <span className="text-lg min-w-[24px]">{MEDALS[r] || `${r + 1}º`}</span>
                            <div className="flex-1 text-sm font-semibold text-white">{v.nome}</div>
                            <div className="text-base font-extrabold" style={{ color: c.border }}>{score.toFixed(1)}%</div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── VISÃO: CORRIDA DIÁRIA ── */}
        {visao === 'diaria' && (() => {
          const allMonthKeys = semanas.flat().filter(d => d.inMonth).map(d => d.key)
          const keysAtivos = selDs.length > 0 ? selDs : allMonthKeys

          const scoresLojasDia = {}
          lojas.forEach(loja => {
            const d   = lojaData[loja.id] || { lancamentos: [], metaLoja: null }
            const lcs = (d.lancamentos || []).filter(l => keysAtivos.includes(l.data))
            const st  = aggregateLancamentos(lcs)
            const metaDia = ((d.metaLoja?.meta_total || 0) / 26) * keysAtivos.length
            const score = metaDia > 0 ? Math.round(st.vendas / metaDia * 1000) / 10 : 0
            scoresLojasDia[loja.id] = { scoreDisplay: score, score, vendas: st.vendas }
          })

          const diasSorted = [...selDs].sort()
          const tituloSel = selDs.length === 0
            ? 'Mês inteiro'
            : selDs.length === 1
              ? (() => { const o = semanas.flat().find(d => d.key === selDs[0]); return o ? `${o.lbl}, ${String(o.date.getDate()).padStart(2,'0')}/${String(vM+1).padStart(2,'0')}` : selDs[0] })()
              : `${diasSorted[0].slice(8,10)}/${String(vM+1).padStart(2,'0')} – ${diasSorted.at(-1).slice(8,10)}/${String(vM+1).padStart(2,'0')} (${selDs.length} dias)`

          return (
            <>
              {/* Seletor de dia — multiselect */}
              <div className="flex flex-wrap gap-2">
                {semanas.flat().filter(d => d.inMonth).map(d => {
                  const isT = d.key === todayKey
                  const has = lojas.some(loja => (lojaData[loja.id]?.lancamentos || []).some(l => l.data === d.key))
                  const act = selDs.includes(d.key)
                  return (
                    <button key={d.key} onClick={() => {
                      setSelDs(prev => prev.includes(d.key) ? prev.filter(k => k !== d.key) : [...prev, d.key])
                      setSelD(d.key)
                    }}
                      className={`relative px-3 py-1.5 rounded-lg text-sm border transition-all ${act ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>
                      {String(d.date.getDate()).padStart(2,'0')}/{String(vM+1).padStart(2,'0')}
                      {isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />}
                      {has && !isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />}
                    </button>
                  )
                })}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pista — {tituloSel}</p>
                <RaceTrack vendedores={lojasParaPista} scores={scoresLojasDia} semanas={0} />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Vendas {selDs.length > 1 ? `(${selDs.length} dias)` : selDs.length === 1 ? 'do Dia' : '(mês inteiro)'} por Loja
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                  {[...lojas]
                    .map((loja, i) => ({ loja, i, sc: scoresLojasDia[loja.id] || { score: 0, vendas: 0 } }))
                    .sort((a, b) => b.sc.score - a.sc.score)
                    .map(({ loja, i, sc }, r) => {
                      const c   = getCor(i)
                      const d   = lojaData[loja.id] || { lancamentos: [] }
                      const lcs = (d.lancamentos || []).filter(l => keysAtivos.includes(l.data))
                      const st  = aggregateLancamentos(lcs)
                      return (
                        <div key={loja.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                              style={{ background: c.bg, color: c.border }}>
                              {loja.nome.split(' ').map(w => w[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-white truncate">{loja.nome}</p>
                              {loja.cidade && <p className="text-xs text-gray-400">{loja.cidade}</p>}
                            </div>
                            <span className="text-base font-extrabold" style={{ color: c.border }}>{MEDALS[r] || `${r+1}º`}</span>
                          </div>
                          {st.vendas > 0 ? (
                            <div className="space-y-1 mb-2">
                              <div className="flex justify-between text-xs"><span className="text-gray-400">Vendas</span><span className="font-bold text-white">{fmtR(st.vendas)}</span></div>
                              <div className="flex justify-between text-xs"><span className="text-gray-400">Atend.</span><span className="font-bold text-white">{st.atendimentos}</span></div>
                              <div className="flex justify-between text-xs"><span className="text-gray-400">Peças</span><span className="font-bold text-white">{st.pecas}</span></div>
                            </div>
                          ) : <p className="text-xs text-gray-400 mb-2">Sem lançamento.</p>}
                          <p className="text-xs font-bold text-right" style={{ color: c.border }}>{fmtPct(sc.scoreDisplay ?? sc.score)}</p>
                        </div>
                      )
                    })}
                </div>
              </div>
            </>
          )
        })()}

        {/* ── VISÃO: EVOLUÇÃO ANUAL ── */}
        {visao === 'anual' && (() => {
          const anosDisponiveis = [TODAY.getFullYear(), TODAY.getFullYear() - 1, TODAY.getFullYear() - 2]
          const coresAnos = ['#2979FF', '#FF3D6B', '#00E096']
          function toggleAno(ano) {
            setAnosSel(prev => prev.includes(ano)
              ? prev.length > 1 ? prev.filter(a => a !== ano) : prev
              : [...prev, ano].sort((a, b) => a - b))
          }
          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Comparar anos:</span>
                {anosDisponiveis.map((ano, ai) => (
                  <button key={ano} onClick={() => toggleAno(ano)}
                    className={`px-4 py-1.5 rounded-lg text-sm border font-semibold transition-all ${anossel.includes(ano) ? 'text-white' : 'bg-white/10 text-gray-300 border-white/20'}`}
                    style={anossel.includes(ano) ? { background: coresAnos[ai], borderColor: coresAnos[ai] } : {}}>
                    {ano}
                  </button>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Vendas por Mês — {anossel.join(' vs ')}</p>
                <div className="space-y-4">
                  {MESES.map((nomeMes, mi) => {
                    const mes = mi + 1
                    const isCur = anossel.includes(TODAY.getFullYear()) && mi === TODAY.getMonth()
                    const allFut = anossel.every(a => a === TODAY.getFullYear() && mi > TODAY.getMonth())
                    return (
                      <div key={mes} className={allFut ? 'opacity-30' : ''}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`font-medium w-20 ${isCur ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>{nomeMes}{isCur && ' ●'}</span>
                          <div className="flex gap-3 flex-wrap justify-end">
                            {anossel.map((ano) => {
                              const d = dadosAnual[ano]?.[mes] || { vendas: 0, meta: 0 }
                              const pct = d.meta > 0 ? Math.min(d.vendas / d.meta * 100, 100) : 0
                              return (
                                <span key={ano} className="text-xs font-bold" style={{ color: coresAnos[anosDisponiveis.indexOf(ano)] }}>
                                  {ano}: {fmtR(d.vendas)}{d.meta > 0 && ` (${fmtPct(pct)})`}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {anossel.map((ano) => {
                            const d = dadosAnual[ano]?.[mes] || { vendas: 0, meta: 0 }
                            const pct = d.meta > 0 ? Math.min(d.vendas / d.meta * 100, 100) : 0
                            return (
                              <div key={ano} className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: coresAnos[anosDisponiveis.indexOf(ano)] }} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Atingimento por Loja e Mês</p>
                {anossel.map((ano) => {
                  const cor = coresAnos[anosDisponiveis.indexOf(ano)]
                  const totalAno = lojas.reduce((s, loja) => s + Object.values(dadosAnual[ano] || {}).reduce((ss, m) => ss + (m.porLoja?.[loja.id]?.vendas || 0), 0), 0)
                  return (
                    <div key={ano} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: cor }} />
                        <p className="text-sm font-bold" style={{ color: cor }}>{ano} — Total: {fmtR(totalAno)}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-white/10">
                              <th className="pb-1.5 pr-4 font-medium">Loja</th>
                              {MESES.map((m, i) => <th key={i} className="pb-1.5 text-center px-1 font-medium">{m.slice(0,3)}</th>)}
                              <th className="pb-1.5 text-right pl-2 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lojas.map((loja, li) => {
                              const c = getCor(li)
                              const totalL = Object.values(dadosAnual[ano] || {}).reduce((s, m) => s + (m.porLoja?.[loja.id]?.vendas || 0), 0)
                              return (
                                <tr key={loja.id} className="border-b border-white/5 last:border-0">
                                  <td className="py-1.5 pr-4 font-semibold truncate max-w-[80px]" style={{ color: c.border }}>{loja.nome.split(' ')[0]}</td>
                                  {MESES.map((_, mi) => {
                                    const mes = mi + 1
                                    const vv  = dadosAnual[ano]?.[mes]?.porLoja?.[loja.id]?.vendas || 0
                                    const mm  = dadosAnual[ano]?.[mes]?.porLoja?.[loja.id]?.meta || 0
                                    const p   = mm > 0 ? vv / mm * 100 : 0
                                    const fut = ano === TODAY.getFullYear() && mi > TODAY.getMonth()
                                    return (
                                      <td key={mi} className={`py-1.5 text-center px-1 ${fut ? 'text-white/20' : ''}`}>
                                        {vv > 0
                                          ? <span className={`font-bold ${p >= 100 ? 'text-green-400' : p >= 80 ? 'text-amber-400' : 'text-gray-300'}`}>{fmtPct(p)}</span>
                                          : <span className="text-white/20">—</span>}
                                      </td>
                                    )
                                  })}
                                  <td className="py-1.5 text-right pl-2 font-bold text-white">{fmtR(totalL)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        })()}

        {/* ── VISÃO: SALA DE GUERRA ── */}
        {visao === 'guerra' && (
          <SalaDeGuerra lojas={lojas} lojaData={lojaData} supabase={supabase} />
        )}

      </main>
    </div>
  )
}
