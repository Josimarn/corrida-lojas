'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'
import NavBar from '@/components/NavBar'
import Avatar from '@/components/Avatar'
import {
  getWeeksOfMonth, getMonthDateKeys, toDateKey, calcScore, aggregateLancamentos,
  fmtR, fmtN, fmtPct, MESES, MEDALS, getCor
} from '@/lib/helpers'

const TODAY = new Date()

function ScoreRing({ score, size = 100 }) {
  const pct = Math.min(score, 100)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(rgba(255,255,255,0.9) ${pct}%, rgba(255,255,255,0.15) ${pct}%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 1s ease',
    }}>
      <div style={{
        width: size - 14, height: size - 14, borderRadius: '50%',
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {fmtPct(score)}
        </span>
        <span style={{ fontSize: size * 0.11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>score</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, meta, pct, color, unit = '' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-stone-900">{value}{unit}</p>
      <p className="text-xs text-stone-400 mb-2">meta: {meta}{unit}</p>
      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <p className="text-xs font-bold mt-1" style={{ color }}>{fmtPct(pct)}</p>
    </div>
  )
}

export default function VendedorPage() {
  const router   = useRouter()
  const supabase = createClientComponent()
  const [usuario,    setUsuario]    = useState(null)
  const [vendedor,   setVendedor]   = useState(null)
  const [loja,       setLoja]       = useState(null)
  const [metaLoja,   setMetaLoja]   = useState(null)
  const [metaMes,    setMetaMes]    = useState(null)
  const [lancamentos,setLancamentos]= useState([])
  const [semanas,    setSemanas]    = useState([])
  const [colegas,    setColegas]    = useState([])
  const [metasColegas, setMetasColegas] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [vY, setVY] = useState(TODAY.getFullYear())
  const [vM, setVM] = useState(TODAY.getMonth())

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    // Busca usuário e vendedor em paralelo
    const [{ data: u }, { data: v }] = await Promise.all([
      supabase.from('usuarios').select('*').eq('id', user.id).single(),
      supabase.from('vendedores').select('*').eq('usuario_id', user.id).eq('ativo', true).limit(1).maybeSingle(),
    ])
    setUsuario(u)
    if (!v) { setLoading(false); return }
    setVendedor(v)

    // Busca todos os dados dependentes em paralelo
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

  useEffect(() => { load() }, [load])
  useEffect(() => { setSemanas(getWeeksOfMonth(vY, vM)) }, [vY, vM])

  function changeMonth(d) {
    let nm = vM + d, ny = vY
    if (nm > 11) { nm = 0; ny++ }
    if (nm < 0)  { nm = 11; ny-- }
    setVM(nm); setVY(ny)
  }

  const meusLcs   = lancamentos.filter(l => vendedor && l.vendedor_id === vendedor.id)
  const stats     = aggregateLancamentos(meusLcs)
  const pesos     = { peso_venda: metaLoja?.peso_venda || 40, peso_ticket: metaLoja?.peso_ticket || 30, peso_pa: metaLoja?.peso_pa || 30 }
  // Usa meta individual; fallback para metasColegas (mesma fonte do ranking); fallback para meta da loja ÷ nº vendedores
  const mvMinha   = metasColegas.find(m => vendedor && m.vendedor_id === vendedor.id) || metaMes || {}
  const nVendAtivos = colegas.length || 1
  const metaFallback = metaLoja?.meta_total > 0 ? metaLoja.meta_total / nVendAtivos : 0
  const meta      = {
    meta_venda:  mvMinha.meta_venda  || metaFallback,
    meta_ticket: mvMinha.meta_ticket || 0,
    meta_pa:     mvMinha.meta_pa     || 0,
  }
  const scored    = calcScore(stats, meta, pesos)
  const idx       = colegas.findIndex(v => vendedor && v.id === vendedor.id)
  const c         = getCor(idx)

  const rankData = colegas.map((col, i) => {
    const lcs  = lancamentos.filter(l => l.vendedor_id === col.id)
    const st   = aggregateLancamentos(lcs)
    const mv   = metasColegas.find(m => m.vendedor_id === col.id) || {}
    const metaCol = { meta_venda: mv.meta_venda || 0, meta_ticket: mv.meta_ticket || 0, meta_pa: mv.meta_pa || 0 }
    const sc   = calcScore(st, metaCol, pesos)
    return { col, i, score: sc.score }
  }).sort((a, b) => b.score - a.score)

  const minhaPosicao = rankData.findIndex(r => vendedor && r.col.id === vendedor.id) + 1
  const atingiu      = scored.score >= 100

  const motivacao = scored.score === 0 ? 'Bora largar na frente! 🚀'
    : scored.score < 30  ? 'Acelera, você consegue! 💪'
    : scored.score < 60  ? 'Boa ritmo, mantém o pé no acelerador! 🔥'
    : scored.score < 90  ? 'Tá chegando lá! Sprint final! ⚡'
    : scored.score < 100 ? 'Quase na linha de chegada! 🏁'
    : 'META BATIDA! Campeão! 🏆'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-stone-400 text-sm">Carregando...</div>
    </div>
  )

  if (!vendedor) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-sm text-center">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-semibold text-stone-700">Perfil de vendedor não encontrado</p>
        <p className="text-sm text-stone-400 mt-1">Solicite ao gerente que vincule seu usuário.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-100">
      <NavBar usuario={usuario} titulo={loja?.nome} subtitulo="Meu Desempenho" />

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Hero — Score */}
        <div className="rounded-2xl relative"
          style={{ background: `linear-gradient(135deg, ${c.fill}dd 0%, ${c.border} 100%)` }}>

          {/* Carro decorativo no fundo */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none rounded-2xl">
            {c.car}
          </div>

          <div className="p-5 relative" style={{ minHeight: 110 }}>
            {/* Ring — posicionado no canto direito */}
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
              <ScoreRing score={scored.score} size={100} />
            </div>

            {/* Conteúdo com padding para não sobrepor o ring */}
            <div className="flex items-center gap-3 pr-28">
              {/* Avatar + posição */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <Avatar nome={vendedor.nome} fotoUrl={vendedor.foto_url} index={idx} size={52} />
                {minhaPosicao > 0 && (
                  <span className="text-base font-black text-white">
                    {MEDALS[minhaPosicao - 1] || `${minhaPosicao}º`}
                  </span>
                )}
              </div>

              {/* Nome + motivação */}
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-white truncate">{vendedor.nome.split(' ')[0]}</p>
                <p className="text-sm text-white/70 truncate">{loja?.nome}</p>
                <p className="text-xs text-white/80 mt-2 font-medium">{motivacao}</p>
                {atingiu && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
                    🏆 Meta atingida!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Barra de progresso full-width */}
          <div className="h-1.5 bg-white/20 rounded-b-2xl overflow-hidden">
            <div className="h-full bg-white/70 transition-all duration-1000"
              style={{ width: `${Math.min(scored.score, 100)}%` }} />
          </div>
        </div>

        {/* Nav mês */}
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="btn-secondary px-3 py-1.5">‹</button>
          <h2 className="text-base font-bold text-stone-800">{MESES[vM]} {vY}</h2>
          <button onClick={() => changeMonth(1)} className="btn-secondary px-3 py-1.5">›</button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label={`Venda (${pesos.peso_venda}%)`}
            value={fmtR(stats.vendas)} meta={fmtR(meta.meta_venda)}
            pct={scored.pv} color={c.fill} />
          <MetricCard label={`Ticket (${pesos.peso_ticket}%)`}
            value={fmtR(stats.ticket)} meta={fmtR(meta.meta_ticket)}
            pct={scored.pt} color={c.border} />
          <MetricCard label={`PA (${pesos.peso_pa}%)`}
            value={fmtN(stats.pa, 1)} meta={fmtN(meta.meta_pa, 1)}
            pct={scored.pp} color="#10b981" unit=" pçs" />
        </div>

        {/* Totais auxiliares */}
        <div className="grid grid-cols-3 gap-3">
          {[['Atendimentos', stats.atendimentos], ['Peças', stats.pecas], ['Dias c/ venda', meusLcs.filter(l => l.vendas > 0).length]].map(([l, v]) => (
            <div key={l} className="card p-3 text-center">
              <p className="text-2xl font-extrabold text-stone-800">{v}</p>
              <p className="text-xs text-stone-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Progresso semanal */}
        <div className="card p-4">
          <p className="section-title">Vendas por Semana</p>
          <div className="space-y-3">
            {semanas.map((semana, wi) => {
              const dias  = semana.filter(d => d.inMonth).map(d => d.key)
              const lcs   = meusLcs.filter(l => dias.includes(l.data))
              const total = lcs.reduce((a, l) => a + (l.vendas || 0), 0)
              const metaW = meta.meta_venda > 0 ? meta.meta_venda / semanas.length : 0
              const pct   = metaW > 0 ? Math.min(total / metaW * 100, 100) : 0
              const f = semana.find(d => d.inMonth)
              const l2 = [...semana].reverse().find(d => d.inMonth)
              return (
                <div key={wi}>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span className="font-medium">Semana {wi + 1} <span className="text-stone-400">({f?.date.getDate()}–{l2?.date.getDate()})</span></span>
                    <span className="font-bold text-stone-700">{fmtR(total)}</span>
                  </div>
                  <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: c.fill }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ranking */}
        <div className="card p-4">
          <p className="section-title">Ranking da Loja</p>
          <div className="space-y-1">
            {rankData.map(({ col, i, score }, r) => {
              const isMe = vendedor && col.id === vendedor.id
              const cc   = getCor(i)
              return (
                <div key={col.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isMe ? 'ring-2' : 'hover:bg-stone-50'}`}
                  style={isMe ? { background: `${c.fill}15`, ringColor: c.fill } : {}}>
                  <span className="text-lg min-w-[28px]">{MEDALS[r] || `${r + 1}º`}</span>
                  <Avatar nome={col.nome} fotoUrl={col.foto_url} index={i} size={30} />
                  <p className={`flex-1 text-sm ${isMe ? 'font-extrabold text-stone-900' : 'text-stone-600'}`}>
                    {col.nome.split(' ')[0]} {isMe && <span className="text-xs font-normal text-stone-400">(você)</span>}
                  </p>
                  {isMe ? (
                    <span className="text-sm font-extrabold" style={{ color: cc.border }}>{fmtPct(score)}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(score, 100)}%`, background: cc.fill }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Histórico */}
        <div className="card p-4">
          <p className="section-title">Histórico do Mês</p>
          {meusLcs.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">Nenhum lançamento ainda.</p>
          ) : (
            <div className="space-y-1">
              {[...meusLcs].sort((a, b) => b.data.localeCompare(a.data)).map(l => {
                const ticket = l.atendimentos > 0 ? l.vendas / l.atendimentos : 0
                const pa     = l.atendimentos > 0 ? l.pecas / l.atendimentos : 0
                const d      = new Date(l.data + 'T12:00:00')
                return (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-stone-400">
                        {l.atendimentos} atend. · {l.pecas} pçs · ticket {fmtR(ticket)} · PA {fmtN(pa, 1)}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-stone-900">{fmtR(l.vendas)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
