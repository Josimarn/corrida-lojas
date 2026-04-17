'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'
import { getCor } from '@/lib/helpers'

const PERFIS = ['admin_cliente', 'dono', 'coordenador', 'gerente', 'vendedor']
const LABEL = {
  admin_cliente: 'Administrador',
  dono: 'Diretoria',
  coordenador: 'Coord. Regional',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

function Msg({ msg }) {
  if (!msg?.text) return null
  return (
    <p className={`text-sm px-3 py-2 rounded-lg mb-3 ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {msg.text}
    </p>
  )
}

export default function AdminPage() {
  const router   = useRouter()
  const supabase = createClientComponent()
  const [usuario,  setUsuario]  = useState(null)
  const [empresa,  setEmpresa]  = useState(null)
  const [lojas,    setLojas]    = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [gerentes, setGerentes] = useState([]) // loja_gerentes rows
  const [sups,     setSups]     = useState([]) // loja_supervisores rows
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('lojas') // 'lojas' | 'vinculos' | 'config'
  const [tema,       setTema]       = useState({ cor_primaria: '#FFBE00', cor_secundaria: '#CC8800', logo_url: '' })
  const [ticketAuto, setTicketAuto] = useState(true)
  const [savingTema, setSavingTema] = useState(false)
  const [msgTema,    setMsgTema]    = useState(null)

  // Modal: Nova Loja
  const [modalLoja,  setModalLoja]  = useState(false)
  const [novaLoja,   setNovaLoja]   = useState({ nome: '', cidade: '', estado: '' })
  const [savingL,    setSavingL]    = useState(false)
  const [msgL,       setMsgL]       = useState(null)

  // Modal: Novo Usuário (contexto de loja)
  const [modalUser,     setModalUser]     = useState(false)
  const [novoUserLojaId, setNovoUserLojaId] = useState(null) // loja para auto-vincular
  const [novoUser,      setNovoUser]      = useState({ nome: '', email: '', senha: '', perfil: 'gerente' })
  const [savingU,       setSavingU]       = useState(false)
  const [msgU,          setMsgU]          = useState(null)
  const [userCriado,    setUserCriado]    = useState(false)

  // Editar nome usuário inline
  const [editandoUserId, setEditandoUserId] = useState(null)
  const [editNomeUser,   setEditNomeUser]   = useState('')
  const [savingNU,       setSavingNU]       = useState(false)

  async function salvarNomeUsuario(uid) {
    if (!editNomeUser.trim()) return
    setSavingNU(true)
    await supabase.from('usuarios').update({ nome: editNomeUser.trim() }).eq('id', uid)
    setSavingNU(false)
    setEditandoUserId(null)
    load()
  }

  // Modal: Editar Loja
  const [modalEditLoja, setModalEditLoja] = useState(null)
  const [editLoja,      setEditLoja]      = useState({ nome: '', codigo: '', cidade: '', estado: '', exibir_como: 'nome' })
  const [savingE,       setSavingE]       = useState(false)
  const [msgE,          setMsgE]          = useState(null)
  const [selGerAdd,     setSelGerAdd]     = useState('')
  const [selSupAdd,     setSelSupAdd]     = useState('')

  // Modal: Vínculos da loja
  const [modalVinc,  setModalVinc]  = useState(null)
  const [savingV,    setSavingV]    = useState(false)
  const [msgV,       setMsgV]       = useState(null)
  const [selVincGer, setSelVincGer] = useState('')
  const [selVincSup, setSelVincSup] = useState('')

  // Filtro lojas
  const [buscaLoja, setBuscaLoja] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)

    if (u?.empresa_id) {
      const { data: e } = await supabase.from('empresas').select('*').eq('id', u.empresa_id).single()
      setEmpresa(e)
      if (e) {
        setTema({ cor_primaria: e.cor_primaria || '#FFBE00', cor_secundaria: e.cor_secundaria || '#CC8800', logo_url: e.logo_url || '' })
        setTicketAuto(e.calcular_ticket_auto !== false)
      }

      const { data: ls } = await supabase.from('lojas').select('*').eq('empresa_id', u.empresa_id).order('nome')
      setLojas(ls || [])

      const { data: us } = await supabase.from('usuarios').select('*').eq('empresa_id', u.empresa_id).order('nome')
      setUsuarios(us || [])

      const { data: gers } = await supabase.from('loja_gerentes')
        .select('loja_id, usuario_id, usuarios(id, nome, email)')
      setGerentes(gers || [])

      const { data: ss } = await supabase.from('loja_supervisores')
        .select('loja_id, usuario_id, usuarios(id, nome, email)')
      setSups(ss || [])
    }

    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ─── Tema ────────────────────────────────────────────────────
  async function salvarTema() {
    if (!empresa?.id) return
    setSavingTema(true); setMsgTema(null)
    const { error } = await supabase.from('empresas').update({
      cor_primaria:         tema.cor_primaria   || '#FFBE00',
      cor_secundaria:       tema.cor_secundaria || '#CC8800',
      logo_url:             tema.logo_url?.trim() || null,
      calcular_ticket_auto: ticketAuto,
    }).eq('id', empresa.id)
    setSavingTema(false)
    if (error) setMsgTema({ ok: false, text: 'Erro: ' + error.message })
    else { setMsgTema({ ok: true, text: 'Tema salvo com sucesso!' }); load() }
  }

  // ─── Lojas ───────────────────────────────────────────────────
  async function criarLoja() {
    if (!novaLoja.nome.trim()) return
    if (!empresa) {
      setMsgL({ text: 'Usuário sem empresa vinculada. Execute: UPDATE usuarios SET empresa_id = (SELECT id FROM empresas LIMIT 1) WHERE email = \'' + (usuario?.email || '') + '\';', ok: false })
      return
    }
    setSavingL(true); setMsgL(null)
    const { error } = await supabase.from('lojas').insert({
      nome: novaLoja.nome.trim(), cidade: novaLoja.cidade.trim(), estado: novaLoja.estado.trim().toUpperCase(),
      empresa_id: empresa.id, ativo: true,
    })
    setSavingL(false)
    if (error) setMsgL({ text: 'Erro: ' + error.message, ok: false })
    else { setMsgL({ text: 'Loja criada!', ok: true }); setNovaLoja({ nome: '', cidade: '', estado: '' }); load() }
  }

  async function toggleLoja(loja) {
    await supabase.from('lojas').update({ ativo: !loja.ativo }).eq('id', loja.id)
    load()
  }

  async function vincularEdit(lojaId, usuarioId, tipo) {
    if (!usuarioId) return
    const tabela = tipo === 'gerente' ? 'loja_gerentes' : 'loja_supervisores'
    const { error } = await supabase.from(tabela).insert({ loja_id: lojaId, usuario_id: usuarioId })
    if (error) setMsgE({ text: 'Erro ao vincular: ' + error.message, ok: false })
    else { tipo === 'gerente' ? setSelGerAdd('') : setSelSupAdd(''); await load() }
  }

  async function desvincularEdit(lojaId, usuarioId, tipo) {
    const tabela = tipo === 'gerente' ? 'loja_gerentes' : 'loja_supervisores'
    const { error } = await supabase.from(tabela).delete().eq('loja_id', lojaId).eq('usuario_id', usuarioId)
    if (error) setMsgE({ text: 'Erro ao remover: ' + error.message, ok: false })
    else await load()
  }

  async function salvarEdicaoLoja() {
    if (!editLoja.nome.trim() || !modalEditLoja) return
    setSavingE(true); setMsgE(null)

    // Salva dados da loja
    const { error } = await supabase.from('lojas').update({
      nome: editLoja.nome.trim(),
      codigo: editLoja.codigo.trim() || null,
      cidade: editLoja.cidade.trim(),
      estado: editLoja.estado.trim().toUpperCase(),
      exibir_como: editLoja.exibir_como,
    }).eq('id', modalEditLoja.id)

    // Vincula gerente selecionado (se ainda não vinculado)
    if (selGerAdd) {
      const jaVinc = gerentes.some(g => g.loja_id === modalEditLoja.id && g.usuario_id === selGerAdd)
      if (!jaVinc) await supabase.from('loja_gerentes').insert({ loja_id: modalEditLoja.id, usuario_id: selGerAdd })
    }

    // Vincula coordenador selecionado (se ainda não vinculado)
    if (selSupAdd) {
      const jaVinc = sups.some(s => s.loja_id === modalEditLoja.id && s.usuario_id === selSupAdd)
      if (!jaVinc) await supabase.from('loja_supervisores').insert({ loja_id: modalEditLoja.id, usuario_id: selSupAdd })
    }

    setSavingE(false)
    if (error) setMsgE({ text: 'Erro: ' + error.message, ok: false })
    else { setMsgE({ text: 'Salvo!', ok: true }); setSelGerAdd(''); setSelSupAdd(''); load() }
  }

  // ─── Usuários ────────────────────────────────────────────────
  async function criarUsuario() {
    if (!novoUser.nome.trim() || !novoUser.email.trim() || !novoUser.senha || !empresa) return
    setSavingU(true); setMsgU(null)

    const res = await fetch('/api/admin/criar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: novoUser.nome.trim(),
        email: novoUser.email.trim(),
        senha: novoUser.senha,
        perfil: novoUser.perfil,
        empresa_id: empresa.id,
      }),
    })
    const json = await res.json()
    setSavingU(false)

    if (!res.ok) { setMsgU({ text: 'Erro: ' + json.error, ok: false }); return }

    // Auto-vincular à loja de origem
    if (novoUserLojaId && json.id) {
      if (novoUser.perfil === 'gerente') {
        await supabase.from('loja_gerentes').insert({ loja_id: novoUserLojaId, usuario_id: json.id })
      } else if (novoUser.perfil === 'coordenador') {
        await supabase.from('loja_supervisores').insert({ loja_id: novoUserLojaId, usuario_id: json.id })
      }
    }

    setMsgU({ text: `Usuário ${novoUser.nome} criado!`, ok: true })
    setUserCriado(true)
    load()
  }

  async function toggleUsuario(u) {
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    load()
  }

  async function alterarPerfil(uid, perfil) {
    await supabase.from('usuarios').update({ perfil }).eq('id', uid)
    load()
  }

  // ─── Vínculos ────────────────────────────────────────────────
  async function vincular(lojaId, usuarioId, tipo) {
    setSavingV(true); setMsgV(null)
    const tabela = tipo === 'gerente' ? 'loja_gerentes' : 'loja_supervisores'
    const { error } = await supabase.from(tabela).insert({ loja_id: lojaId, usuario_id: usuarioId })
    setSavingV(false)
    if (error) setMsgV({ text: 'Erro: ' + error.message, ok: false })
    else { setMsgV({ text: 'Vínculo criado!', ok: true }); load() }
  }

  async function desvincular(lojaId, usuarioId, tipo) {
    setSavingV(true)
    const tabela = tipo === 'gerente' ? 'loja_gerentes' : 'loja_supervisores'
    await supabase.from(tabela).delete().eq('loja_id', lojaId).eq('usuario_id', usuarioId)
    setSavingV(false)
    load()
  }

  // ─── Helpers ─────────────────────────────────────────────────
  const perfisCounts = usuarios.reduce((acc, u) => {
    acc[u.perfil] = (acc[u.perfil] || 0) + 1; return acc
  }, {})

  function gerentesLoja(lojaId) { return gerentes.filter(g => g.loja_id === lojaId) }
  function supervisoresLoja(lojaId) { return sups.filter(s => s.loja_id === lojaId) }

  const lojasFiltradas = lojas.filter(l => {
    if (!buscaLoja) return true
    const q = buscaLoja.toLowerCase()
    const nomeGers = gerentesLoja(l.id).map(g => g.usuarios?.nome?.toLowerCase() || '').join(' ')
    const nomeSups = supervisoresLoja(l.id).map(s => s.usuarios?.nome?.toLowerCase() || '').join(' ')
    return l.nome?.toLowerCase().includes(q) ||
           l.codigo?.toLowerCase().includes(q) ||
           nomeGers.includes(q) ||
           nomeSups.includes(q)
  })

  // Usuários disponíveis para vincular (por perfil, excluindo já vinculados)
  function disponiveis(lojaId, tipo) {
    const perfil = tipo === 'gerente' ? 'gerente' : 'coordenador'
    const vinculados = tipo === 'gerente'
      ? gerentes.filter(g => g.loja_id === lojaId).map(g => g.usuario_id)
      : sups.filter(s => s.loja_id === lojaId).map(s => s.usuario_id)
    return usuarios.filter(u => u.perfil === perfil && !vinculados.includes(u.id) && u.ativo)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
      <div className="text-gray-400 text-sm">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">

        {/* Header */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">⚙️ {empresa?.nome || 'Admin'}</h1>
              <p className="text-sm text-gray-400">{lojas.length} loja{lojas.length !== 1 ? 's' : ''} cadastrada{lojas.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300">
                Administrador
              </span>
              <button onClick={() => router.replace('/')} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-all">
                Sair
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Lojas',         lojas.length,                      'cadastradas',  'text-green-400'],
              ['Usuários',      usuarios.length,                   'total',        'text-white'],
              ['Gerentes',      perfisCounts['gerente']     || 0,  'ativos',       'text-white'],
              ['Coordenadores', perfisCounts['coordenador'] || 0,  'regionais',    'text-white'],
            ].map(([l, v, s, cls]) => (
              <div key={l} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-gray-400">{l}</p>
                <p className={`text-xl font-bold ${cls}`}>{v}</p>
                <p className="text-xs text-gray-500">{s}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap mt-4">
            {[['lojas', '🏪 Lojas'], ['vinculos', '🔗 Vínculos'], ['config', '🎨 Identidade Visual']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ABA: LOJAS ── */}
        {tab === 'lojas' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0">Lojas <span className="text-gray-500 font-normal">({lojasFiltradas.length})</span></p>
              <div className="flex items-center gap-2">
                <input value={buscaLoja} onChange={e => setBuscaLoja(e.target.value)}
                  placeholder="Loja, gerente ou coord..."
                  className="text-xs border border-white/20 rounded-lg px-2 py-1.5 bg-white/10 text-white placeholder-gray-500 w-44" />
                <button onClick={() => { setModalLoja(true); setMsgL(null) }} className="btn-success text-xs">+ Nova Loja</button>
              </div>
            </div>
            {lojasFiltradas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">{buscaLoja ? 'Nenhuma loja encontrada.' : 'Nenhuma loja cadastrada.'}</p>
            ) : (
              <div className="space-y-2">
                {lojasFiltradas.map((l, i) => {
                  const c = getCor(i)
                  const gers = gerentesLoja(l.id)
                  const ss   = supervisoresLoja(l.id)
                  return (
                    <div key={l.id} className="flex items-center gap-3 py-3 border-b border-white/10 last:border-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: c.bg, color: c.border }}>
                        {l.exibir_como === 'codigo' && l.codigo
                          ? l.codigo.slice(0, 3).toUpperCase()
                          : l.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{l.nome}</p>
                        <p className="text-xs text-gray-400">
                          {[l.cidade, l.estado].filter(Boolean).join(' — ')}
                          {gers.length > 0 && <span className="ml-2 text-green-400">Ger: {gers.map(g => g.usuarios?.nome).join(', ')}</span>}
                          {ss.length > 0  && <span className="ml-2 text-blue-400">Coord: {ss.map(s => s.usuarios?.nome).join(', ')}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge text-xs ${l.ativo ? 'badge-green' : 'badge-gray'}`}>
                          {l.ativo ? 'ativa' : 'inativa'}
                        </span>
                        <button onClick={() => {
                          setModalEditLoja(l)
                          setEditLoja({ nome: l.nome, codigo: l.codigo || '', cidade: l.cidade || '', estado: l.estado || '', exibir_como: l.exibir_como || 'nome' })
                          setMsgE(null)
                          setSelGerAdd('')
                          setSelSupAdd('')
                        }}
                          className="btn-secondary text-xs px-2 py-1">✏️</button>
                        <button onClick={() => { setModalVinc(l); setMsgV(null); setSelVincGer(''); setSelVincSup('') }}
                          className="btn-info text-xs px-2 py-1">🔗</button>
                        <button onClick={() => toggleLoja(l)}
                          className="btn-secondary text-xs px-2 py-1">
                          {l.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}


        {/* ── ABA: VÍNCULOS ── */}
        {tab === 'vinculos' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Vínculos por Loja</p>
            <div className="space-y-4">
              {lojas.map((l, i) => {
                const c     = getCor(i)
                const gers  = gerentesLoja(l.id)
                const ss    = supervisoresLoja(l.id)
                return (
                  <div key={l.id} className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: c.bg, color: c.border }}>
                        {l.nome.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <p className="font-semibold text-white text-sm">{l.nome}</p>
                      {l.cidade && <p className="text-xs text-gray-400">{l.cidade}</p>}
                      <button onClick={() => { setModalVinc(l); setMsgV(null); setSelVincGer(''); setSelVincSup('') }}
                        className="ml-auto btn-info text-xs px-2 py-1">+ Vincular</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-1.5">Gerente(s)</p>
                        {gers.length === 0
                          ? <p className="text-xs text-gray-500 italic">Nenhum</p>
                          : gers.map(g => (
                            <div key={g.usuario_id} className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-white">{g.usuarios?.nome}</span>
                              <button onClick={() => desvincular(l.id, g.usuario_id, 'gerente')}
                                className="text-red-400 hover:text-red-600 ml-2">✕</button>
                            </div>
                          ))}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-1.5">Coordenador(es)</p>
                        {ss.length === 0
                          ? <p className="text-xs text-gray-500 italic">Nenhum</p>
                          : ss.map(s => (
                            <div key={s.usuario_id} className="flex items-center justify-between text-xs mb-1">
                              <span className="font-semibold text-white">{s.usuarios?.nome}</span>
                              <button onClick={() => desvincular(l.id, s.usuario_id, 'coordenador')}
                                className="text-red-400 hover:text-red-600 ml-2">✕</button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </main>

      {/* ── Modal: Editar Loja ── */}
      {modalEditLoja && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-5 pb-0 flex-shrink-0">
              <h2 className="text-lg font-bold mb-4">✏️ Editar Loja</h2>
            </div>
            <div className="overflow-y-auto flex-1 px-5">
            <div className="space-y-3 mb-4">
              <div>
                <label className="label-field">Identificar loja por</label>
                <div className="flex gap-2 mt-1">
                  {[['nome', 'Nome'], ['codigo', 'Código']].map(([val, lbl]) => (
                    <button key={val} onClick={() => setEditLoja(p => ({ ...p, exibir_como: val }))}
                      className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${editLoja.exibir_como === val ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identificador principal (destacado) */}
              {editLoja.exibir_como === 'codigo' ? (
                <div className="rounded-lg border-2 border-stone-900 p-3 bg-stone-50">
                  <label className="label-field text-stone-900 font-bold">Código (identificador) *</label>
                  <input value={editLoja.codigo} onChange={e => setEditLoja(p => ({ ...p, codigo: e.target.value }))} placeholder="Ex: 22, L05, SL-01" autoFocus />
                  <p className="text-xs text-stone-500 mt-1">Este código será exibido como nome da loja no sistema.</p>
                </div>
              ) : (
                <div className="rounded-lg border-2 border-stone-900 p-3 bg-stone-50">
                  <label className="label-field text-stone-900 font-bold">Nome (identificador) *</label>
                  <input value={editLoja.nome} onChange={e => setEditLoja(p => ({ ...p, nome: e.target.value }))} autoFocus />
                </div>
              )}

              {/* Campo secundário */}
              {editLoja.exibir_como === 'codigo' && (
                <div>
                  <label className="label-field text-stone-400">Nome completo (referência interna)</label>
                  <input value={editLoja.nome} onChange={e => setEditLoja(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo da loja" />
                </div>
              )}

              <div><label className="label-field">Cidade</label>
                <input value={editLoja.cidade} onChange={e => setEditLoja(p => ({ ...p, cidade: e.target.value }))} placeholder="São Paulo" /></div>
              <div><label className="label-field">Estado (UF)</label>
                <input value={editLoja.estado} onChange={e => setEditLoja(p => ({ ...p, estado: e.target.value }))} placeholder="SP" maxLength={2} /></div>
            </div>

            {/* Vínculos inline */}
            <div className="border-t border-stone-100 pt-3 mb-4 space-y-3">
              {/* Gerentes */}
              <div>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Gerentes</p>
                {gerentesLoja(modalEditLoja.id).length === 0
                  ? <p className="text-xs text-stone-300 italic mb-1">Nenhum</p>
                  : gerentesLoja(modalEditLoja.id).map(g => (
                    <div key={g.usuario_id} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0">
                      <span className="text-sm font-semibold text-stone-800">{g.usuarios?.nome}</span>
                      <button onClick={() => desvincularEdit(modalEditLoja.id, g.usuario_id, 'gerente')}
                        className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                    </div>
                  ))}
                {disponiveis(modalEditLoja.id, 'gerente').length > 0 && (
                  <div className="flex gap-2 mt-2">
                    <select value={selGerAdd} onChange={e => setSelGerAdd(e.target.value)}
                      className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white">
                      <option value="">Selecione...</option>
                      {disponiveis(modalEditLoja.id, 'gerente').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                    <button onClick={() => vincularEdit(modalEditLoja.id, selGerAdd, 'gerente')}
                      disabled={!selGerAdd} className="btn-success text-xs px-3">+ Add</button>
                  </div>
                )}
              </div>

              {/* Coordenadores */}
              <div>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5">Coordenadores</p>
                {supervisoresLoja(modalEditLoja.id).length === 0
                  ? <p className="text-xs text-stone-300 italic mb-1">Nenhum</p>
                  : supervisoresLoja(modalEditLoja.id).map(s => (
                    <div key={s.usuario_id} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0">
                      <span className="text-sm font-semibold text-stone-800">{s.usuarios?.nome}</span>
                      <button onClick={() => desvincularEdit(modalEditLoja.id, s.usuario_id, 'coordenador')}
                        className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                    </div>
                  ))}
                {disponiveis(modalEditLoja.id, 'coordenador').length > 0 && (
                  <div className="flex gap-2 mt-2">
                    <select value={selSupAdd} onChange={e => setSelSupAdd(e.target.value)}
                      className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white">
                      <option value="">Selecione...</option>
                      {disponiveis(modalEditLoja.id, 'coordenador').map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                    <button onClick={() => vincularEdit(modalEditLoja.id, selSupAdd, 'coordenador')}
                      disabled={!selSupAdd} className="btn-info text-xs px-3">+ Add</button>
                  </div>
                )}
              </div>
            </div>

            {/* Usuários da Loja */}
            <div className="border-t border-stone-100 pt-3 mb-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Usuários da Loja</p>
                <button onClick={() => {
                  setNovoUserLojaId(modalEditLoja.id)
                  setNovoUser({ nome: '', email: '', senha: '', perfil: 'gerente' })
                  setMsgU(null); setUserCriado(false); setModalUser(true)
                }} className="btn-info text-xs px-2 py-1">+ Novo</button>
              </div>
              {(() => {
                const gers = gerentesLoja(modalEditLoja.id)
                const ss   = supervisoresLoja(modalEditLoja.id)
                const todos = [
                  ...gers.map(g => ({ ...g.usuarios, _tipo: 'Gerente' })),
                  ...ss.map(s => ({ ...s.usuarios, _tipo: 'Coordenador' })),
                ]
                if (todos.length === 0) return <p className="text-xs text-stone-300 italic">Nenhum usuário vinculado.</p>
                return todos.map(u => (
                  <div key={u.id + u._tipo} className="flex items-center justify-between py-1.5 border-b border-stone-50 last:border-0">
                    <div>
                      <span className="text-sm font-semibold text-stone-800">{u.nome}</span>
                      <span className="text-xs text-stone-400 ml-2">{u.email}</span>
                    </div>
                    <span className="badge text-xs badge-gray">{u._tipo}</span>
                  </div>
                ))
              })()}
            </div>

            </div>
            <div className="p-5 pt-3 flex-shrink-0 border-t border-stone-100">
              <Msg msg={msgE} />
              <div className="flex gap-2">
                <button onClick={() => { setModalEditLoja(null); setMsgE(null) }} className="btn-secondary flex-1">Fechar</button>
                <button onClick={salvarEdicaoLoja} disabled={savingE || !editLoja.nome.trim()} className="btn-success flex-1">
                  {savingE ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: IDENTIDADE VISUAL ── */}
      {tab === 'config' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 max-w-lg mx-4 md:mx-auto mb-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Identidade Visual — {empresa?.nome_fantasia || empresa?.nome}</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label-field">Cor Primária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={tema.cor_primaria}
                  onChange={e => setTema(p => ({ ...p, cor_primaria: e.target.value }))}
                  className="w-10 h-9 p-0.5 rounded border border-stone-200 cursor-pointer" />
                <input value={tema.cor_primaria}
                  onChange={e => setTema(p => ({ ...p, cor_primaria: e.target.value }))}
                  className="flex-1 text-xs font-mono" placeholder="#FFBE00" maxLength={7} />
              </div>
            </div>
            <div>
              <label className="label-field">Cor Secundária</label>
              <div className="flex items-center gap-2">
                <input type="color" value={tema.cor_secundaria}
                  onChange={e => setTema(p => ({ ...p, cor_secundaria: e.target.value }))}
                  className="w-10 h-9 p-0.5 rounded border border-stone-200 cursor-pointer" />
                <input value={tema.cor_secundaria}
                  onChange={e => setTema(p => ({ ...p, cor_secundaria: e.target.value }))}
                  className="flex-1 text-xs font-mono" placeholder="#CC8800" maxLength={7} />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3"
            style={{ background: `linear-gradient(135deg, ${tema.cor_primaria}, ${tema.cor_secundaria})` }}>
            <span className="text-2xl">🏁</span>
            <div>
              <p className="text-sm font-bold text-white">{empresa?.nome_fantasia || empresa?.nome}</p>
              <p className="text-xs text-white/70">Preview do tema</p>
            </div>
            <div className="ml-auto text-white font-black text-lg">87,5%</div>
          </div>

          <div className="mb-4">
            <label className="label-field">URL do Logo (opcional)</label>
            <input value={tema.logo_url}
              onChange={e => setTema(p => ({ ...p, logo_url: e.target.value }))}
              placeholder="https://sua-empresa.com/logo.png" />
            {tema.logo_url && (
              <img src={tema.logo_url} alt="logo" className="mt-2 h-10 object-contain rounded" />
            )}
          </div>

          <div className="border-t border-stone-100 pt-4 mb-4">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Configurações de Cálculo</p>
            <div className="flex items-center justify-between gap-3 bg-stone-50 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-stone-800">Calcular Ticket Médio automaticamente</p>
                <p className="text-xs text-stone-400 mt-0.5">Desative se sua equipe informa o ticket manualmente</p>
              </div>
              <button
                type="button"
                onClick={() => setTicketAuto(v => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${ticketAuto ? 'bg-green-500' : 'bg-stone-300'}`}
                role="switch"
                aria-checked={ticketAuto}>
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${ticketAuto ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 px-1">
              {ticketAuto ? '✅ Automático: Ticket = Vendas ÷ Atendimentos' : '✏️ Manual: Ticket informado no lançamento diário'}
            </p>
          </div>

          {msgTema && (
            <p className={`text-sm px-3 py-2 rounded-lg mb-3 ${msgTema.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msgTema.text}
            </p>
          )}

          <button onClick={salvarTema} disabled={savingTema} className="btn-success w-full">
            {savingTema ? 'Salvando...' : '💾 Salvar Tema'}
          </button>
        </div>
      )}

      {/* ── Modal: Nova Loja ── */}
      {modalLoja && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
            <h2 className="text-lg font-bold mb-4">+ Nova Loja</h2>
            <div className="space-y-3 mb-4">
              <div><label className="label-field">Nome *</label>
                <input value={novaLoja.nome} onChange={e => setNovaLoja(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Loja Centro" autoFocus /></div>
              <div><label className="label-field">Cidade</label>
                <input value={novaLoja.cidade} onChange={e => setNovaLoja(p => ({ ...p, cidade: e.target.value }))} placeholder="São Paulo" /></div>
              <div><label className="label-field">Estado (UF)</label>
                <input value={novaLoja.estado} onChange={e => setNovaLoja(p => ({ ...p, estado: e.target.value }))} placeholder="SP" maxLength={2} /></div>
            </div>
            <Msg msg={msgL} />
            <div className="flex gap-2">
              <button onClick={() => { setModalLoja(false); setMsgL(null) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={criarLoja} disabled={savingL || !novaLoja.nome.trim()} className="btn-success flex-1">
                {savingL ? 'Salvando...' : 'Criar Loja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Usuário (contexto de loja) ── */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl">
            <h2 className="text-lg font-bold mb-4">+ Novo Usuário</h2>
            <div className="space-y-3 mb-4">
              <div><label className="label-field">Nome completo *</label>
                <input value={novoUser.nome} onChange={e => setNovoUser(p => ({ ...p, nome: e.target.value }))} placeholder="Ana Silva" autoFocus /></div>
              <div><label className="label-field">E-mail *</label>
                <input type="email" value={novoUser.email} onChange={e => setNovoUser(p => ({ ...p, email: e.target.value }))} placeholder="ana@empresa.com" /></div>
              <div><label className="label-field">Senha inicial *</label>
                <input type="password" value={novoUser.senha} onChange={e => setNovoUser(p => ({ ...p, senha: e.target.value }))} placeholder="mínimo 6 caracteres" /></div>
              <div><label className="label-field">Perfil</label>
                <select value={novoUser.perfil} onChange={e => setNovoUser(p => ({ ...p, perfil: e.target.value }))}>
                  {PERFIS.map(p => <option key={p} value={p}>{LABEL[p]}</option>)}
                </select>
              </div>
            </div>
            <Msg msg={msgU} />
            <div className="flex gap-2">
              <button onClick={() => { setModalUser(false); setMsgU(null); setNovoUserLojaId(null); setUserCriado(false) }} className="btn-secondary flex-1">
                {userCriado ? 'Fechar' : 'Cancelar'}
              </button>
              {userCriado ? (
                <button onClick={() => { setNovoUser({ nome: '', email: '', senha: '', perfil: 'gerente' }); setMsgU(null); setUserCriado(false) }} className="btn-info flex-1">+ Novo</button>
              ) : (
                <button onClick={criarUsuario}
                  disabled={savingU || !novoUser.nome.trim() || !novoUser.email.trim() || novoUser.senha.length < 6}
                  className="btn-info flex-1">
                  {savingU ? 'Criando...' : 'Criar Usuário'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Vínculos da Loja ── */}
      {modalVinc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl">
            <h2 className="text-lg font-bold mb-1">🔗 Vínculos</h2>
            <p className="text-sm text-stone-500 mb-4">{modalVinc.nome}</p>

            <Msg msg={msgV} />

            {/* Gerentes */}
            <div className="mb-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Gerentes</p>
              {gerentesLoja(modalVinc.id).length === 0
                ? <p className="text-xs text-stone-400 italic mb-2">Nenhum gerente vinculado.</p>
                : gerentesLoja(modalVinc.id).map(g => (
                  <div key={g.usuario_id} className="flex items-center justify-between py-1.5 border-b border-stone-50">
                    <div>
                      <span className="text-sm font-semibold text-stone-800">{g.usuarios?.nome}</span>
                      <span className="text-xs text-stone-400 ml-2">{g.usuarios?.email}</span>
                    </div>
                    <button onClick={() => desvincular(modalVinc.id, g.usuario_id, 'gerente')} disabled={savingV}
                      className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                  </div>
                ))}
              {disponiveis(modalVinc.id, 'gerente').length > 0 && (
                <div className="flex gap-2 mt-2">
                  <select value={selVincGer} onChange={e => setSelVincGer(e.target.value)}
                    className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white">
                    <option value="">Selecione...</option>
                    {disponiveis(modalVinc.id, 'gerente').map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                  <button disabled={savingV || !selVincGer}
                    onClick={() => { if (selVincGer) { vincular(modalVinc.id, selVincGer, 'gerente'); setSelVincGer('') } }}
                    className="btn-success text-xs px-3">+ Add</button>
                </div>
              )}
            </div>

            {/* Coordenadores */}
            <div className="mb-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Coordenadores</p>
              {supervisoresLoja(modalVinc.id).length === 0
                ? <p className="text-xs text-stone-400 italic mb-2">Nenhum coordenador vinculado.</p>
                : supervisoresLoja(modalVinc.id).map(s => (
                  <div key={s.usuario_id} className="flex items-center justify-between py-1.5 border-b border-stone-50">
                    <div>
                      <span className="text-sm font-semibold text-stone-800">{s.usuarios?.nome}</span>
                      <span className="text-xs text-stone-400 ml-2">{s.usuarios?.email}</span>
                    </div>
                    <button onClick={() => desvincular(modalVinc.id, s.usuario_id, 'coordenador')} disabled={savingV}
                      className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                  </div>
                ))}
              {disponiveis(modalVinc.id, 'coordenador').length > 0 && (
                <div className="flex gap-2 mt-2">
                  <select value={selVincSup} onChange={e => setSelVincSup(e.target.value)}
                    className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white">
                    <option value="">Selecione...</option>
                    {disponiveis(modalVinc.id, 'coordenador').map(u => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                  <button disabled={savingV || !selVincSup}
                    onClick={() => { if (selVincSup) { vincular(modalVinc.id, selVincSup, 'coordenador'); setSelVincSup('') } }}
                    className="btn-info text-xs px-3">+ Add</button>
                </div>
              )}
            </div>

            <button onClick={() => { setModalVinc(null); setMsgV(null) }} className="btn-secondary w-full">Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
