'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import NavBar from '@/components/NavBar'
import RaceTrack from '@/components/RaceTrack'
import Avatar from '@/components/Avatar'
import {
  getMonthDateKeys, getWeeksOfMonth, toDateKey, aggregateLancamentos,
  fmtR, fmtPct, MESES, MEDALS, getCor
} from '@/lib/helpers'

function lojaAvatar(loja) {
  if (loja.exibir_como === 'codigo' && loja.codigo) return loja.codigo.slice(0, 3).toUpperCase()
  return loja.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const TODAY = new Date()

function LojaCard({ loja, dados, index }) {
  const c      = getCor(index)
  const lcs    = dados.lancamentos || []
  const meta   = dados.metaLoja
  const st     = aggregateLancamentos(lcs)
  const score  = meta?.meta_total > 0 ? Math.round(st.vendas / meta.meta_total * 1000) / 10 : 0
  const atingiu = score >= 100

  return (
    <div className={`card p-4 ${atingiu ? 'ring-2 ring-green-300' : ''}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: c.bg, color: c.border }}>
          {lojaAvatar(loja)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-stone-900 truncate">{loja.nome}</p>
          {loja.cidade && <p className="text-xs text-stone-400">{loja.cidade}</p>}
          {atingiu && <span className="text-xs font-bold text-green-600">Meta atingida! 🏆</span>}
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold" style={{ color: c.border }}>{fmtPct(score)}</p>
          <p className="text-xs text-stone-400">score</p>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-stone-400">Vendas</span>
          <span className="font-bold text-stone-800">{fmtR(st.vendas)}</span>
        </div>
        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(score, 100)}%`, background: c.fill }} />
        </div>
        <div className="text-xs text-stone-400">Meta: {fmtR(meta?.meta_total || 0)}</div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-stone-100">
        <div className="text-center">
          <p className="text-xs text-stone-400">Atend.</p>
          <p className="text-sm font-bold text-stone-800">{st.atendimentos}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-stone-400">Peças</p>
          <p className="text-sm font-bold text-stone-800">{st.pecas}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-stone-400">Ticket</p>
          <p className="text-sm font-bold text-stone-800">{fmtR(st.ticket)}</p>
        </div>
      </div>
    </div>
  )
}

export default function DonoPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [usuario,    setUsuario]    = useState(null)
  const [lojas,      setLojas]      = useState([])
  const [lojaData,   setLojaData]   = useState({})
  const [regionais,  setRegionais]  = useState([]) // [{ usuario, lojas: [] }]
  const [visao,      setVisao]      = useState('lojas') // 'lojas' | 'regionais' | 'diaria' | 'anual'
  const [loading,    setLoading]    = useState(true)
  const [vY, setVY] = useState(TODAY.getFullYear())
  const [vM, setVM] = useState(TODAY.getMonth())
  const [semanas,    setSemanas]    = useState([])
  const [selW,       setSelW]       = useState(0)
  const [selDs,      setSelDs]      = useState([toDateKey(TODAY)])
  const [anossel,    setAnosSel]    = useState([TODAY.getFullYear()])
  const [dadosAnual, setDadosAnual] = useState({}) // { ano: { mes: { vendas, meta, porLoja } } }

  // Modal nova loja
  const [modalLoja, setModalLoja] = useState(false)
  const [novaLoja,  setNovaLoja]  = useState({ nome: '', cidade: '', estado: '' })
  const [savingL,   setSavingL]   = useState(false)
  const [msgL,      setMsgL]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)

    // Todas as lojas da empresa
    const { data: ls } = await supabase.from('lojas')
      .select('*').eq('empresa_id', u.empresa_id).eq('ativo', true).order('nome')
    setLojas(ls || [])

    // Regionais (supervisores) e suas lojas
    const { data: sups } = await supabase.from('loja_supervisores')
      .select('loja_id, usuario_id, usuarios(*)')
    const regMap = {}
    ;(sups || []).forEach(s => {
      if (!regMap[s.usuario_id]) regMap[s.usuario_id] = { usuario: s.usuarios, lojaIds: [] }
      regMap[s.usuario_id].lojaIds.push(s.loja_id)
    })
    setRegionais(Object.values(regMap))

    const monthKeys = getMonthDateKeys(vY, vM)
    const dados = {}

    for (const loja of (ls || [])) {
      const { data: lcs, error: eLcs } = await supabase.from('lancamentos').select('*').eq('loja_id', loja.id).in('data', monthKeys)
      const { data: ml }               = await supabase.from('metas_loja').select('*').eq('loja_id', loja.id).eq('ano', vY).eq('mes', vM + 1).maybeSingle()
      const { data: vs }               = await supabase.from('vendedores').select('id,nome').eq('loja_id', loja.id).eq('ativo', true)
      const { data: gers }             = await supabase.from('loja_gerentes').select('usuarios(id,nome)').eq('loja_id', loja.id)
      const { data: sups }             = await supabase.from('loja_supervisores').select('usuarios(id,nome)').eq('loja_id', loja.id)
      console.log(`[${loja.nome}] lancamentos:`, lcs?.length, 'erro:', eLcs)
      const totalVendas   = (lcs || []).reduce((s, l) => s + (l.vendas || 0), 0)
      dados[loja.id] = {
        lancamentos: lcs || [], metaLoja: ml, vendedores: vs || [], totalVendas,
        gerentes: (gers || []).map(g => g.usuarios).filter(Boolean),
        supervisores: (sups || []).map(s => s.usuarios).filter(Boolean),
      }
    }
    setLojaData(dados)
    setLoading(false)
  }, [router, vY, vM])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const wks = getWeeksOfMonth(vY, vM)
    setSemanas(wks)
    const firstSel = selDs[0]
    let found = false
    for (let i = 0; i < wks.length; i++) {
      if (wks[i].some(d => d.key === firstSel)) { setSelW(i); found = true; break }
    }
    if (!found) { setSelW(0); const f = wks[0]?.find(d => d.inMonth); if (f) setSelDs([f.key]) }
  }, [vY, vM])

  function changeMonth(d) {
    let nm = vM + d, ny = vY
    if (nm > 11) { nm = 0; ny++ }
    if (nm < 0)  { nm = 11; ny-- }
    setVM(nm); setVY(ny)
  }

  async function criarLoja() {
    if (!novaLoja.nome.trim() || !usuario?.empresa_id) return
    setSavingL(true); setMsgL('')
    const { error } = await supabase.from('lojas').insert({
      nome: novaLoja.nome.trim(), cidade: novaLoja.cidade, estado: novaLoja.estado,
      empresa_id: usuario.empresa_id
    })
    setSavingL(false)
    if (error) setMsgL('Erro: ' + error.message)
    else { setMsgL('Loja criada!'); setNovaLoja({ nome: '', cidade: '', estado: '' }); load() }
  }

  // Load anual
  const loadAnual = useCallback(async (anos, ls) => {
    if (!ls?.length || !anos?.length) return
    const resultado = {}
    for (const ano of anos) {
      resultado[ano] = {}
      for (let mes = 1; mes <= 12; mes++) {
        const keys = getMonthDateKeys(ano, mes - 1)
        let totalVendas = 0, totalMeta = 0
        const porLoja = {}
        for (const loja of ls) {
          const { data: lcs } = await supabase.from('lancamentos').select('vendas').eq('loja_id', loja.id).in('data', keys)
          const { data: ml }  = await supabase.from('metas_loja').select('meta_total').eq('loja_id', loja.id).eq('ano', ano).eq('mes', mes).maybeSingle()
          const v = (lcs || []).reduce((s, l) => s + (l.vendas || 0), 0)
          const m = ml?.meta_total || 0
          totalVendas += v; totalMeta += m
          porLoja[loja.id] = { vendas: v, meta: m }
        }
        resultado[ano][mes] = { vendas: totalVendas, meta: totalMeta, porLoja }
      }
    }
    setDadosAnual(resultado)
  }, [supabase])

  useEffect(() => {
    if (visao === 'anual' && lojas.length) loadAnual(anossel, lojas)
  }, [visao, anossel, lojas, loadAnual])


  // KPIs
  const kpi = lojas.reduce((acc, l) => {
    const d = lojaData[l.id] || { totalVendas: 0, vendedores: [], metaLoja: null }
    acc.vendas     += d.totalVendas || 0
    acc.meta       += d.metaLoja?.meta_total || 0
    acc.vendedores += d.vendedores.length
    return acc
  }, { vendas: 0, meta: 0, vendedores: 0 })
  const kpiPct = kpi.meta > 0 ? kpi.vendas / kpi.meta * 100 : 0

  // Pista das lojas
  const lojasParaPista = lojas.map(l => ({
    id: l.id,
    nome: l.exibir_como === 'codigo' && l.codigo ? l.codigo : l.nome,
    foto_url: null,
    label: l.codigo || null
  }))
  const scoresLojas = {}
  lojas.forEach(l => {
    const d = lojaData[l.id] || { totalVendas: 0, metaLoja: null }
    const score = d.metaLoja?.meta_total > 0 ? Math.round(d.totalVendas / d.metaLoja.meta_total * 1000) / 10 : 0
    scoresLojas[l.id] = { score }
  })

  // Ranking
  const rankLojas = [...lojas].map((l, i) => {
    const d = lojaData[l.id] || { totalVendas: 0, metaLoja: null }
    const score = d.metaLoja?.meta_total > 0 ? Math.round(d.totalVendas / d.metaLoja.meta_total * 1000) / 10 : 0
    return { l, i, score, vendas: d.totalVendas }
  }).sort((a, b) => b.score - a.score)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-stone-400 text-sm">Carregando rede de lojas...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-100">
      <NavBar usuario={usuario} titulo="Diretoria" subtitulo={`${lojas.length} loja${lojas.length !== 1 ? 's' : ''} ativa${lojas.length !== 1 ? 's' : ''}`} />

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Vendas da Rede',  fmtR(kpi.vendas),  'no mês'],
            ['Meta da Rede',    fmtR(kpi.meta),    'no mês'],
            ['Atingimento',     fmtPct(kpiPct),    'rede geral'],
            ['Vendedores',      kpi.vendedores,    'ativos'],
          ].map(([l, v, s]) => (
            <div key={l} className="card p-4 text-center">
              <p className="text-xs text-stone-400">{l}</p>
              <p className="text-xl font-extrabold text-stone-900 mt-0.5">{v}</p>
              <p className="text-xs text-stone-400">{s}</p>
            </div>
          ))}
        </div>

        {/* Nav mês + toggle + ações */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {visao !== 'anual' && (
            <div className="flex items-center gap-3">
              <button onClick={() => changeMonth(-1)} className="btn-secondary px-3 py-2 text-lg">‹</button>
              <h2 className="text-lg font-bold text-stone-900">{MESES[vM]} {vY}</h2>
              <button onClick={() => changeMonth(1)}  className="btn-secondary px-3 py-2 text-lg">›</button>
            </div>
          )}
          {visao === 'anual' && <div />}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setVisao('lojas')}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${visao === 'lojas' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
              🏁 Corrida das Lojas
            </button>
            <button onClick={() => setVisao('regionais')}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${visao === 'regionais' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
              🗺️ Por Regional
            </button>
            <button onClick={() => setVisao('diaria')}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${visao === 'diaria' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
              📅 Corrida Diária
            </button>
            <button onClick={() => setVisao('anual')}
              className={`px-4 py-1.5 rounded-lg text-sm border transition-all ${visao === 'anual' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
              📊 Evolução Anual
            </button>
            <button onClick={() => setModalLoja(true)} className="btn-success text-sm">+ Nova Loja</button>
          </div>
        </div>

        {/* ── VISÃO: CORRIDA DAS LOJAS ── */}
        {visao === 'lojas' && (
          <>
            <div className="card p-4">
              <p className="section-title mb-4">Pista da Rede — {MESES[vM]} {vY}</p>
              <RaceTrack vendedores={lojasParaPista} scores={scoresLojas} semanas={4} />
            </div>

            <div>
              <p className="section-title">Desempenho das Lojas</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                {rankLojas.map(({ l, i }) => (
                  <LojaCard key={l.id} loja={l} dados={lojaData[l.id] || { lancamentos: [], metaLoja: null }} index={i} />
                ))}
              </div>
            </div>

            <div className="card p-4">
              <p className="section-title">Classificação das Lojas</p>
              <div className="space-y-2 mt-3">
                {rankLojas.map(({ l, i, score, vendas }, r) => {
                  const c = getCor(i)
                  return (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                      <span className="text-lg min-w-[24px]">{MEDALS[r] || `${r + 1}º`}</span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: c.bg, color: c.border }}>
                        {lojaAvatar(l)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{l.nome}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {(lojaData[l.id]?.gerentes || []).map(g => (
                            <span key={g.id} className="text-xs text-indigo-600 font-medium">👤 {g.nome}</span>
                          ))}
                          {(lojaData[l.id]?.supervisores || []).map(s => (
                            <span key={s.id} className="text-xs text-emerald-600 font-medium">⭐ {s.nome}</span>
                          ))}
                          {!lojaData[l.id]?.gerentes?.length && !lojaData[l.id]?.supervisores?.length && l.cidade && (
                            <span className="text-xs text-stone-400">{l.cidade}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold" style={{ color: c.border }}>{score.toFixed(1)}%</p>
                        <p className="text-xs text-stone-400">{fmtR(vendas)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── VISÃO: POR REGIONAL ── */}
        {visao === 'regionais' && (() => {
          const rankCoords = [...regionais].map((reg, idx) => {
            const lojasReg    = lojas.filter(l => reg.lojaIds.includes(l.id))
            const totalVendas = lojasReg.reduce((s, l) => s + (lojaData[l.id]?.totalVendas || 0), 0)
            const totalMeta   = lojasReg.reduce((s, l) => s + (lojaData[l.id]?.metaLoja?.meta_total || 0), 0)
            const pct         = totalMeta > 0 ? Math.round(totalVendas / totalMeta * 1000) / 10 : 0
            return { reg, lojasReg, totalVendas, totalMeta, pct, idx }
          }).sort((a, b) => b.pct - a.pct)

          const coordsParaPista = rankCoords.map(({ reg }, i) => ({
            id: reg.usuario?.id || `reg-${i}`,
            nome: reg.usuario?.nome || 'Regional',
            foto_url: reg.usuario?.foto_url || null,
          }))
          const scoresCoords = {}
          rankCoords.forEach(({ reg, pct }, i) => {
            scoresCoords[reg.usuario?.id || `reg-${i}`] = { score: pct }
          })

          return (
            <div className="space-y-4">
              <div className="card p-4">
                <p className="section-title mb-4">Pista das Coordenadoras — {MESES[vM]} {vY}</p>
                {regionais.length === 0
                  ? <div className="text-sm text-stone-400 text-center py-8">Nenhuma coordenadora cadastrada.</div>
                  : <RaceTrack vendedores={coordsParaPista} scores={scoresCoords} semanas={4} />
                }
              </div>

              <div className="card p-4">
                <p className="section-title mb-3">Classificação das Coordenadoras</p>
                <div className="space-y-2">
                  {rankCoords.map(({ reg, lojasReg, totalVendas, pct }, r) => (
                    <div key={reg.usuario?.id || r} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                      <span className="text-lg min-w-[24px]">{MEDALS[r] || `${r + 1}º`}</span>
                      <Avatar nome={reg.usuario?.nome || 'R'} fotoUrl={reg.usuario?.foto_url || null} index={r} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900">{reg.usuario?.nome || 'Regional'}</p>
                        <p className="text-xs text-stone-400">{lojasReg.length} loja{lojasReg.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-stone-900">{fmtPct(pct)}</p>
                        <p className="text-xs text-stone-400">{fmtR(totalVendas)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── VISÃO: CORRIDA DIÁRIA ── */}
        {visao === 'diaria' && (() => {
          const todayKey = toDateKey(TODAY)

          // Score acumulado dos dias selecionados
          const scoresDia = {}
          lojas.forEach(l => {
            const d   = lojaData[l.id] || { lancamentos: [], metaLoja: null }
            const lcs = d.lancamentos.filter(lc => selDs.includes(lc.data))
            const st  = aggregateLancamentos(lcs)
            const metaDia = ((d.metaLoja?.meta_total || 0) / 26) * selDs.length
            const score   = metaDia > 0 ? Math.round(st.vendas / metaDia * 1000) / 10 : 0
            scoresDia[l.id] = { score, vendas: st.vendas, atendimentos: st.atendimentos, pecas: st.pecas }
          })

          const diasSorted = [...selDs].sort()
          const tituloSel  = selDs.length === 1
            ? (() => { const o = semanas.flat().find(d => d.key === selDs[0]); return o ? `${o.lbl}, ${String(o.date.getDate()).padStart(2,'0')}/${String(vM+1).padStart(2,'0')}/${vY}` : selDs[0] })()
            : `${diasSorted[0].slice(8,10)}/${String(vM+1).padStart(2,'0')} – ${diasSorted.at(-1).slice(8,10)}/${String(vM+1).padStart(2,'0')} (${selDs.length} dias)`

          function toggleDia(key) {
            setSelDs(prev => prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key])
          }

          return (
            <>
              {/* Seletor de dias (multi-select) */}
              <div className="flex flex-wrap gap-2 mb-4">
                {semanas.flat().filter(d => d.inMonth).map(d => {
                  const isT = d.key === todayKey
                  const has = lojas.some(l => (lojaData[l.id]?.lancamentos || []).some(lc => lc.data === d.key))
                  const act = selDs.includes(d.key)
                  return (
                    <button key={d.key} onClick={() => toggleDia(d.key)}
                      className={`relative px-3 py-1.5 rounded-lg text-sm border transition-all ${act ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                      {String(d.date.getDate()).padStart(2, '0')}/{String(vM + 1).padStart(2, '0')}
                      {isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />}
                      {has && !isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />}
                    </button>
                  )
                })}
              </div>

              {/* Pista */}
              <div className="card p-4">
                <p className="section-title mb-4">Pista — {tituloSel}</p>
                <RaceTrack vendedores={lojasParaPista} scores={scoresDia} semanas={0} />
              </div>

              {/* Cards do dia */}
              <div>
                <p className="section-title">Vendas {selDs.length > 1 ? `(${selDs.length} dias)` : 'do Dia'} por Loja</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-3">
                  {[...lojas]
                    .map((l, i) => ({ l, i, sc: scoresDia[l.id] || { score: 0, vendas: 0 } }))
                    .sort((a, b) => b.sc.score - a.sc.score)
                    .map(({ l, i, sc }, r) => {
                      const c = getCor(i)
                      return (
                        <div key={l.id} className="card p-4">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                              style={{ background: c.bg, color: c.border }}>
                              {lojaAvatar(l)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-stone-900 truncate">{l.nome}</p>
                              {l.cidade && <p className="text-xs text-stone-400">{l.cidade}</p>}
                            </div>
                            <p className="text-lg font-extrabold" style={{ color: c.border }}>{MEDALS[r] || `${r+1}º`}</p>
                          </div>
                          {sc.vendas > 0 ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-stone-400">Vendas</span>
                                <span className="font-bold text-stone-800">{fmtR(sc.vendas)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-stone-400">Atendimentos</span>
                                <span className="font-bold text-stone-800">{sc.atendimentos}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-stone-400">Peças</span>
                                <span className="font-bold text-stone-800">{sc.pecas}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-stone-400">Nenhum lançamento neste dia.</p>
                          )}
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
            setAnosSel(prev =>
              prev.includes(ano)
                ? prev.length > 1 ? prev.filter(a => a !== ano) : prev
                : [...prev, ano].sort((a, b) => a - b)
            )
          }

          return (
            <>
              {/* Seletor multiselect de anos */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-400 font-medium">Comparar anos:</span>
                {anosDisponiveis.map((ano, ai) => {
                  const sel = anossel.includes(ano)
                  return (
                    <button key={ano} onClick={() => toggleAno(ano)}
                      className={`px-4 py-1.5 rounded-lg text-sm border font-semibold transition-all ${sel ? 'text-white' : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'}`}
                      style={sel ? { background: coresAnos[ai], borderColor: coresAnos[ai] } : {}}>
                      {ano}
                    </button>
                  )
                })}
              </div>

              {/* Barras mensais comparativas */}
              <div className="card p-4">
                <p className="section-title mb-4">Vendas por Mês — {anossel.join(' vs ')}</p>
                <div className="space-y-4">
                  {MESES.map((nomeMes, mi) => {
                    const mes = mi + 1
                    const isCur = anossel.includes(TODAY.getFullYear()) && mi === TODAY.getMonth()
                    const allFut = anossel.every(a => a === TODAY.getFullYear() && mi > TODAY.getMonth())
                    return (
                      <div key={mes} className={allFut ? 'opacity-30' : ''}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className={`font-medium w-20 ${isCur ? 'text-blue-600 font-bold' : 'text-stone-600'}`}>
                            {nomeMes} {isCur && '●'}
                          </span>
                          <div className="flex gap-4">
                            {anossel.map((ano) => {
                              const d   = dadosAnual[ano]?.[mes] || { vendas: 0, meta: 0 }
                              const pct = d.meta > 0 ? Math.min(d.vendas / d.meta * 100, 100) : 0
                              return (
                                <span key={ano} className="text-xs font-bold" style={{ color: coresAnos[anosDisponiveis.indexOf(ano)] }}>
                                  {ano}: {fmtR(d.vendas)} {d.meta > 0 && `(${fmtPct(pct)})`}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        {/* Barras empilhadas por ano */}
                        <div className="space-y-1">
                          {anossel.map((ano) => {
                            const d   = dadosAnual[ano]?.[mes] || { vendas: 0, meta: 0 }
                            const pct = d.meta > 0 ? Math.min(d.vendas / d.meta * 100, 100) : 0
                            const cor = coresAnos[anosDisponiveis.indexOf(ano)]
                            return (
                              <div key={ano} className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, background: cor }} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tabela comparativa por loja */}
              <div className="card p-4">
                <p className="section-title mb-4">Atingimento por Loja e Mês</p>
                {anossel.map((ano) => {
                  const cor = coresAnos[anosDisponiveis.indexOf(ano)]
                  const totalAno = lojas.reduce((s, l) => s + Object.values(dadosAnual[ano] || {}).reduce((ss, m) => ss + (m.porLoja?.[l.id]?.vendas || 0), 0), 0)
                  return (
                    <div key={ano} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: cor }} />
                        <p className="text-sm font-bold" style={{ color: cor }}>{ano} — Total: {fmtR(totalAno)}</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-stone-400 border-b border-stone-100">
                              <th className="pb-1.5 font-medium pr-4">Loja</th>
                              {MESES.map((m, i) => (
                                <th key={i} className={`pb-1.5 font-medium text-center px-1 ${i === TODAY.getMonth() && ano === TODAY.getFullYear() ? 'text-blue-600' : ''}`}>
                                  {m.slice(0, 3)}
                                </th>
                              ))}
                              <th className="pb-1.5 font-medium text-right pl-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lojas.map((loja, li) => {
                              const c = getCor(li)
                              const totalLoja = Object.values(dadosAnual[ano] || {}).reduce((s, m) => s + (m.porLoja?.[loja.id]?.vendas || 0), 0)
                              return (
                                <tr key={loja.id} className="border-b border-stone-50 last:border-0">
                                  <td className="py-1.5 pr-4 font-semibold truncate max-w-[80px]" style={{ color: c.border }}>{loja.nome}</td>
                                  {MESES.map((_, mi) => {
                                    const mes = mi + 1
                                    const v   = dadosAnual[ano]?.[mes]?.porLoja?.[loja.id]?.vendas || 0
                                    const m   = dadosAnual[ano]?.[mes]?.porLoja?.[loja.id]?.meta   || 0
                                    const p   = m > 0 ? v / m * 100 : 0
                                    const fut = ano === TODAY.getFullYear() && mi > TODAY.getMonth()
                                    return (
                                      <td key={mi} className={`py-1.5 text-center px-1 ${fut ? 'text-stone-200' : ''}`}>
                                        {v > 0
                                          ? <span className={`font-bold ${p >= 100 ? 'text-green-600' : p >= 80 ? 'text-amber-600' : 'text-stone-600'}`}>{fmtPct(p)}</span>
                                          : <span className="text-stone-300">—</span>}
                                      </td>
                                    )
                                  })}
                                  <td className="py-1.5 text-right pl-2 font-bold text-stone-800">{fmtR(totalLoja)}</td>
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

      </main>

      {/* Modal: Nova Loja */}
      {modalLoja && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
            <h2 className="text-lg font-bold mb-4">+ Nova Loja</h2>
            <div className="space-y-3 mb-4">
              <div><label className="label-field">Nome da Loja *</label>
                <input value={novaLoja.nome} onChange={e => setNovaLoja(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Loja Centro" /></div>
              <div><label className="label-field">Cidade</label>
                <input value={novaLoja.cidade} onChange={e => setNovaLoja(p => ({ ...p, cidade: e.target.value }))} placeholder="São Paulo" /></div>
              <div><label className="label-field">Estado (UF)</label>
                <input value={novaLoja.estado} onChange={e => setNovaLoja(p => ({ ...p, estado: e.target.value }))} placeholder="SP" maxLength={2} /></div>
            </div>
            {msgL && <p className={`text-sm mb-3 px-3 py-2 rounded-lg ${msgL.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msgL}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setModalLoja(false); setMsgL('') }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarLoja} disabled={savingL || !novaLoja.nome.trim()} className="btn-success flex-1">{savingL ? 'Salvando...' : 'Criar Loja'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
