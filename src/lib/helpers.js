// ─── Formatação ─────────────────────────────────────────────
export function fmtR(v) {
  return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function fmtN(v, d = 2) {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
}
export function fmtPct(v) { return fmtN(Math.min(v || 0, 999), 2) + '%' }

// ─── Semanas do mês ──────────────────────────────────────────
const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function getWeeksOfMonth(year, month) {
  // month: 0-indexed
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  let ws = new Date(first)
  const dow = first.getDay()
  if (dow !== 1) { const b = dow === 0 ? 6 : dow - 1; ws.setDate(first.getDate() - b) }
  const weeks = []
  while (ws <= last) {
    const days = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(ws); d.setDate(ws.getDate() + i)
      days.push({ date: d, key: toDateKey(d), lbl: DIAS[i], inMonth: d.getMonth() === month })
    }
    if (days.some(d => d.inMonth)) weeks.push(days)
    ws.setDate(ws.getDate() + 7)
  }
  return weeks
}

export function toDateKey(d) {
  if (typeof d === 'string') return d.slice(0, 10)
  // Usa partes locais para evitar desvio de UTC (ex: UTC-3 meia-noite)
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getMonthDateKeys(year, month) {
  const keys = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) { keys.push(toDateKey(d)); d.setDate(d.getDate() + 1) }
  return keys
}

// ─── Score ponderado ─────────────────────────────────────────
export function calcScore(stats, meta, pesos) {
  const { vendas, ticket, pa } = stats
  const { meta_venda, meta_ticket, meta_pa } = meta
  const { peso_venda = 40, peso_ticket = 30, peso_pa = 30 } = pesos

  const pv = meta_venda  > 0 ? (vendas  / meta_venda)  * 100 : 0
  const pt = meta_ticket > 0 ? (ticket  / meta_ticket) * 100 : 0
  const pp = meta_pa     > 0 ? (pa      / meta_pa)     * 100 : 0

  // Se ticket/PA não têm meta, redistribui os pesos para venda
  const temTicket = meta_ticket > 0
  const temPA     = meta_pa     > 0
  let pesoV = peso_venda, pesoT = peso_ticket, pesoP = peso_pa
  if (!temTicket && !temPA) {
    pesoV = 100; pesoT = 0; pesoP = 0
  } else if (!temTicket) {
    pesoV = peso_venda + peso_ticket; pesoT = 0
  } else if (!temPA) {
    pesoV = peso_venda + peso_pa; pesoP = 0
  }

  return {
    pv: Math.round(pv * 10) / 10,
    pt: Math.round(pt * 10) / 10,
    pp: Math.round(pp * 10) / 10,
    score: Math.round((pv * pesoV / 100 + pt * pesoT / 100 + pp * pesoP / 100) * 10) / 10,
  }
}

export function aggregateLancamentos(lancamentos) {
  const tv = lancamentos.reduce((a, l) => a + (l.vendas || 0), 0)
  const ta = lancamentos.reduce((a, l) => a + (l.atendimentos || 0), 0)
  const tp = lancamentos.reduce((a, l) => a + (l.pecas || 0), 0)
  return {
    vendas: Math.round(tv * 100) / 100,
    atendimentos: ta,
    pecas: tp,
    ticket: ta > 0 ? Math.round(tv / ta * 100) / 100 : 0,
    pa:     ta > 0 ? Math.round(tp / ta * 100) / 100 : 0,
  }
}

// ─── Cores por índice ────────────────────────────────────────
const PALETA = [
  { fill: '#FFBE00', border: '#CC8800', text: '#3D2800', bg: '#FFF8E1', car: '🚗' },
  { fill: '#FF3D6B', border: '#C4003A', text: '#4A0015', bg: '#FFE8EE', car: '🚙' },
  { fill: '#00E096', border: '#009960', text: '#003D26', bg: '#E0FFF5', car: '🚕' },
  { fill: '#2979FF', border: '#0040CC', text: '#001A52', bg: '#E3EEFF', car: '🚓' },
  { fill: '#A259FF', border: '#6E00FF', text: '#2A0066', bg: '#F0E5FF', car: '🚘' },
  { fill: '#FF6D00', border: '#CC4400', text: '#4A1800', bg: '#FFF0E5', car: '🚖' },
  { fill: '#00D4FF', border: '#0099CC', text: '#003D52', bg: '#E0F9FF', car: '🚍' },
  { fill: '#FF1744', border: '#B20016', text: '#4A0008', bg: '#FFE3E7', car: '🚐' },
]
export function getCor(i) { return PALETA[i % PALETA.length] }

// ─── Posição do carro na pista ───────────────────────────────
// Retorna a semana atual (1–4) para o mês visualizado,
// ou null se for mês passado/futuro (pista toda disponível).
export function getWeekNumber(vY, vM, today = new Date()) {
  const isCurrentMonth = vY === today.getFullYear() && vM === today.getMonth()
  if (!isCurrentMonth) return null
  const daysInMonth = new Date(vY, vM + 1, 0).getDate()
  return Math.min(Math.ceil((today.getDate() / daysInMonth) * 4), 4)
}

// Posiciona o carro dentro do quadrante da semana atual:
//   - Mês corrente: carro avança de weekStart até weekEnd conforme o score
//   - Mês passado/futuro (weekNumber=null): posição = score real
export function applyWeekPos(score, weekNumber) {
  if (weekNumber === null) return Math.min(score, 100)
  const weekStart = (weekNumber - 1) * 25
  const weekEnd   = weekNumber * 25
  return Math.min(weekStart + (score / weekEnd) * 25, weekEnd)
}

export function getLojaLabel(loja) {
  if (!loja) return ''
  if (loja.exibir_como === 'codigo' && loja.codigo) return loja.codigo
  return loja.nome
}

export function getInitials(nome) {
  return nome.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

export const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
export const MEDALS = ['🥇','🥈','🥉','4º','5º','6º','7º','8º','9º','10º']
