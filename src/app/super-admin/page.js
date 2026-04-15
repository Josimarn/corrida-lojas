'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'
import NavBar from '@/components/NavBar'

const PERFIS_SISTEMA = ['super_admin', 'admin_cliente', 'dono', 'coordenador', 'gerente', 'vendedor']
const PERFIL_LABEL = {
  super_admin:   'Super Admin',
  admin_cliente: 'Administrador',
  dono:          'Diretoria',
  coordenador:   'Coord. Regional',
  gerente:       'Gerente',
  vendedor:      'Vendedor',
}
const PERFIL_BADGE = {
  super_admin:   'badge-purple',
  admin_cliente: 'badge-blue',
  dono:          'badge-amber',
  coordenador:   'badge-blue',
  gerente:       'badge-green',
  vendedor:      'badge-gray',
}

function Msg({ msg }) {
  if (!msg?.text) return null
  return (
    <p className={`text-sm px-3 py-2 rounded-lg mb-3 ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {msg.text}
    </p>
  )
}

export default function SuperAdminPage() {
  const router   = useRouter()
  const supabase = createClientComponent()
  const [usuario,  setUsuario]  = useState(null)
  const [empresas, setEmpresas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [lojas,    setLojas]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [aba,      setAba]      = useState('empresas')

  // Modal nova empresa
  const EMP_VAZIA = { nome: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '' }
  const [modalEmp,   setModalEmp]   = useState(false)
  const [novaEmp,    setNovaEmp]    = useState(EMP_VAZIA)
  const [savingNE,   setSavingNE]   = useState(false)
  const [msgNE,      setMsgNE]      = useState(null)

  // Modal editar empresa
  const [modalEditEmp, setModalEditEmp] = useState(null) // empresa selecionada
  const [editEmp,      setEditEmp]      = useState(EMP_VAZIA)
  const [savingEE,     setSavingEE]     = useState(false)
  const [msgEE,        setMsgEE]        = useState(null)
  const [editTema,     setEditTema]     = useState({ cor_primaria: '#FFBE00', cor_secundaria: '#CC8800', logo_url: '' })

  // Aba Identidade Visual
  const [selEmpTema,   setSelEmpTema]   = useState('')
  const [temaAba,      setTemaAba]      = useState({ cor_primaria: '#FFBE00', cor_secundaria: '#CC8800', logo_url: '' })
  const [savingTA,     setSavingTA]     = useState(false)
  const [msgTA,        setMsgTA]        = useState(null)

  // Aba Logs
  const [logs,         setLogs]         = useState([])
  const [loadingLogs,  setLoadingLogs]  = useState(false)
  const [logTabela,    setLogTabela]    = useState('')
  const [logEmpId,     setLogEmpId]     = useState('')

  // Modal editar empresa — toggle ticket
  const [editTicketAuto, setEditTicketAuto] = useState(true)

  // Usuários — inline edit nome
  const [editUserId,   setEditUserId]   = useState(null)
  const [editUserNome, setEditUserNome] = useState('')
  const [savingUN,     setSavingUN]     = useState(false)

  // Filtro usuários
  const [filtroEmp,       setFiltroEmp]       = useState('')
  const [filtroPerfil,    setFiltroPerfil]    = useState('')
  const [filtroBusca,     setFiltroBusca]     = useState('')
  const [buscaEmpresa,    setBuscaEmpresa]    = useState('')
  const [empSelecionada,  setEmpSelecionada]  = useState(null)
  const [buscaUsuario, setBuscaUsuario] = useState('') // filtra dashboard

  // Modal novo usuário
  const [modalUser, setModalUser] = useState(false)
  const [novoUser,  setNovoUser]  = useState({ nome: '', email: '', senha: '', perfil: 'admin_cliente', empresa_id: '' })
  const [savingNU,  setSavingNU]  = useState(false)
  const [msgNU,     setMsgNU]     = useState(null)
  const [userCriado, setUserCriado] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)
    if (u?.perfil !== 'super_admin') { router.replace('/dashboard'); return }

    const [{ data: es }, { data: us }, { data: ls }] = await Promise.all([
      supabase.from('empresas').select('*').order('nome'),
      supabase.from('usuarios').select('*').order('nome'),
      supabase.from('lojas').select('*').order('nome'),
    ])
    setEmpresas(es || [])
    setUsuarios(us || [])
    setLojas(ls || [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // ── Empresa ──────────────────────────────────────────────────
  function empPayload(obj) {
    return {
      nome:          obj.nome.trim(),
      nome_fantasia: obj.nome_fantasia.trim() || null,
      cnpj:          obj.cnpj.trim() || null,
      email:         obj.email.trim() || null,
      telefone:      obj.telefone.trim() || null,
      endereco:      obj.endereco.trim() || null,
      cidade:        obj.cidade.trim() || null,
      estado:        obj.estado.trim().toUpperCase() || null,
    }
  }

  async function criarEmpresa() {
    if (!novaEmp.nome.trim()) return
    setSavingNE(true); setMsgNE(null)
    const { error } = await supabase.from('empresas').insert({ ...empPayload(novaEmp), ativo: true })
    setSavingNE(false)
    if (error) { setMsgNE({ ok: false, text: 'Erro: ' + error.message }) }
    else { setMsgNE({ ok: true, text: 'Empresa criada!' }); setNovaEmp(EMP_VAZIA); load() }
  }

  async function salvarEdicaoEmpresa() {
    if (!editEmp.nome.trim() || !modalEditEmp) return
    setSavingEE(true); setMsgEE(null)
    const { error } = await supabase.from('empresas').update({
      ...empPayload(editEmp),
      cor_primaria:          editTema.cor_primaria   || '#FFBE00',
      cor_secundaria:        editTema.cor_secundaria || '#CC8800',
      logo_url:              editTema.logo_url?.trim() || null,
      calcular_ticket_auto:  editTicketAuto,
    }).eq('id', modalEditEmp.id)
    setSavingEE(false)
    if (error) { setMsgEE({ ok: false, text: 'Erro: ' + error.message }) }
    else { setMsgEE({ ok: true, text: 'Salvo!' }); load() }
  }

  async function toggleEmpresaAtivo(e) {
    await supabase.from('empresas').update({ ativo: !e.ativo }).eq('id', e.id)
    load()
  }

  async function loadLogs(tabela = '', empId = '') {
    setLoadingLogs(true)
    let q = supabase.from('audit_log').select('*').order('criado_em', { ascending: false }).limit(100)
    if (tabela) q = q.eq('tabela', tabela)
    if (empId)  q = q.eq('registro_id', empId)
    const { data } = await q
    setLogs(data || [])
    setLoadingLogs(false)
  }

  async function salvarTemaAba() {
    if (!selEmpTema) return
    setSavingTA(true); setMsgTA(null)
    const { error } = await supabase.from('empresas').update({
      cor_primaria:   temaAba.cor_primaria   || '#FFBE00',
      cor_secundaria: temaAba.cor_secundaria || '#CC8800',
      logo_url:       temaAba.logo_url?.trim() || null,
    }).eq('id', selEmpTema)
    setSavingTA(false)
    if (error) setMsgTA({ ok: false, text: 'Erro: ' + error.message })
    else { setMsgTA({ ok: true, text: 'Tema salvo com sucesso!' }); load() }
  }

  // ── Usuário ───────────────────────────────────────────────────
async function criarUsuario() {
  const { nome, email, senha, perfil, empresa_id } = novoUser

  if (!nome.trim() || !email.trim() || !senha.trim() || !perfil) return

  setSavingNU(true)
  setMsgNU(null)

  // 🔥 garante empresa correta (respeita filtro)
  const empresaFinal = empSelecionada?.id || empresa_id

  const body = { nome, email, senha, perfil }
  if (empresaFinal) body.empresa_id = empresaFinal

  const res = await fetch('/api/super-admin/criar-usuario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await res.json()

  setSavingNU(false)

  if (!res.ok) {
    setMsgNU({ ok: false, text: 'Erro: ' + json.error })
  } else {
    setMsgNU({ ok: true, text: 'Usuário criado com sucesso!' })
    setUserCriado(true)

    // 🔥 LIMPA FORMULÁRIO (mas mantém empresa se filtrada)
     setNovoUser({
     nome: '',
     email: '',
     senha: '',
     perfil: novoUser.perfil, // mantém o atual
     empresa_id: empSelecionada?.id || ''
})
    load()
  }
}

  async function salvarNomeUsuario(id) {
    if (!editUserNome.trim()) return
    setSavingUN(true)
    await supabase.from('usuarios').update({ nome: editUserNome.trim() }).eq('id', id)
    setSavingUN(false)
    setEditUserId(null)
    load()
  }

  async function salvarPerfilUsuario(id, perfil) {
    await supabase.from('usuarios').update({ perfil }).eq('id', id)
    load()
  }

  async function toggleUsuarioAtivo(u) {
    await supabase.from('usuarios').update({ ativo: !u.ativo }).eq('id', u.id)
    load()
  }

  // ── KPIs (filtrados por empresa selecionada) ──────────────────
  const lojasKpi    = empSelecionada ? lojas.filter(l => l.empresa_id === empSelecionada.id)    : lojas
  const usuariosKpi = empSelecionada ? usuarios.filter(u => u.empresa_id === empSelecionada.id) : usuarios

  const kpi = {
    empresas: empSelecionada ? 1 : empresas.length,
    lojas:    lojasKpi.length,
    usuarios: usuariosKpi.length,
    ativos:   usuariosKpi.filter(u => u.ativo).length,
  }

  const perfisCounts = usuariosKpi.reduce((acc, u) => {
    acc[u.perfil] = (acc[u.perfil] || 0) + 1
    return acc
  }, {})

  const usuariosFiltrados = usuarios.filter(u => {
    // 🔥 FILTRO POR EMPRESA
    if (empSelecionada && u.empresa_id !== empSelecionada.id) return false

    // 🔎 busca
    if (!buscaUsuario) return true
    const q = buscaUsuario.toLowerCase()

    return (
      u.nome?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  })

  const empresasFiltradas = empresas.filter(e => {
  // 🔥 FILTRO PRINCIPAL (empresa selecionada)
  if (empSelecionada && e.id !== empSelecionada.id) return false

  // 🔎 filtro de busca
  if (!buscaEmpresa) return true
  const q = buscaEmpresa.toLowerCase()
  return e.nome?.toLowerCase().includes(q) || e.nome_fantasia?.toLowerCase().includes(q)
})

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-stone-400 text-sm">Carregando...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-100">
      <NavBar usuario={usuario} titulo="Super Admin" subtitulo="Gestão do sistema" />

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">

        {/* Filtro de empresa do dashboard */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <select value={empSelecionada?.id || ''}
              onChange={ev => {
                const val = ev.target.value
                if (!val) { setEmpSelecionada(null); return }
                const found = empresas.find(e => e.id === val)
                if (found) setEmpSelecionada(found)
              }}
              className="w-full sm:w-72 text-sm border border-stone-200 rounded-xl px-3 py-2 bg-white text-stone-700 shadow-sm">
              <option value="">Todas as empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
            </select>
          </div>
          {empSelecionada && (
            <button onClick={() => setEmpSelecionada(null)}
              className="text-xs text-stone-400 hover:text-stone-700 underline">Limpar</button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Empresas', kpi.empresas,  empSelecionada ? 'selecionada' : 'cadastradas'],
            ['Lojas',    kpi.lojas,     'ativas'],
            ['Usuários', kpi.usuarios,  'total'],
            ['Ativos',   kpi.ativos,    'no sistema'],
          ].map(([l, v, s]) => (
            <div key={l} className="card p-4 text-center">
              <p className="text-xs text-stone-400">{l}</p>
              <p className="text-2xl font-extrabold text-stone-900 mt-0.5">{v}</p>
              <p className="text-xs text-stone-400">{s}</p>
            </div>
          ))}
        </div>

        {/* Distribuição de perfis */}
        <div className="card p-4">
          <p className="section-title">Usuários por Perfil</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {PERFIS_SISTEMA.map(key => (
              <div key={key} className="bg-stone-50 rounded-lg p-2 flex flex-col items-center gap-1">
                <span className={`badge text-xs ${PERFIL_BADGE[key]}`}>{PERFIL_LABEL[key]}</span>
                <span className="text-xl font-extrabold text-stone-800">{perfisCounts[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 bg-stone-200 rounded-xl p-1 w-fit">
          {[['empresas', 'Empresas'], ['usuarios', 'Usuários'], ['identidade', '🎨 Identidade Visual'], ['logs', '📋 Logs']].map(([v, l]) => (
            <button key={v} onClick={() => setAba(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${aba === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── ABA EMPRESAS ── */}
        {aba === 'empresas' && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <p className="section-title mb-0">Empresas Clientes <span className="text-stone-400 font-normal text-xs">({empresasFiltradas.length})</span></p>
              <div className="flex items-center gap-2">
                <input value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)}
                  placeholder="Buscar nome ou fantasia..."
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700 w-48" />
                <button onClick={() => { setModalEmp(true); setMsgNE(null); setUserCriado(false) }} className="btn-success text-xs">+ Nova Empresa</button>
              </div>
            </div>

            {empresasFiltradas.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-4">{buscaEmpresa ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}</p>
            ) : (
              <div className="space-y-2">
                {empresasFiltradas.map(e => {
                  const nLojas    = lojas.filter(l => l.empresa_id === e.id).length
                  const nUsuarios = usuarios.filter(u => u.empresa_id === e.id).length
                  return (
                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0 gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-stone-900 truncate">{e.nome_fantasia || e.nome}</p>
                          {e.nome_fantasia && <span className="text-xs text-stone-400 truncate hidden sm:block">{e.nome}</span>}
                        </div>
                        <p className="text-xs text-stone-400">
                          {nLojas} loja{nLojas !== 1 ? 's' : ''} · {nUsuarios} usuário{nUsuarios !== 1 ? 's' : ''}
                          {e.cidade && <span> · {e.cidade}{e.estado ? `/${e.estado}` : ''}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`badge text-xs ${e.ativo ? 'badge-green' : 'badge-gray'}`}>
                          {e.ativo ? 'ativa' : 'inativa'}
                        </span>
                        <button onClick={() => {
                          setModalEditEmp(e)
                          setEditEmp({
                            nome:          e.nome          || '',
                            nome_fantasia: e.nome_fantasia || '',
                            cnpj:          e.cnpj          || '',
                            email:         e.email         || '',
                            telefone:      e.telefone      || '',
                            endereco:      e.endereco      || '',
                            cidade:        e.cidade        || '',
                            estado:        e.estado        || '',
                          })
                          setEditTicketAuto(e.calcular_ticket_auto !== false)
                          setEditTema({
                            cor_primaria:   e.cor_primaria   || '#FFBE00',
                            cor_secundaria: e.cor_secundaria || '#CC8800',
                            logo_url:       e.logo_url       || '',
                          })
                          setMsgEE(null)
                        }} className="btn-secondary text-xs px-2 py-1">✏️</button>
                        <button onClick={() => toggleEmpresaAtivo(e)}
                          className="text-xs text-stone-400 hover:text-stone-700 underline">
                          {e.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA USUÁRIOS ── */}
        {aba === 'usuarios' && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="section-title mb-0">Todos os Usuários <span className="text-stone-400 font-normal text-xs">({usuariosFiltrados.length})</span></p>
                <button onClick={() => { setModalUser(true); setMsgNU(null); setUserCriado(false); setNovoUser({ nome: '', email: '', senha: '', perfil: 'admin_cliente', empresa_id: '' }) }}
                  className="btn-success text-xs">+ Novo Usuário</button>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <input value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
                  placeholder="Buscar nome ou e-mail..."
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700 flex-1 min-w-[160px]" />
                <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700">
                  <option value="">Todos os perfis</option>
                  {PERFIS_SISTEMA.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                </select>
                {(filtroBusca || filtroPerfil) && (
                  <button onClick={() => { setFiltroBusca(''); setFiltroPerfil('') }}
                    className="text-xs text-stone-400 hover:text-stone-700 underline">Limpar</button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                    <th className="pb-2 font-medium">Nome</th>
                    <th className="pb-2 font-medium">E-mail</th>
                    <th className="pb-2 font-medium">Perfil</th>
                    <th className="pb-2 font-medium">Empresa</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map(u => {
                    const empresa  = empresas.find(e => e.id === u.empresa_id)
                    const editando = editUserId === u.id
                    return (
                      <tr key={u.id} className="border-b border-stone-50 last:border-0">
                        <td className="py-2">
                          {editando ? (
                            <div className="flex items-center gap-2">
                              <input value={editUserNome} onChange={ev => setEditUserNome(ev.target.value)}
                                onKeyDown={ev => { if (ev.key === 'Enter') salvarNomeUsuario(u.id); if (ev.key === 'Escape') setEditUserId(null) }}
                                className="text-sm border border-stone-300 rounded px-2 py-0.5 w-36" autoFocus />
                              <button onClick={() => salvarNomeUsuario(u.id)} disabled={savingUN}
                                className="text-xs text-green-700 font-medium hover:underline">✓</button>
                              <button onClick={() => setEditUserId(null)} className="text-xs text-stone-400 hover:underline">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-stone-800">{u.nome}</span>
                              <button onClick={() => { setEditUserId(u.id); setEditUserNome(u.nome) }}
                                className="text-stone-400 hover:text-stone-600 text-xs ml-1">✏️</button>
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-stone-500 text-xs">{u.email}</td>
                        <td className="py-2">
                          <select value={u.perfil}
                            onChange={ev => salvarPerfilUsuario(u.id, ev.target.value)}
                            className={`badge text-xs border-0 cursor-pointer ${PERFIL_BADGE[u.perfil] || 'badge-gray'}`}>
                            {PERFIS_SISTEMA.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                          </select>
                        </td>
                        <td className="py-2 text-stone-500 text-xs">{empresa?.nome || '—'}</td>
                        <td className="py-2">
                          <button onClick={() => toggleUsuarioAtivo(u)}
                            className={`badge text-xs cursor-pointer ${u.ativo ? 'badge-green' : 'badge-gray'}`}>
                            {u.ativo ? 'ativo' : 'inativo'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ABA LOGS ── */}
        {aba === 'logs' && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="section-title mb-0">📋 Audit Log</p>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={logTabela} onChange={e => setLogTabela(e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700">
                  <option value="">Todas as tabelas</option>
                  <option value="empresas">Empresas</option>
                  <option value="lancamentos">Lançamentos</option>
                  <option value="metas_vendedor">Metas Vendedor</option>
                  <option value="metas_loja">Metas Loja</option>
                </select>
                <select value={logEmpId} onChange={e => setLogEmpId(e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700">
                  <option value="">Todas as empresas</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
                </select>
                <button onClick={() => loadLogs(logTabela, logEmpId)} className="btn-secondary text-xs px-3 py-1.5">
                  🔍 Filtrar
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <p className="text-sm text-stone-400 text-center py-6">Carregando...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">
                Nenhum registro encontrado. Clique em Filtrar para carregar os logs.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-stone-400 border-b border-stone-100">
                      <th className="pb-2 font-medium pr-3">Data/Hora</th>
                      <th className="pb-2 font-medium pr-3">Tabela</th>
                      <th className="pb-2 font-medium pr-3">Operação</th>
                      <th className="pb-2 font-medium pr-3">Usuário</th>
                      <th className="pb-2 font-medium">Alterações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => {
                      const op = log.operacao
                      const opColor = op === 'INSERT' ? 'badge-green' : op === 'DELETE' ? 'bg-red-100 text-red-700' : 'badge-amber'
                      const usuario = usuarios.find(u => u.id === log.usuario_id)
                      return (
                        <tr key={log.id} className="border-b border-stone-50 last:border-0 align-top">
                          <td className="py-2 pr-3 text-stone-500 whitespace-nowrap">
                            {new Date(log.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-2 pr-3 font-mono text-stone-600">{log.tabela}</td>
                          <td className="py-2 pr-3">
                            <span className={`badge text-xs ${opColor}`}>{op}</span>
                          </td>
                          <td className="py-2 pr-3 text-stone-500">{usuario?.nome || log.usuario_id?.slice(0, 8) || '—'}</td>
                          <td className="py-2 text-stone-500 max-w-xs">
                            {op === 'UPDATE' && log.antes && log.depois ? (
                              <details className="cursor-pointer">
                                <summary className="text-xs text-blue-600 hover:underline">Ver diff</summary>
                                <div className="mt-1 space-y-1">
                                  {Object.keys(log.depois).filter(k => JSON.stringify(log.antes[k]) !== JSON.stringify(log.depois[k])).map(k => (
                                    <div key={k} className="text-xs">
                                      <span className="font-medium text-stone-700">{k}:</span>{' '}
                                      <span className="line-through text-red-500">{String(log.antes[k] ?? '—')}</span>
                                      {' → '}
                                      <span className="text-green-600">{String(log.depois[k] ?? '—')}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : op === 'INSERT' ? (
                              <span className="text-stone-400 italic">novo registro</span>
                            ) : op === 'DELETE' ? (
                              <span className="text-red-400 italic">registro removido</span>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── ABA IDENTIDADE VISUAL ── */}
        {aba === 'identidade' && (
          <div className="card p-5 max-w-lg">
            <p className="section-title">🎨 Identidade Visual por Empresa</p>

            <div className="mb-4">
              <label className="label-field">Empresa</label>
              <select
                value={selEmpTema}
                onChange={ev => {
                  const id = ev.target.value
                  setSelEmpTema(id)
                  setMsgTA(null)
                  if (id) {
                    const emp = empresas.find(e => e.id === id)
                    setTemaAba({
                      cor_primaria:   emp?.cor_primaria   || '#FFBE00',
                      cor_secundaria: emp?.cor_secundaria || '#CC8800',
                      logo_url:       emp?.logo_url       || '',
                    })
                  }
                }}
                className="w-full">
                <option value="">— Selecione uma empresa —</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia || e.nome}</option>)}
              </select>
            </div>

            {selEmpTema && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="label-field">Cor Primária</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={temaAba.cor_primaria}
                        onChange={e => setTemaAba(p => ({ ...p, cor_primaria: e.target.value }))}
                        className="w-10 h-9 p-0.5 rounded border border-stone-200 cursor-pointer" />
                      <input value={temaAba.cor_primaria}
                        onChange={e => setTemaAba(p => ({ ...p, cor_primaria: e.target.value }))}
                        className="flex-1 text-xs font-mono" placeholder="#FFBE00" maxLength={7} />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Cor Secundária</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={temaAba.cor_secundaria}
                        onChange={e => setTemaAba(p => ({ ...p, cor_secundaria: e.target.value }))}
                        className="w-10 h-9 p-0.5 rounded border border-stone-200 cursor-pointer" />
                      <input value={temaAba.cor_secundaria}
                        onChange={e => setTemaAba(p => ({ ...p, cor_secundaria: e.target.value }))}
                        className="flex-1 text-xs font-mono" placeholder="#CC8800" maxLength={7} />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="h-10 rounded-xl mb-4 flex items-center justify-center text-xs font-bold text-white/90 shadow"
                  style={{ background: `linear-gradient(135deg, ${temaAba.cor_primaria}, ${temaAba.cor_secundaria})` }}>
                  Preview do tema
                </div>

                <div className="mb-4">
                  <label className="label-field">URL do Logo (opcional)</label>
                  <input value={temaAba.logo_url}
                    onChange={e => setTemaAba(p => ({ ...p, logo_url: e.target.value }))}
                    placeholder="https://..." />
                  {temaAba.logo_url && (
                    <img src={temaAba.logo_url} alt="Logo preview"
                      className="mt-2 h-12 object-contain rounded border border-stone-100 p-1 bg-white" />
                  )}
                </div>

                <Msg msg={msgTA} />

                <button onClick={salvarTemaAba} disabled={savingTA} className="btn-success w-full">
                  {savingTA ? 'Salvando...' : '💾 Salvar Tema'}
                </button>
              </>
            )}
          </div>
        )}

      </main>

      {/* Modal: Nova Empresa */}
      {modalEmp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-5 pb-0 flex-shrink-0">
              <h2 className="text-lg font-bold mb-4">+ Nova Empresa</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-2">
              <div><label className="label-field">Razão Social *</label>
                <input value={novaEmp.nome} onChange={e => setNovaEmp(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Fashion Group Ltda" autoFocus /></div>
              <div><label className="label-field">Nome Fantasia</label>
                <input value={novaEmp.nome_fantasia} onChange={e => setNovaEmp(p => ({ ...p, nome_fantasia: e.target.value }))} placeholder="Ex: Grupo Fashion" /></div>
              <div><label className="label-field">CNPJ</label>
                <input value={novaEmp.cnpj} onChange={e => setNovaEmp(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
              <div><label className="label-field">E-mail</label>
                <input type="email" value={novaEmp.email} onChange={e => setNovaEmp(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" /></div>
              <div><label className="label-field">Telefone</label>
                <input value={novaEmp.telefone} onChange={e => setNovaEmp(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
              <div><label className="label-field">Endereço</label>
                <input value={novaEmp.endereco} onChange={e => setNovaEmp(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, complemento" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><label className="label-field">Cidade</label>
                  <input value={novaEmp.cidade} onChange={e => setNovaEmp(p => ({ ...p, cidade: e.target.value }))} placeholder="São Paulo" /></div>
                <div><label className="label-field">UF</label>
                  <input value={novaEmp.estado} onChange={e => setNovaEmp(p => ({ ...p, estado: e.target.value }))} placeholder="SP" maxLength={2} /></div>
              </div>
              <Msg msg={msgNE} />
            </div>
            <div className="p-5 pt-3 flex gap-2 flex-shrink-0 border-t border-stone-100">
              <button onClick={() => { setModalEmp(false); setMsgNE(null); setNovaEmp(EMP_VAZIA) }} className="btn-secondary flex-1">Fechar</button>
              {!msgNE?.ok && (
                <button onClick={criarEmpresa} disabled={savingNE || !novaEmp.nome.trim()} className="btn-success flex-1">
                  {savingNE ? 'Salvando...' : 'Criar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Empresa */}
      {modalEditEmp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-5 pb-0 flex-shrink-0">
              <h2 className="text-lg font-bold mb-1">✏️ Editar Empresa</h2>
              <p className="text-xs text-stone-400 mb-4">{modalEditEmp.nome}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 space-y-3 pb-2">
              <div><label className="label-field">Razão Social *</label>
                <input value={editEmp.nome} onChange={e => setEditEmp(p => ({ ...p, nome: e.target.value }))} autoFocus /></div>
              <div><label className="label-field">Nome Fantasia</label>
                <input value={editEmp.nome_fantasia} onChange={e => setEditEmp(p => ({ ...p, nome_fantasia: e.target.value }))} placeholder="Como será exibido no sistema" /></div>
              <div><label className="label-field">CNPJ</label>
                <input value={editEmp.cnpj} onChange={e => setEditEmp(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" /></div>
              <div><label className="label-field">E-mail</label>
                <input type="email" value={editEmp.email} onChange={e => setEditEmp(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" /></div>
              <div><label className="label-field">Telefone</label>
                <input value={editEmp.telefone} onChange={e => setEditEmp(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
              <div><label className="label-field">Endereço</label>
                <input value={editEmp.endereco} onChange={e => setEditEmp(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua, número, complemento" /></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2"><label className="label-field">Cidade</label>
                  <input value={editEmp.cidade} onChange={e => setEditEmp(p => ({ ...p, cidade: e.target.value }))} placeholder="São Paulo" /></div>
                <div><label className="label-field">UF</label>
                  <input value={editEmp.estado} onChange={e => setEditEmp(p => ({ ...p, estado: e.target.value }))} placeholder="SP" maxLength={2} /></div>
              </div>

              {/* ── Tema da Empresa ── */}
              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Identidade Visual</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="label-field">Cor Primária</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editTema.cor_primaria}
                        onChange={e => setEditTema(p => ({ ...p, cor_primaria: e.target.value }))}
                        className="w-10 h-9 p-0.5 rounded border border-stone-200 cursor-pointer" />
                      <input value={editTema.cor_primaria}
                        onChange={e => setEditTema(p => ({ ...p, cor_primaria: e.target.value }))}
                        className="flex-1 text-xs font-mono" placeholder="#FFBE00" maxLength={7} />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">Cor Secundária</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editTema.cor_secundaria}
                        onChange={e => setEditTema(p => ({ ...p, cor_secundaria: e.target.value }))}
                        className="w-10 h-9 p-0.5 rounded border border-stone-200 cursor-pointer" />
                      <input value={editTema.cor_secundaria}
                        onChange={e => setEditTema(p => ({ ...p, cor_secundaria: e.target.value }))}
                        className="flex-1 text-xs font-mono" placeholder="#CC8800" maxLength={7} />
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div className="h-8 rounded-lg mb-3"
                  style={{ background: `linear-gradient(135deg, ${editTema.cor_primaria}, ${editTema.cor_secundaria})` }} />
                <div>
                  <label className="label-field">URL do Logo (opcional)</label>
                  <input value={editTema.logo_url}
                    onChange={e => setEditTema(p => ({ ...p, logo_url: e.target.value }))}
                    placeholder="https://..." />
                </div>
              </div>

              {/* ── Configurações de Cálculo ── */}
              <div className="border-t border-stone-100 pt-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Configurações de Cálculo</p>
                <div className="flex items-center justify-between gap-3 bg-stone-50 rounded-lg px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-stone-800">Calcular Ticket Médio automaticamente</p>
                    <p className="text-xs text-stone-400 mt-0.5">Desative se a empresa informa o ticket manualmente nos lançamentos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditTicketAuto(v => !v)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${editTicketAuto ? 'bg-green-500' : 'bg-stone-300'}`}
                    role="switch"
                    aria-checked={editTicketAuto}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${editTicketAuto ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <p className="text-xs text-stone-400 mt-1.5 px-1">
                  {editTicketAuto ? '✅ Automático: Ticket = Vendas ÷ Atendimentos' : '✏️ Manual: Ticket informado no lançamento diário'}
                </p>
              </div>

              <Msg msg={msgEE} />
            </div>
            <div className="p-5 pt-3 flex gap-2 flex-shrink-0 border-t border-stone-100">
              <button onClick={() => { setModalEditEmp(null); setMsgEE(null) }} className="btn-secondary flex-1">Fechar</button>
              <button onClick={salvarEdicaoEmpresa} disabled={savingEE || !editEmp.nome.trim()} className="btn-success flex-1">
                {savingEE ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Usuário */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-5 pb-0">
              <h2 className="text-lg font-bold mb-4">+ Novo Usuário</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-5 space-y-3">
              <div>
                <label className="label-field">Nome *</label>
                <input value={novoUser.nome} onChange={e => setNovoUser(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div>
                <label className="label-field">E-mail *</label>
                <input type="email" value={novoUser.email} onChange={e => setNovoUser(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="label-field">Senha *</label>
                <input type="password" value={novoUser.senha} onChange={e => setNovoUser(p => ({ ...p, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="label-field">Perfil *</label>
                <select value={novoUser.perfil} onChange={e => setNovoUser(p => ({ ...p, perfil: e.target.value }))}>
                  {PERFIS_SISTEMA.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Empresa</label>
                <select value={novoUser.empresa_id} onChange={e => setNovoUser(p => ({ ...p, empresa_id: e.target.value }))}>
                  <option value="">— Sem empresa —</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <Msg msg={msgNU} />
            </div>
            <div className="p-5 pt-3 flex gap-2">
              <button onClick={() => { setModalUser(false); setMsgNU(null) }} className="btn-secondary flex-1">Fechar</button>
              {userCriado ? (
                <button onClick={() => { setMsgNU(null); setUserCriado(false); setNovoUser({ nome: '', email: '', senha: '', perfil: 'admin_cliente', empresa_id: '' }) }}
                  className="btn-success flex-1">+ Novo</button>
              ) : (
                <button onClick={criarUsuario} disabled={savingNU || !novoUser.nome.trim() || !novoUser.email.trim() || !novoUser.senha.trim()}
                  className="btn-success flex-1">
                  {savingNU ? 'Criando...' : 'Criar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
