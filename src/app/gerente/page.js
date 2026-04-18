'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

function parseCurrency(str) {
  // Aceita tanto vírgula quanto ponto como separador decimal
  // Ex: "1.498,35" → 1498.35 | "1498.35" → 1498.35 | "1498,35" → 1498.35
  let s = String(str || '').trim()
  const lastDot   = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) {
      // "1,498.35" — ponto é decimal, vírgula é milhar
      s = s.replace(/,/g, '')
    } else {
      // "1.498,35" — vírgula é decimal, ponto é milhar
      s = s.replace(/\./g, '').replace(',', '.')
    }
  } else if (lastComma !== -1) {
    // só vírgula → decimal
    s = s.replace(',', '.')
  }
  // mantém apenas dígitos e um ponto decimal
  s = s.replace(/[^\d.]/g, '')
  const parts = s.split('.')
  return parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 2) : parts[0]
}

function CurrencyInput({ value, onChange, placeholder, className, ...props }) {
  const [focused, setFocused] = useState(false)
  const num = parseFloat(parseCurrency(value))
  const display = !focused && value !== '' && value !== undefined && !isNaN(num)
    ? num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (value || '')
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      className={className}
      value={display}
      placeholder={placeholder || 'R$ 0,00'}
      onFocus={e => { setFocused(true); setTimeout(() => e.target.select(), 0) }}
      onBlur={e => {
        setFocused(false)
        // Normaliza ao sair do campo
        const parsed = parseCurrency(e.target.value)
        if (parsed !== value) onChange(parsed)
      }}
      onChange={e => onChange(parseCurrency(e.target.value))}
    />
  )
}
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import NavBar from '@/components/NavBar'
import HeaderAbsurdo from '@/components/HeaderAbsurdo'
import RaceTrack from '@/components/RaceTrack'
import ScoreCard from '@/components/ScoreCard'
import Avatar from '@/components/Avatar'
import RankingAbsurdo from '@/components/RankingAbsurdo'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  getWeeksOfMonth, getMonthDateKeys, toDateKey, calcScore, aggregateLancamentos,
  fmtR, fmtPct, MESES, MEDALS, getCor, getWeekNumber, applyWeekPos
} from '@/lib/helpers'

const TODAY = new Date()

export default function GerentePage() {
  const router   = useRouter()
  const supabase = createClient()
  const [usuario,    setUsuario]    = useState(null)
  const [lojas,      setLojas]      = useState([])       // todas as lojas do gerente
  const [loja,       setLoja]       = useState(null)     // loja selecionada
  const [lojaData,   setLojaData]   = useState({})       // dados por loja
  const [vendedores, setVendedores] = useState([])
  const [metaLoja,   setMetaLoja]   = useState(null)
  const [lancamentos,setLancamentos]= useState([])
  const [loading,    setLoading]    = useState(true)
  const [visaoConsol,setVisaoConsol]= useState(false)
  const [visao,      setVisao]      = useState('mes') // 'mes' | 'vendas' | 'diaria' | 'anual' | 'guerra'
  const [guerraAlerta, setGuerraAlerta] = useState(null)
  const [anossel,    setAnosSel]    = useState([TODAY.getFullYear()])
  const [dadosAnual, setDadosAnual] = useState({})

  const [vY, setVY] = useState(TODAY.getFullYear())
  const [vM, setVM] = useState(TODAY.getMonth())
  const [semanas, setSemanas] = useState([])
  const [selW,    setSelW]   = useState(0)
  const [selWs,   setSelWs]  = useState([0])
  const [selD,    setSelD]   = useState(toDateKey(TODAY))
  const [selDs,   setSelDs]  = useState([toDateKey(TODAY)])

  // Modal estado
  const [metasVendedor, setMetasVendedor] = useState([])

  const [modalMetas,  setModalMetas]  = useState(false)
  const [modalEquipe, setModalEquipe] = useState(false)
  const [modalLancar, setModalLancar] = useState(false)
  const [selVendedor, setSelVendedor] = useState(null)

  // Form metas
  const [fMetaLojaEsp, setFMetaLojaEsp] = useState('')
  const [fMetaTotal,   setFMetaTotal]   = useState('')
  const [fPesoVenda,   setFPesoVenda]   = useState('40')
  const [fPesoTicket,  setFPesoTicket]  = useState('30')
  const [fPesoPA,      setFPesoPA]      = useState('30')
  const [fMetasVend,   setFMetasVend]   = useState({}) // { vendedorId: { venda, ticket, pa } }
  const [savingM,      setSavingM]      = useState(false)
  const [msgM,         setMsgM]         = useState('')

  // Form lançamento
  const [fVendas, setFVendas] = useState('')
  const [fAtend,  setFAtend]  = useState('')
  const [fPecas,  setFPecas]  = useState('')
  const [savingL, setSavingL] = useState(false)

  // Form equipe
  const [novoVendedor,    setNovoVendedor]    = useState({ nome: '', foto_url: '' })
  const [savingV,         setSavingV]         = useState(false)
  const [msgV,            setMsgV]            = useState('')
  const [togglingId,      setTogglingId]      = useState(null)
  const [vendedoresModal, setVendedoresModal] = useState([])
  const [fotoPreview,     setFotoPreview]     = useState(null)
  const [uploadingFoto,   setUploadingFoto]   = useState(false)
  const fileInputRef = useRef(null)
  const audioRef     = useRef(null)

  // Ultrapassagem no ranking
  const [ultrapassou,    setUltrapassou]    = useState(false)
  const [prevRankIds,    setPrevRankIds]    = useState('')
  const [movimentosVend, setMovimentosVend] = useState({})

  // Edição inline de vendedor
  const [editandoId,    setEditandoId]    = useState(null)
  const [editNome,      setEditNome]      = useState('')
  const [editFotoUrl,   setEditFotoUrl]   = useState('')
  const [editPreview,   setEditPreview]   = useState(null)
  const [uploadingEdit, setUploadingEdit] = useState(false)
  const [savingEdit,    setSavingEdit]    = useState(false)
  const [editEmail,     setEditEmail]     = useState('')
  const [editEmailMsg,  setEditEmailMsg]  = useState('')
  const editFileRef = useRef(null)

  // ─── Load ────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)

    // todas as lojas do gerente
    const { data: lgs } = await supabase.from('loja_gerentes')
      .select('loja_id, visao_consolidada, lojas(*)').eq('usuario_id', user.id)
    if (!lgs?.length) { setLoading(false); return }

    const minhasLojas = lgs.map(r => ({ ...r.lojas, visao_consolidada: r.visao_consolidada }))
    setLojas(minhasLojas)

    // Seleciona a primeira loja por padrão
    const lojaAtual = loja || minhasLojas[0]
    setLoja(lojaAtual)

    const monthKeys = getMonthDateKeys(vY, vM)
    const dados = {}

    for (const l of minhasLojas) {
      const { data: vs }  = await supabase.from('vendedores').select('*').eq('loja_id', l.id).eq('ativo', true).order('nome')
      const { data: ml }  = await supabase.from('metas_loja').select('*').eq('loja_id', l.id).eq('ano', vY).eq('mes', vM + 1).maybeSingle()
      const { data: lcs } = await supabase.from('lancamentos').select('*').eq('loja_id', l.id).in('data', monthKeys)
      const { data: mvs } = await supabase.from('metas_vendedor').select('*').eq('loja_id', l.id).eq('ano', vY).eq('mes', vM + 1).is('semana', null)
      dados[l.id] = { vendedores: vs || [], metaLoja: ml, lancamentos: lcs || [], metasVendedor: mvs || [] }
    }
    setLojaData(dados)

    // Atualiza estado da loja selecionada
    const d = dados[lojaAtual.id] || {}
    setVendedores(d.vendedores || [])
    setMetaLoja(d.metaLoja || null)
    setLancamentos(d.lancamentos || [])
    setMetasVendedor(d.metasVendedor || [])

    setLoading(false)
  }, [router, vY, vM])

  // Scores e ranking (calculados antes dos useEffects para evitar TDZ)
  const weekNumber = getWeekNumber(vY, vM)
  const scores = {}
  vendedores.forEach(v => {
    const lcs   = lancamentos.filter(l => l.vendedor_id === v.id)
    const stats = aggregateLancamentos(lcs)
    const meta  = getVendedorMeta(v.id)
    const pesos = { peso_venda: metaLoja?.peso_venda || 40, peso_ticket: metaLoja?.peso_ticket || 30, peso_pa: metaLoja?.peso_pa || 30 }
    const calc  = calcScore(stats, meta, pesos)
    scores[v.id] = {
      ...calc,
      scoreDisplay: calc.score,
      score: applyWeekPos(calc.score, weekNumber),
      stats,
      pesos,
    }
  })
  const rankingAtual = [...vendedores]
    .map(v => ({ id: v.id, nome: v.nome, score: scores[v.id]?.scoreDisplay || 0 }))
    .sort((a, b) => b.score - a.score)
  const rankIds = rankingAtual.map(v => v.id).join(',')

  useEffect(() => { load() }, [load])

  const loadAnual = useCallback(async (anos, lojaId, vs) => {
    if (!lojaId || !vs?.length) return
    const resultado = {}
    for (const ano of anos) {
      resultado[ano] = {}
      for (let mes = 1; mes <= 12; mes++) {
        const keys = getMonthDateKeys(ano, mes - 1)
        const { data: lcs } = await supabase.from('lancamentos').select('vendas,vendedor_id').eq('loja_id', lojaId).in('data', keys)
        const { data: ml, error: mlErr } = await supabase.from('metas_loja').select('meta_total,meta_loja').eq('loja_id', lojaId).eq('ano', ano).eq('mes', mes).maybeSingle()
        // Se meta_loja ainda não existe na tabela, busca só meta_total
        const metaTotal = mlErr ? (await supabase.from('metas_loja').select('meta_total').eq('loja_id', lojaId).eq('ano', ano).eq('mes', mes).maybeSingle()).data?.meta_total || 0 : (ml?.meta_total || 0)
        const metaLoja  = ml?.meta_loja ?? 0
        const totalVendas = (lcs || []).reduce((s, l) => s + (l.vendas || 0), 0)
        const porVendedor = {}
        vs.forEach(v => {
          porVendedor[v.id] = { vendas: (lcs || []).filter(l => l.vendedor_id === v.id).reduce((s, l) => s + (l.vendas || 0), 0) }
        })
        resultado[ano][mes] = { vendas: totalVendas, meta: metaTotal, metaLoja, porVendedor }
      }
    }
    setDadosAnual(resultado)
  }, [supabase])

  useEffect(() => {
    if (visao === 'anual' && loja) loadAnual(anossel, loja.id, vendedores)
  }, [visao, anossel, loja, vendedores, loadAnual])

  useEffect(() => {
    if (prevRankIds && rankIds && prevRankIds !== rankIds) {
      const prev = prevRankIds.split(',')
      const cur  = rankIds.split(',')
      if (prev.length === cur.length) {
        const mov = {}
        cur.forEach((id, i) => {
          const antes = prev.indexOf(id)
          if (antes !== -1 && antes !== i) mov[id] = antes > i ? 'up' : 'down'
        })
        if (Object.keys(mov).length) {
          setMovimentosVend(mov)
          setTimeout(() => setMovimentosVend({}), 2000)
        }
        const houve = cur.some((id, i) => prev.indexOf(id) > i)
        if (houve) {
          setUltrapassou(true)
          if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(() => {})
          }
          setTimeout(() => setUltrapassou(false), 2500)
        }
      }
    }
    if (rankIds) setPrevRankIds(rankIds)
  }, [rankIds])

  useEffect(() => {
    const wks = getWeeksOfMonth(vY, vM)
    setSemanas(wks)
    let found = false
    for (let i = 0; i < wks.length; i++) {
      if (wks[i].some(d => d.key === selD)) { setSelW(i); found = true; break }
    }
    if (!found) { setSelW(0); const f = wks[0]?.find(d => d.inMonth); if (f) setSelD(f.key) }
  }, [vY, vM])

  // ─── Scores ──────────────────────────────────────────────
  function getVendedorMeta(vid) {
    const m = metasVendedor.find(mv => mv.vendedor_id === vid)
    // Fallback: distribui a meta da loja por vendedor (só quando não há meta individual)
    const nv = vendedores.length || 1
    const metaVendaFallback = metaLoja?.meta_total ? (metaLoja.meta_total / nv) : 0
    return {
      meta_venda:  m != null ? (m.meta_venda  ?? 0) : metaVendaFallback,
      meta_ticket: m != null ? (m.meta_ticket ?? 0) : 0,
      meta_pa:     m != null ? (m.meta_pa     ?? 0) : 0,
    }
  }

  function abrirModalMetas() {
    setFMetaLojaEsp(metaLoja?.meta_loja || '')
    setFMetaTotal(metaLoja?.meta_total || '')
    setFPesoVenda(String(metaLoja?.peso_venda || 40))
    setFPesoTicket(String(metaLoja?.peso_ticket || 30))
    setFPesoPA(String(metaLoja?.peso_pa || 30))
    const mv = {}
    vendedores.forEach(v => {
      const m = metasVendedor.find(x => x.vendedor_id === v.id)
      mv[v.id] = {
        venda:  m != null ? String(m.meta_venda  ?? '') : '',
        ticket: m != null ? String(m.meta_ticket ?? '') : '',
        pa:     m != null ? String(m.meta_pa     ?? '') : '',
      }
    })
    setFMetasVend(mv)
    setMsgM('')
    setModalMetas(true)
  }

  async function salvarMetas() {
    if (!loja) return
    const pesoV = parseInt(fPesoVenda) || 40
    const pesoT = parseInt(fPesoTicket) || 30
    const pesoP = parseInt(fPesoPA) || 30
    if (pesoV + pesoT + pesoP !== 100) {
      setMsgM('Os pesos devem somar exatamente 100%.')
      return
    }
    setSavingM(true); setMsgM('')

    // Salva meta da loja
    await supabase.from('metas_loja').upsert({
      loja_id: loja.id, ano: vY, mes: vM + 1,
      meta_loja:  parseFloat(fMetaLojaEsp) || 0,
      meta_total: parseFloat(fMetaTotal)   || 0,
      peso_venda: pesoV, peso_ticket: pesoT, peso_pa: pesoP,
    }, { onConflict: 'loja_id,ano,mes' })

    // Salva metas por vendedor
    // IMPORTANTE: semana=null não conflita no UNIQUE do Postgres (NULL≠NULL),
    // por isso usamos DELETE + INSERT para garantir idempotência.
    for (const v of vendedores) {
      const mv = fMetasVend[v.id] || {}
      await supabase.from('metas_vendedor')
        .delete()
        .eq('vendedor_id', v.id)
        .eq('loja_id', loja.id)
        .eq('ano', vY)
        .eq('mes', vM + 1)
        .is('semana', null)

      await supabase.from('metas_vendedor').insert({
        vendedor_id: v.id, loja_id: loja.id, ano: vY, mes: vM + 1, semana: null,
        meta_venda:  parseFloat(mv.venda)  || 0,
        meta_ticket: parseFloat(mv.ticket) || 0,
        meta_pa:     parseFloat(mv.pa)     || 0,
      })
    }

    setSavingM(false)
    setMsgM('Metas salvas com sucesso!')
    load()
  }

  // ─── Lançar vendas ───────────────────────────────────────
  async function lancarVendas() {
    if (!selVendedor || !loja) return
    setSavingL(true)
    const payload = {
      vendedor_id: selVendedor.id, loja_id: loja.id, data: selD,
      vendas: parseFloat(fVendas) || 0,
      atendimentos: parseInt(fAtend) || 0,
      pecas: parseInt(fPecas) || 0,
    }
    await supabase.from('lancamentos').upsert(payload, { onConflict: 'vendedor_id,data' })
    setFVendas(''); setFAtend(''); setFPecas('')
    setSavingL(false)
    setModalLancar(false)
    load()
  }

  async function abrirModalEquipe() {
    if (!loja) return
    setMsgV('')
    setNovoVendedor({ nome: '', foto_url: '' })
    const { data: vs } = await supabase.from('vendedores').select('*').eq('loja_id', loja.id).order('nome')
    const vendedoresList = vs || []
    // Busca emails dos usuários vinculados
    const userIds = vendedoresList.filter(v => v.usuario_id).map(v => v.usuario_id)
    let emailMap = {}
    if (userIds.length > 0) {
      const { data: us } = await supabase.from('usuarios').select('id, email').in('id', userIds)
      ;(us || []).forEach(u => { emailMap[u.id] = u.email })
    }
    setVendedoresModal(vendedoresList.map(v => ({ ...v, _email: emailMap[v.usuario_id] || null })))
    setModalEquipe(true)
  }

  async function handleFotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoPreview(URL.createObjectURL(file))
    setUploadingFoto(true)
    setMsgV('')

    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/upload-avatar', { method: 'POST', body: form })
    const json = await res.json()

    if (!res.ok || json.error) {
      setMsgV('Erro no upload: ' + (json.error || 'Tente novamente.'))
      setFotoPreview(null)
    } else {
      setNovoVendedor(p => ({ ...p, foto_url: json.url }))
    }
    setUploadingFoto(false)
  }

  function limparFoto() {
    setFotoPreview(null)
    setNovoVendedor(p => ({ ...p, foto_url: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function adicionarVendedor() {
    if (!novoVendedor.nome.trim() || !loja) return
    setSavingV(true); setMsgV('')
    const { error } = await supabase.from('vendedores').insert({
      nome: novoVendedor.nome.trim(),
      foto_url: novoVendedor.foto_url.trim() || null,
      loja_id: loja.id,
      ativo: true,
    })
    if (error) { setMsgV('Erro: ' + error.message) }
    else {
      setNovoVendedor({ nome: '', foto_url: '' })
      setFotoPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMsgV('Vendedor adicionado!')
      const { data } = await supabase.from('vendedores').select('*').eq('loja_id', loja.id).order('nome')
      setVendedoresModal(data || [])
      load()
    }
    setSavingV(false)
  }

  async function toggleVendedor(v) {
    setTogglingId(v.id)
    await supabase.from('vendedores').update({ ativo: !v.ativo }).eq('id', v.id)
    const { data } = await supabase.from('vendedores').select('*').eq('loja_id', loja.id).order('nome')
    setVendedoresModal(data || [])
    setTogglingId(null)
    load()
  }

  function abrirEdicao(v) {
    setEditandoId(v.id)
    setEditNome(v.nome)
    setEditFotoUrl(v.foto_url || '')
    setEditPreview(v.foto_url || null)
    setEditEmail(v._email || '')
    setEditEmailMsg('')
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditNome('')
    setEditFotoUrl('')
    setEditPreview(null)
    setEditEmail('')
    setEditEmailMsg('')
    if (editFileRef.current) editFileRef.current.value = ''
  }

  async function handleEditFotoSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setEditPreview(URL.createObjectURL(file))
    setUploadingEdit(true)
    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/upload-avatar', { method: 'POST', body: form })
    const json = await res.json()
    if (!res.ok || json.error) {
      setEditPreview(editFotoUrl || null)
    } else {
      setEditFotoUrl(json.url)
    }
    setUploadingEdit(false)
  }

  async function salvarEdicaoVendedor() {
    if (!editNome.trim() || !editandoId) return
    setSavingEdit(true)
    setEditEmailMsg('')

    // Resolve usuario_id pelo email informado
    let usuario_id = undefined
    if (editEmail.trim()) {
      const { data: u } = await supabase.from('usuarios').select('id').eq('email', editEmail.trim().toLowerCase()).maybeSingle()
      if (!u) {
        setEditEmailMsg('⚠️ Email não encontrado. Verifique se o usuário já realizou login.')
        setSavingEdit(false)
        return
      }
      usuario_id = u.id
    }

    const update = { nome: editNome.trim(), foto_url: editFotoUrl || null }
    if (usuario_id !== undefined) update.usuario_id = usuario_id

    await supabase.from('vendedores').update(update).eq('id', editandoId)
    await abrirModalEquipe() // recarrega com emails
    cancelarEdicao()
    setSavingEdit(false)
    load()
  }

  function changeMonth(d) {
    let nm = vM + d, ny = vY
    if (nm > 11) { nm = 0; ny++ }
    if (nm < 0)  { nm = 11; ny-- }
    setVM(nm); setVY(ny)
  }

  const selObjDia = (semanas[selW] || []).find(d => d.key === selD)
  const todayKey  = toDateKey(TODAY)
  const vencedores = vendedores.filter(v => (scores[v.id]?.score || 0) >= 100)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-stone-400 text-sm">Carregando...</div>
    </div>
  )

  // ── KPIs para o header ──
  const todayKey2    = toDateKey(TODAY)
  const ontemDate    = new Date(TODAY); ontemDate.setDate(ontemDate.getDate() - 1)
  const ontemKey     = toDateKey(ontemDate)
  const totalVendas  = lancamentos.reduce((s, l) => s + (l.vendas || 0), 0)
  const vendasHoje   = lancamentos.filter(l => l.data === todayKey2).reduce((s, l) => s + (l.vendas || 0), 0)
  const vendasOntem  = lancamentos.filter(l => l.data === ontemKey).reduce((s, l) => s + (l.vendas || 0), 0)
  const metaTotal        = metaLoja?.meta_total || 0
  const metaLojaEsp      = metaLoja?.meta_loja  || 0
  const atingimento      = metaTotal    > 0 ? (totalVendas / metaTotal)   * 100 : 0
  const atingimentoLoja  = metaLojaEsp  > 0 ? (totalVendas / metaLojaEsp) * 100 : 0
  const atingimentoVend  = metaTotal    > 0 ? (totalVendas / metaTotal)   * 100 : 0

  const TABS_GERENTE = [
    { key: 'mes',    label: '📅 Mês',    activeClass: 'bg-white text-black' },
    { key: 'diaria', label: '🏁 Diária', activeClass: 'bg-white text-black' },
    { key: 'anual',  label: '📊 Anual',  activeClass: 'bg-white text-black' },
    { key: 'vendas', label: '💰 Vendas', activeClass: 'bg-white text-black' },
    { key: 'guerra', label: '⚔️ Guerra', activeClass: 'bg-red-600 text-white' },
  ]

  function handleSetVisao(v) {
    setVisao(v)
    if (v === 'vendas') { setSelDs([]); setSelW(0) }
  }

  const rankingInsights = rankingAtual.map(r => ({ ...r, totalVendas: scores[r.id]?.stats?.vendas || 0 }))

  // Análise de metas (modal)
  const mAnalLoja    = parseFloat(fMetaLojaEsp) || 0
  const mAnalEquipe  = parseFloat(fMetaTotal)   || 0
  const mAnalDiff    = mAnalEquipe - mAnalLoja
  const mAnalMax     = Math.max(mAnalLoja, mAnalEquipe, 1)
  const mAnalPctLoja   = Math.min((mAnalLoja   / mAnalMax) * 100, 100)
  const mAnalPctEquipe = Math.min((mAnalEquipe / mAnalMax) * 100, 100)

  return (
    <motion.div
      animate={ultrapassou ? { x: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#0b1220] text-white"
    >
      <audio ref={audioRef} src="/sounds/overtake.mp3" preload="auto" />

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* Header com KPIs */}
        <HeaderAbsurdo
          titulo={`🏁 ${visaoConsol ? 'Visão Consolidada' : loja?.nome || 'Minha Loja'}`}
          subtitulo={`${vendedores.length} vendedor${vendedores.length !== 1 ? 'es' : ''} ativo${vendedores.length !== 1 ? 's' : ''} • atualização em tempo real`}
          perfil="Gerente"
          perfilCor="bg-indigo-500/20 text-indigo-300"
          totalVendas={totalVendas}
          metaTotal={metaLojaEsp > 0 ? metaLojaEsp : metaTotal}
          metaTotalVend={metaTotal}
          atingimento={atingimento}
          atingimentoLoja={atingimentoLoja}
          atingimentoVend={atingimentoVend}
          vendedores={vendedores.length}
          ranking={rankingInsights}
          mesLabel={`${MESES[vM]} ${vY}`}
          visao={visao}
          setVisao={handleSetVisao}
          onPrev={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          onSair={() => router.replace('/')}
          vendasHoje={vendasHoje}
          vendasOntem={vendasOntem}
          labelVendas="Vendas da Loja"
          labelMeta="Meta da Loja"
          labelAting="loja no mês"
          labelVend="Vendedores"
          tvHref="/gerente/tv"
          tabs={TABS_GERENTE}
        />

        {/* Seletor de loja — multi-loja */}
        {lojas.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Loja:</span>
            {lojas.map(l => (
              <button key={l.id}
                onClick={() => {
                  setLoja(l); setVisaoConsol(false)
                  const d = lojaData[l.id] || {}
                  setVendedores(d.vendedores || [])
                  setMetaLoja(d.metaLoja || null)
                  setLancamentos(d.lancamentos || [])
                  setMetasVendedor(d.metasVendedor || [])
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${!visaoConsol && loja?.id === l.id ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>
                {l.nome}
              </button>
            ))}
            <button onClick={() => setVisaoConsol(v => !v)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${visaoConsol ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>
              Consolidado
            </button>
          </div>
        )}

        {/* Botões de gestão */}
        <div className="flex gap-2 justify-end">
          <button onClick={abrirModalMetas} className="px-3 py-1.5 rounded-lg text-xs border bg-yellow-500/20 text-yellow-300 border-yellow-400/30 hover:bg-yellow-500/30 transition-all">⚙ Metas</button>
          <button onClick={abrirModalEquipe} className="px-3 py-1.5 rounded-lg text-xs border bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30 transition-all">👥 Equipe</button>
        </div>

        {/* Banner vencedores */}
        {vencedores.length > 0 && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-400/30 text-green-300 text-sm font-semibold text-center">
            🏆 {vencedores.length === vendedores.length ? 'Toda a equipe bateu a meta do mês!' : `${vencedores.map(v => v.nome).join(', ')} atingiu a meta!`}
          </div>
        )}

        {/* ── VISÃO: MÊS ── */}
        {visao === 'mes' && visaoConsol ? (
          <div className="space-y-3">
            {lojas.map(l => {
              const d = lojaData[l.id] || { vendedores: [], lancamentos: [], metaLoja: null, metasVendedor: [] }
              const scoresLoja = {}
              d.vendedores.forEach(v => {
                const lcs  = d.lancamentos.filter(lc => lc.vendedor_id === v.id)
                const st   = aggregateLancamentos(lcs)
                const meta = (d.metasVendedor || []).find(m => m.vendedor_id === v.id) || {}
                const pesos = { peso_venda: d.metaLoja?.peso_venda || 40, peso_ticket: d.metaLoja?.peso_ticket || 30, peso_pa: d.metaLoja?.peso_pa || 30 }
                const calc = calcScore(st, meta, pesos)
                scoresLoja[v.id] = { ...calc, scoreDisplay: calc.score, score: applyWeekPos(calc.score, weekNumber) }
              })
              return (
                <div key={l.id} className="card p-4">
                  <p className="text-sm font-bold text-stone-700 mb-3">{l.nome}</p>
                  <RaceTrack vendedores={d.vendedores} scores={scoresLoja} semanas={Math.min(semanas.length, 4)} />
                </div>
              )
            })}
          </div>
        ) : visao === 'mes' ? (
          <div className="card p-4">
            <p className="section-title mb-4">Pista do Mês</p>
            <RaceTrack vendedores={vendedores} scores={scores} semanas={Math.min(semanas.length, 4)} />
          </div>
        ) : null}

        {/* ── VISÃO: MÊS (score cards + lançamentos + ranking) ── */}
        {visao === 'mes' && <>

        {/* Classificação do Mês */}
        {(() => {
          const rankVendedores = [...vendedores]
            .map((v, i) => ({ id: v.id, nome: v.nome, percentual: scores[v.id]?.scoreDisplay || 0 }))
            .sort((a, b) => b.percentual - a.percentual)
          const lojaDataVend = {}
          vendedores.forEach(v => {
            lojaDataVend[v.id] = { lancamentos: lancamentos.filter(l => l.vendedor_id === v.id), metaLoja: null, totalVendas: lancamentos.filter(l => l.vendedor_id === v.id).reduce((s, l) => s + (l.vendas || 0), 0) }
          })
          return (
            <div className="bg-[#0f172a] rounded-xl p-5">
              <RankingAbsurdo ranking={rankVendedores} lojaData={lojaDataVend} />
            </div>
          )
        })()}

        <div>
          <p className="section-title">Desempenho no Mês</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...vendedores]
              .map(v => ({ v, score: scores[v.id]?.scoreDisplay || 0 }))
              .sort((a, b) => b.score - a.score)
              .map(({ v }, rankIdx) => (
                <ScoreCard key={v.id}
                  vendedor={{ ...v, meta: getVendedorMeta(v.id) }}
                  stats={scores[v.id]?.stats}
                  scored={scores[v.id]}
                  index={rankIdx}
                  movimento={movimentosVend[v.id]}
                />
              ))}
          </div>
        </div>

        </>}

        {/* ── VISÃO: VENDAS ── */}
        {visao === 'vendas' && <>

        {/* Seletor de semana */}
        <div>
          <p className="section-title">Semanas do Mês</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {semanas.map((w, i) => {
              const f   = w.find(d => d.inMonth) || w[0]
              const l   = [...w].reverse().find(d => d.inMonth) || w[5]
              const act = selW === i
              return (
                <button key={i} onClick={() => {
                  setSelW(i)
                  setSelWs([i])
                  setSelDs([]) // limpa dias ao trocar semana
                  const fd = w.find(d => d.inMonth); if (fd) setSelD(fd.key)
                }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${act ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                  Sem {i + 1}
                  <span className="text-xs opacity-60 ml-1">{f.date.getDate()}–{l.date.getDate()}</span>
                </button>
              )
            })}
          </div>

          {/* Seletor de dia — multiselect, sem seleção = semana inteira */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(semanas[selW] || []).map(d => {
              const isT = d.key === todayKey
              const has = lancamentos.some(l => l.data === d.key)
              const act = selDs.includes(d.key)
              return (
                <button key={d.key} onClick={() => {
                  const isSelected = selDs.includes(d.key)
                  setSelDs(prev => isSelected ? prev.filter(k => k !== d.key) : [...prev, d.key])
                  if (!isSelected) setSelD(d.key) // só atualiza selD ao SELECIONAR
                }}
                  className={`relative px-3 py-1.5 rounded-lg text-sm border transition-all ${!d.inMonth ? 'opacity-30' : ''} ${act ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                  {d.lbl} {d.date.getDate()}
                  {isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />}
                  {has && !isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />}
                </button>
              )
            })}
          </div>

          {/* Cards de lançamento */}
          {(() => {
            const semanaKeysCur = (semanas[selW] || []).filter(d => d.inMonth).map(d => d.key)
            const keysAtivos = selDs.length > 0 ? selDs.filter(k => semanaKeysCur.includes(k)) : semanaKeysCur
            const diasSorted  = [...keysAtivos].sort()
            const tituloLancar = keysAtivos.length === 0
              ? `Semana ${selW + 1} (sem dias)`
              : keysAtivos.length === 1
                ? (() => { const o = (semanas[selW]||[]).find(d => d.key === keysAtivos[0]); return o ? `${o.lbl}, ${o.date.getDate()}/${vM+1}` : keysAtivos[0] })()
                : `${diasSorted[0].slice(8,10)}/${String(vM+1).padStart(2,'0')} – ${diasSorted.at(-1).slice(8,10)}/${String(vM+1).padStart(2,'0')} (${keysAtivos.length} dias)`
            const podeLancar = keysAtivos.length === 1
            return (
              <>
                <p className="section-title">
                  {podeLancar ? 'Lançar vendas' : 'Consolidado'} — {tituloLancar}
                </p>
                {(() => {
                  const pesos = {
                    peso_venda:  metaLoja?.peso_venda  ?? 40,
                    peso_ticket: metaLoja?.peso_ticket ?? 30,
                    peso_pa:     metaLoja?.peso_pa     ?? 30,
                  }
                  const ranked = vendedores
                    .map(v => {
                      const cur  = lancamentos.find(l => l.vendedor_id === v.id && l.data === keysAtivos[0])
                      const lcsV = lancamentos.filter(l => l.vendedor_id === v.id && keysAtivos.includes(l.data))
                      const st   = aggregateLancamentos(lcsV)
                      const meta = getVendedorMeta(v.id)
                      const calc = calcScore(st, meta, pesos)
                      return { v, st, meta, calc, cur, pesos }
                    })
                    .sort((a, b) => b.calc.score - a.calc.score)

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {ranked.map(({ v, st, meta, calc, cur, pesos: p }, r) => (
                        <div key={v.id} className="flex flex-col gap-2">
                          <ScoreCard
                            vendedor={{ ...v, meta }}
                            stats={st}
                            scored={{ ...calc, scoreDisplay: calc.score, pesos: p }}
                            index={r}
                          />
                          {podeLancar && (
                            <button onClick={() => { setSelVendedor(v); setFVendas(cur?.vendas||''); setFAtend(cur?.atendimentos||''); setFPecas(cur?.pecas||''); setModalLancar(true) }}
                              className="w-full px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-medium transition-all border border-white/10">
                              + Lançar vendas
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </>
            )
          })()}
        </div>

        </>}

        {/* ── VISÃO: CORRIDA DIÁRIA ── */}
        {visao === 'diaria' && (() => {
          const todayKey2 = toDateKey(TODAY)

          function toggleDia(key) {
            setSelDs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
            setSelD(key)
          }

          const scoresDia = {}
          const allMonthKeys = semanas.flat().filter(d => d.inMonth).map(d => d.key)
          vendedores.forEach(v => {
            const keysD = selDs.length > 0 ? selDs : allMonthKeys
            const lcs   = lancamentos.filter(l => l.vendedor_id === v.id && keysD.includes(l.data))
            const st    = aggregateLancamentos(lcs)
            const meta  = getVendedorMeta(v.id)
            const pesos = { peso_venda: metaLoja?.peso_venda || 40, peso_ticket: metaLoja?.peso_ticket || 30, peso_pa: metaLoja?.peso_pa || 30 }
            const calc  = calcScore(st, meta, pesos)
            scoresDia[v.id] = {
              ...calc,
              scoreDisplay: calc.score,
              score: Math.min(calc.score, 100),
              vendas: st.vendas,
              stats: st,
              pesos,
            }
          })

          const diasSorted = [...selDs].sort()
          const tituloSel = selDs.length === 0
            ? 'Mês inteiro'
            : selDs.length === 1
            ? (() => { const o = semanas.flat().find(d => d.key === selDs[0]); return o ? `${o.lbl}, ${String(o.date.getDate()).padStart(2,'0')}/${String(vM+1).padStart(2,'0')}/${vY}` : selDs[0] })()
            : `${diasSorted[0].slice(8,10)}/${String(vM+1).padStart(2,'0')} – ${diasSorted.at(-1).slice(8,10)}/${String(vM+1).padStart(2,'0')} (${selDs.length} dias)`

          return (
            <>
              {/* Seletor multi-dia */}
              <div className="flex flex-wrap gap-2">
                {semanas.flat().filter(d => d.inMonth).map(d => {
                  const isT = d.key === todayKey2
                  const has = lancamentos.some(l => l.data === d.key)
                  const act = selDs.includes(d.key)
                  return (
                    <button key={d.key} onClick={() => toggleDia(d.key)}
                      className={`relative px-3 py-1.5 rounded-lg text-sm border transition-all ${act ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/20 hover:bg-white/20'}`}>
                      {String(d.date.getDate()).padStart(2,'0')}/{String(vM+1).padStart(2,'0')}
                      {isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />}
                      {has && !isT && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400" />}
                    </button>
                  )
                })}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pista — {tituloSel}</p>
                <RaceTrack vendedores={vendedores} scores={scoresDia} semanas={0} />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                  Desempenho {selDs.length === 0 ? '(mês inteiro)' : selDs.length > 1 ? `(${selDs.length} dias)` : 'do Dia'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[...vendedores]
                    .map(v => ({ v, sc: scoresDia[v.id] || { score: 0, scoreDisplay: 0, pv: 0, pt: 0, pp: 0, stats: { vendas: 0, atendimentos: 0, pecas: 0, ticket: 0 }, pesos: {} } }))
                    .sort((a, b) => (b.sc.scoreDisplay ?? b.sc.score) - (a.sc.scoreDisplay ?? a.sc.score))
                    .map(({ v, sc }, r) => {
                      const meta = getVendedorMeta(v.id)
                      return (
                        <ScoreCard key={v.id}
                          vendedor={{ ...v, meta }}
                          stats={sc.stats}
                          scored={sc}
                          index={r}
                        />
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
            setAnosSel(prev => prev.includes(ano) ? prev.length > 1 ? prev.filter(a => a !== ano) : prev : [...prev, ano].sort((a,b) => a-b))
          }
          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-400 font-medium">Comparar anos:</span>
                {anosDisponiveis.map((ano, ai) => (
                  <button key={ano} onClick={() => toggleAno(ano)}
                    className={`px-4 py-1.5 rounded-lg text-sm border font-semibold transition-all ${anossel.includes(ano) ? 'text-white' : 'bg-white text-stone-500 border-stone-200'}`}
                    style={anossel.includes(ano) ? { background: coresAnos[ai], borderColor: coresAnos[ai] } : {}}>
                    {ano}
                  </button>
                ))}
              </div>
              {/* ── PAINEL 1: VENDAS POR MÊS ── */}
              <div className="bg-[#0b1220] border border-white/10 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
                  📅 Vendas por Mês — {anossel.join(' vs ')}
                </p>
                <div className="space-y-5">
                  {MESES.map((nomeMes, mi) => {
                    const mes    = mi + 1
                    const isCur  = anossel.includes(TODAY.getFullYear()) && mi === TODAY.getMonth()
                    const allFut = anossel.every(a => a === TODAY.getFullYear() && mi > TODAY.getMonth())
                    return (
                      <div key={mes} className={`transition-opacity ${allFut ? 'opacity-25' : ''}`}>
                        {/* Linha de cabeçalho do mês */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold w-24 ${isCur ? 'text-blue-300' : 'text-gray-300'}`}>
                            {nomeMes}{isCur && <span className="ml-1 text-blue-400 text-xs">●</span>}
                          </span>
                          <div className="flex flex-wrap gap-4">
                            {anossel.map((ano) => {
                              const d       = dadosAnual[ano]?.[mes] || { vendas: 0, meta: 0, metaLoja: 0 }
                              const pctEq   = d.meta     > 0 ? (d.vendas / d.meta)     * 100 : 0
                              const pctLj   = d.metaLoja > 0 ? (d.vendas / d.metaLoja) * 100 : null
                              const refPct  = pctLj ?? pctEq
                              const perfCor = refPct >= 70 ? 'text-green-400' : refPct >= 40 ? 'text-yellow-400' : refPct > 0 ? 'text-red-400' : 'text-gray-500'
                              const anoCor  = coresAnos[anosDisponiveis.indexOf(ano)]
                              return (
                                <div key={ano} className="flex items-center gap-3 text-xs">
                                  <span className="font-bold" style={{ color: anoCor }}>{ano}</span>
                                  <span className="text-white font-semibold">{fmtR(d.vendas)}</span>
                                  {pctLj !== null && (
                                    <span className={`font-bold ${perfCor}`}>
                                      🏬 {fmtPct(pctLj)}
                                    </span>
                                  )}
                                  {d.meta > 0 && (
                                    <span className={`font-bold ${pctLj === null ? perfCor : pctEq >= 70 ? 'text-green-400' : pctEq >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      🧑‍💼 {fmtPct(pctEq)}
                                    </span>
                                  )}
                                  {pctLj !== null && d.meta > 0 && (
                                    <span className={`${pctEq - pctLj > 0 ? 'text-yellow-300' : 'text-gray-500'} text-[10px]`}>
                                      {pctEq - pctLj > 0 ? `+${fmtPct(pctEq - pctLj)}` : fmtPct(pctEq - pctLj)} dif.
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Barras por ano */}
                        <div className="space-y-1.5">
                          {anossel.map((ano) => {
                            const d      = dadosAnual[ano]?.[mes] || { vendas: 0, meta: 0, metaLoja: 0 }
                            const maxRef = Math.max(d.meta, d.metaLoja, d.vendas, 1)
                            const wV     = Math.min((d.vendas   / maxRef) * 100, 100)
                            const wEq    = d.meta     > 0 ? Math.min((d.meta     / maxRef) * 100, 100) : 0
                            const wLj    = d.metaLoja > 0 ? Math.min((d.metaLoja / maxRef) * 100, 100) : 0
                            const anoCor = coresAnos[anosDisponiveis.indexOf(ano)]
                            return (
                              <div key={ano} className="relative h-3 bg-white/5 rounded-full overflow-visible">
                                {/* Barra de vendas */}
                                <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                  style={{ width: `${wV}%`, background: anoCor, opacity: 0.85 }} />
                                {/* Marcador meta equipe */}
                                {wEq > 0 && (
                                  <div className="absolute top-0 h-full w-0.5 bg-indigo-400/70"
                                    style={{ left: `${wEq}%` }} title={`Meta Equipe: ${fmtR(d.meta)}`} />
                                )}
                                {/* Marcador meta loja */}
                                {wLj > 0 && (
                                  <div className="absolute top-0 h-full w-0.5 bg-blue-400/70"
                                    style={{ left: `${wLj}%` }} title={`Meta Loja: ${fmtR(d.metaLoja)}`} />
                                )}
                              </div>
                            )
                          })}
                          {/* Legenda dos marcadores (só no primeiro mês ou quando há dados) */}
                          {mi === 0 && (
                            <div className="flex gap-4 text-[10px] text-gray-500 mt-1">
                              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400/70" /> Meta Loja</span>
                              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-indigo-400/70" /> Meta Equipe</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── PAINEL 2: ATINGIMENTO POR VENDEDOR ── */}
              {anossel.map((ano) => {
                const anoCor  = coresAnos[anosDisponiveis.indexOf(ano)]
                const totalAno = vendedores.reduce((s, v) =>
                  s + Object.values(dadosAnual[ano] || {}).reduce((ss, m) => ss + (m.porVendedor?.[v.id]?.vendas || 0), 0), 0)

                // totais por vendedor para calcular média
                const totaisVend = vendedores.map(v => ({
                  ...v,
                  total: Object.values(dadosAnual[ano] || {}).reduce((s, m) => s + (m.porVendedor?.[v.id]?.vendas || 0), 0)
                }))
                const mediaVend = totaisVend.length > 0
                  ? totaisVend.reduce((s, v) => s + v.total, 0) / totaisVend.length
                  : 0
                const maxVend = Math.max(...totaisVend.map(v => v.total), 1)

                return (
                  <div key={ano} className="bg-[#0b1220] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: anoCor }} />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          🧑‍💼 Atingimento por Vendedor — {ano}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-white">{fmtR(totalAno)}</span>
                    </div>

                    <div className="space-y-3">
                      {totaisVend
                        .sort((a, b) => b.total - a.total)
                        .map((v, vi) => {
                          const mm      = getVendedorMeta(v.id)
                          const pct     = mm.meta_venda > 0 ? (v.total / mm.meta_venda) * 100 : 0
                          const wBar    = Math.min((v.total / maxVend) * 100, 100)
                          const acimaMd = v.total >= mediaVend
                          const perfCor = pct >= 100 ? '#34d399' : pct >= 70 ? '#facc15' : pct >= 40 ? '#f59e0b' : '#f87171'
                          const CORES   = ['#2979FF','#FF3D6B','#00E096','#f59e0b','#818cf8']
                          const barCor  = CORES[vi % CORES.length]

                          return (
                            <div key={v.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-4">{vi + 1}</span>
                                  <span className="text-sm font-semibold text-white">{v.nome}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    acimaMd ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                  }`}>
                                    {acimaMd ? '▲ acima da média' : '▼ abaixo da média'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-gray-400">{fmtR(v.total)}</span>
                                  <span className="font-bold" style={{ color: perfCor }}>{pct > 0 ? fmtPct(pct) : '—'}</span>
                                </div>
                              </div>

                              {/* Barra de progresso */}
                              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${wBar}%`, background: barCor }} />
                                {/* Marcador de média */}
                                {maxVend > 0 && (
                                  <div className="absolute top-0 h-full w-px bg-white/30"
                                    style={{ left: `${Math.min((mediaVend / maxVend) * 100, 100)}%` }} />
                                )}
                              </div>

                              {/* Breakdown por mês — linha de sparkline compacta */}
                              <div className="flex gap-1 mt-2">
                                {MESES.map((_, mi) => {
                                  const mes  = mi + 1
                                  const vv   = dadosAnual[ano]?.[mes]?.porVendedor?.[v.id]?.vendas || 0
                                  const fut  = ano === TODAY.getFullYear() && mi > TODAY.getMonth()
                                  const maxM = Math.max(...MESES.map((_, i) => dadosAnual[ano]?.[i+1]?.porVendedor?.[v.id]?.vendas || 0), 1)
                                  const h    = vv > 0 ? Math.max(Math.round((vv / maxM) * 20), 4) : 2
                                  return (
                                    <div key={mi} className="flex-1 flex flex-col items-center gap-0.5" title={`${MESES[mi]}: ${fmtR(vv)}`}>
                                      <div className={`w-full rounded-sm transition-all duration-500 ${fut ? 'opacity-20' : ''}`}
                                        style={{ height: `${h}px`, background: vv > 0 ? barCor : 'rgba(255,255,255,0.08)' }} />
                                      <span className="text-[8px] text-gray-600">{MESES[mi].slice(0,1)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                      })}
                    </div>

                    {/* Linha de média */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs text-gray-500">
                      <span>Média por vendedor</span>
                      <span className="font-semibold text-gray-400">{fmtR(mediaVend)}</span>
                    </div>
                  </div>
                )
              })}
            </>
          )
        })()}

        {/* ── VISÃO: SALA DE GUERRA ── */}
        {visao === 'guerra' && (() => {
          const ranking = [...vendedores]
            .map((v, i) => ({ id: v.id, nome: v.nome, codigo: null, percentual: scores[v.id]?.scoreDisplay || 0 }))
            .sort((a, b) => b.percentual - a.percentual)
          return (
            <div className="bg-[#0f172a] rounded-xl p-6 shadow-xl space-y-4 relative text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                ⚔️ Sala de Guerra — {loja?.nome}
                <span className="text-xs font-normal text-white/40 ml-1">ranking ao vivo</span>
              </h2>
              {ranking.map((item, index) => {
                const bateuMeta = item.percentual >= 100
                return (
                  <motion.div key={item.id} layout className={`p-3 rounded-lg transition-all ${index === 0 ? 'bg-yellow-500/10 border border-yellow-400/30' : 'bg-white/5 border border-white/10'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-4">{index + 1}</span>
                        <span className="text-lg">{['🥇','🥈','🥉'][index] ?? null}</span>
                        <span className="text-sm font-semibold">{item.nome}</span>
                      </div>
                      <span className={`font-bold text-sm ${bateuMeta ? 'text-yellow-400' : 'text-green-400'}`}>{item.percentual.toFixed(1)}%{bateuMeta && ' 🏆'}</span>
                    </div>
                    <div className="w-full h-6 bg-white/10 rounded-full relative overflow-hidden">
                      <motion.div animate={{ width: `${Math.min(item.percentual, 100)}%` }} transition={{ duration: 0.8 }}
                        className={`h-full bg-gradient-to-r ${index === 0 ? 'from-yellow-400 to-orange-500' : index === 1 ? 'from-slate-400 to-slate-300' : index === 2 ? 'from-amber-700 to-amber-500' : 'from-purple-500 to-blue-500'}`} />
                      <motion.div animate={{ left: `${Math.min(item.percentual, 98)}%` }} transition={{ type: 'spring', stiffness: 80, damping: 12 }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2">
                        <motion.span animate={{ scaleX: [-1,-1], rotate: [0,8,-6,4,0] }} transition={{ duration: 0.6, repeat: Infinity }}
                          style={{ display: 'inline-block', scaleX: -1, filter: ['hue-rotate(40deg) saturate(2) brightness(1.1)','grayscale(1) brightness(1.8)','hue-rotate(20deg) saturate(2)','hue-rotate(200deg) saturate(1.5) brightness(1.3)','hue-rotate(120deg) saturate(1.5)'][index] ?? 'hue-rotate(120deg) saturate(1.5)' }} className="text-2xl">🏎️</motion.span>
                      </motion.div>
                      {bateuMeta && <div className="absolute right-2 top-1 text-sm">🏁</div>}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        })()}

      </main>

      {/* Modal: Lançar Vendas */}
      {modalLancar && selVendedor && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4">
              <Avatar nome={selVendedor.nome} fotoUrl={selVendedor.foto_url}
                index={vendedores.findIndex(v => v.id === selVendedor.id)} size={36} />
              <div>
                <p className="font-semibold text-stone-900">{selVendedor.nome}</p>
                <p className="text-xs text-stone-400">{selObjDia ? `${selObjDia.lbl}, ${selObjDia.date.getDate()}/${vM + 1}` : selD}</p>
              </div>
            </div>
            <div className="space-y-3 mb-4">
              <div><label className="label-field">Total de Vendas do dia (R$)</label>
                <CurrencyInput value={fVendas} onChange={setFVendas} placeholder="R$ 0,00" /></div>
              <div><label className="label-field">Nº de Atendimentos</label>
                <input type="number" value={fAtend} onChange={e => setFAtend(e.target.value)} placeholder="0" min="0" /></div>
              <div><label className="label-field">Nº de Peças Vendidas</label>
                <input type="number" value={fPecas} onChange={e => setFPecas(e.target.value)} placeholder="0" min="0" /></div>
            </div>
            <p className="text-xs text-stone-400 mb-4">
              Informe o total acumulado do dia. Ticket Médio e PA serão calculados automaticamente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setModalLancar(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={lancarVendas} disabled={savingL} className="btn-success flex-1">
                {savingL ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Equipe */}
      {modalEquipe && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">👥 Equipe</h2>
                <p className="text-xs text-stone-400">{loja?.nome}</p>
              </div>
              <button onClick={() => setModalEquipe(false)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">&times;</button>
            </div>

            {/* Lista de vendedores */}
            <div className="space-y-2 mb-5">
              {vendedoresModal.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-4">Nenhum vendedor cadastrado.</p>
              )}
              {vendedoresModal.map((v, i) => (
                <div key={v.id} className="border-b border-stone-100 last:border-0 py-2">
                  {editandoId === v.id ? (
                    /* ── Formulário de edição inline ── */
                    <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar nome={editNome || v.nome} fotoUrl={editPreview} index={i} size={34} />
                        <input
                          className="flex-1 text-sm font-semibold border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-stone-400"
                          value={editNome}
                          onChange={e => setEditNome(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && salvarEdicaoVendedor()}
                          autoFocus
                        />
                      </div>

                      {/* Email / login */}
                      <input
                        className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-stone-400 text-stone-600"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        placeholder="Email de login (opcional)"
                      />
                      {editEmailMsg && <p className="text-xs text-amber-600">{editEmailMsg}</p>}

                      {/* Foto edição */}
                      <input ref={editFileRef} type="file" accept="image/*" className="hidden" onChange={handleEditFotoSelect} />
                      {uploadingEdit
                        ? <p className="text-xs text-stone-400 animate-pulse">Enviando foto...</p>
                        : editPreview && editPreview !== v.foto_url
                          ? <p className="text-xs text-green-600">Foto atualizada ✓ <button type="button" className="text-red-400 hover:underline ml-1" onClick={() => { setEditPreview(v.foto_url || null); setEditFotoUrl(v.foto_url || '') }}>desfazer</button></p>
                          : <button type="button" onClick={() => editFileRef.current?.click()} className="text-xs text-indigo-600 hover:underline">📷 {editPreview ? 'Trocar foto' : 'Adicionar foto'}</button>
                      }

                      <div className="flex gap-2 pt-1">
                        <button onClick={salvarEdicaoVendedor} disabled={savingEdit || !editNome.trim()} className="btn-success text-xs px-3 py-1">
                          {savingEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button onClick={cancelarEdicao} className="text-xs px-3 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Linha normal ── */
                    <div className="flex items-center gap-3">
                      <Avatar nome={v.nome} fotoUrl={v.foto_url} index={i} size={34} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{v.nome}</p>
                        <span className={`text-xs ${v.ativo ? 'text-green-600' : 'text-stone-400'}`}>
                          {v.ativo ? 'ativo' : 'inativo'}
                        </span>
                        {v._email
                          ? <p className="text-xs text-stone-400 truncate">{v._email}</p>
                          : <p className="text-xs text-stone-300 italic">sem login vinculado</p>
                        }
                      </div>
                      <button
                        onClick={() => abrirEdicao(v)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 transition-all">
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => toggleVendedor(v)}
                        disabled={togglingId === v.id}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${v.ativo ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {togglingId === v.id ? '...' : v.ativo ? 'Inativar' : 'Ativar'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Adicionar novo vendedor */}
            <div className="bg-stone-50 rounded-lg p-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Novo Vendedor</p>
              <div className="space-y-3 mb-3">
                <div>
                  <label className="label-field">Nome *</label>
                  <input
                    value={novoVendedor.nome}
                    onChange={e => setNovoVendedor(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Maria Silva"
                    onKeyDown={e => e.key === 'Enter' && adicionarVendedor()}
                  />
                </div>

                <div>
                  <label className="label-field">Foto (opcional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFotoSelect}
                  />

                  {fotoPreview ? (
                    <div className="flex items-center gap-3 mt-1">
                      <img
                        src={fotoPreview}
                        alt="preview"
                        className="w-14 h-14 rounded-full object-cover border-2 border-stone-200"
                      />
                      <div className="flex-1 min-w-0">
                        {uploadingFoto
                          ? <p className="text-xs text-stone-400 animate-pulse">Enviando foto...</p>
                          : <p className="text-xs text-green-600 font-medium">Foto pronta ✓</p>
                        }
                        <button
                          type="button"
                          onClick={limparFoto}
                          className="text-xs text-red-500 hover:underline mt-0.5"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-stone-300 text-sm text-stone-500 hover:border-stone-400 hover:bg-stone-50 transition-all"
                    >
                      📷 Selecionar imagem
                    </button>
                  )}
                </div>
              </div>
              {msgV && (
                <p className={`text-sm px-3 py-2 rounded-lg mb-3 ${msgV.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msgV}
                </p>
              )}
              <button onClick={adicionarVendedor} disabled={savingV || !novoVendedor.nome.trim()} className="btn-success w-full text-sm">
                {savingV ? 'Salvando...' : '+ Adicionar Vendedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Metas */}
      {modalMetas && (
          <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#0f1724] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl my-8">

              {/* HEADER */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-white">⚙️ Definição de Metas</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{loja?.nome} · {MESES[vM]} {vY}</p>
                </div>
                <button onClick={() => setModalMetas(false)} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
              </div>

              <div className="px-6 py-5 space-y-4">

                {/* BLOCO 1 — META DA LOJA */}
                <div className="bg-blue-500/5 border border-blue-400/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🏬</span>
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-widest">Meta da Loja</p>
                  </div>
                  <CurrencyInput value={fMetaLojaEsp} onChange={setFMetaLojaEsp} placeholder="Ex: 175.000,00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-400/50" />
                  <p className="text-xs text-gray-500 mt-2">Objetivo real da loja no mês</p>
                </div>

                {/* BLOCO 2 — META DA EQUIPE */}
                <div className="bg-indigo-500/5 border border-indigo-400/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">🧑‍💼</span>
                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Meta da Equipe</p>
                  </div>
                  <CurrencyInput value={fMetaTotal} onChange={setFMetaTotal} placeholder="Ex: 183.750,00"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400/50" />
                  <p className="text-xs text-gray-500 mt-2">Soma das metas dos vendedores · A meta da equipe pode ser maior que a da loja (estratégia comercial)</p>
                </div>

                {/* BLOCO ANÁLISE — só exibe quando ao menos um valor > 0 */}
                {(mAnalLoja > 0 || mAnalEquipe > 0) && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">📊 Análise de Metas</p>

                    {/* Barra comparativa */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-14 shrink-0">🏬 Loja</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${mAnalPctLoja}%` }} />
                        </div>
                        <span className="text-xs text-blue-300 w-28 text-right shrink-0">
                          {mAnalLoja > 0 ? mAnalLoja.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-14 shrink-0">🧑‍💼 Equipe</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                            style={{ width: `${mAnalPctEquipe}%` }} />
                        </div>
                        <span className="text-xs text-indigo-300 w-28 text-right shrink-0">
                          {mAnalEquipe > 0 ? mAnalEquipe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Mensagem de diferença */}
                    {mAnalLoja > 0 && mAnalEquipe > 0 && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                        mAnalDiff > 0  ? 'bg-yellow-500/10 border border-yellow-400/20 text-yellow-300'
                        : mAnalDiff < 0 ? 'bg-red-500/10 border border-red-400/20 text-red-300'
                        : 'bg-green-500/10 border border-green-400/20 text-green-300'
                      }`}>
                        {mAnalDiff > 0 && <>📈 Equipe acima da meta da loja em +{mAnalDiff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>}
                        {mAnalDiff < 0 && <>📉 Equipe abaixo da meta da loja em {mAnalDiff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>}
                        {mAnalDiff === 0 && <>✅ Equipe alinhada com a meta da loja</>}
                      </div>
                    )}
                  </div>
                )}

                {/* PESOS */}
                <div className="bg-white/3 border border-white/10 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">⚖️ Pesos do Score</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Venda (%)</label>
                      <input type="number" value={fPesoVenda} onChange={e => setFPesoVenda(e.target.value)} min="0" max="100"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Ticket (%)</label>
                      <input type="number" value={fPesoTicket} onChange={e => setFPesoTicket(e.target.value)} min="0" max="100"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">PA (%)</label>
                      <input type="number" value={fPesoPA} onChange={e => setFPesoPA(e.target.value)} min="0" max="100"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
                    </div>
                  </div>
                  {(parseInt(fPesoVenda)||0) + (parseInt(fPesoTicket)||0) + (parseInt(fPesoPA)||0) !== 100 && (
                    <p className="text-xs text-amber-400 mt-2">⚠️ Os pesos devem somar 100%. Atual: {(parseInt(fPesoVenda)||0) + (parseInt(fPesoTicket)||0) + (parseInt(fPesoPA)||0)}%</p>
                  )}
                </div>

                {/* METAS POR VENDEDOR */}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">👥 Metas por Vendedor</p>
                  <div className="space-y-2">
                    {vendedores.map(v => (
                      <div key={v.id} className="bg-white/3 border border-white/10 rounded-xl p-3">
                        <p className="text-sm font-semibold text-white mb-2">{v.nome}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Venda (R$)</label>
                            <CurrencyInput placeholder="0,00"
                              value={fMetasVend[v.id]?.venda || ''}
                              onChange={val => setFMetasVend(p => ({ ...p, [v.id]: { ...p[v.id], venda: val } }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Ticket (R$)</label>
                            <CurrencyInput placeholder="0,00"
                              value={fMetasVend[v.id]?.ticket || ''}
                              onChange={val => setFMetasVend(p => ({ ...p, [v.id]: { ...p[v.id], ticket: val } }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">PA (peças)</label>
                            <input type="number" placeholder="0" min="0" step="0.1"
                              value={fMetasVend[v.id]?.pa || ''}
                              onChange={e => setFMetasVend(p => ({ ...p, [v.id]: { ...p[v.id], pa: e.target.value } }))}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-white/30" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {msgM && (
                  <div className={`text-sm px-3 py-2 rounded-lg ${msgM.includes('sucesso') ? 'bg-green-500/10 border border-green-400/20 text-green-300' : 'bg-red-500/10 border border-red-400/20 text-red-300'}`}>
                    {msgM}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setModalMetas(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-sm font-medium transition-all">
                    Fechar
                  </button>
                  <button onClick={salvarMetas} disabled={savingM}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-bold transition-all">
                    {savingM ? 'Salvando...' : '💾 Salvar Metas'}
                  </button>
                </div>

              </div>
            </div>
          </div>
      )}

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
