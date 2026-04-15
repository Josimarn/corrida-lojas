import Avatar from './Avatar'
import { getCor, fmtR, fmtN, fmtPct } from '@/lib/helpers'

function MetricBar({ label, pct, value, meta, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-400">{label}</span>
        <span className="font-semibold text-stone-700">{fmtPct(pct)}</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <div className="text-xs text-stone-400">{value} / {meta}</div>
    </div>
  )
}

export default function ScoreCard({ vendedor, stats, scored, index }) {
  const c = getCor(index)
  const score = Math.min(scored?.scoreDisplay ?? scored?.score ?? 0, 999)
  const atingiu = (scored?.scoreDisplay ?? scored?.score ?? 0) >= 100

  return (
    <div className={`card p-4 ${atingiu ? 'ring-2 ring-green-300' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar nome={vendedor.nome} fotoUrl={vendedor.foto_url} index={index} size={36} />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-stone-900 truncate">{vendedor.nome}</p>
          {atingiu && <span className="badge-green badge text-xs">Meta atingida! 🏆</span>}
        </div>
        <div className="ml-auto text-right">
          <p className="text-xl font-extrabold" style={{ color: c.border }}>{fmtPct(score)}</p>
          <p className="text-xs text-stone-400">score</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="space-y-3">
        <MetricBar label={`Venda (${scored?.pesos?.peso_venda || 40}%)`}
          pct={scored?.pv || 0}
          value={fmtR(stats?.vendas)} meta={fmtR(vendedor.meta?.meta_venda)}
          color={c.fill} />
        <MetricBar label={`Ticket Médio (${scored?.pesos?.peso_ticket || 30}%)`}
          pct={scored?.pt || 0}
          value={fmtR(stats?.ticket)} meta={fmtR(vendedor.meta?.meta_ticket)}
          color={c.border} />
        <MetricBar label={`PA (${scored?.pesos?.peso_pa || 30}%)`}
          pct={scored?.pp || 0}
          value={fmtN(stats?.pa) + ' pçs'} meta={fmtN(vendedor.meta?.meta_pa) + ' pçs'}
          color="#1D9E75" />
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-stone-100">
        <div className="text-center">
          <p className="text-xs text-stone-400">Atend.</p>
          <p className="text-sm font-bold text-stone-800">{stats?.atendimentos || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-stone-400">Peças</p>
          <p className="text-sm font-bold text-stone-800">{stats?.pecas || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-stone-400">Ticket</p>
          <p className="text-sm font-bold text-stone-800">{fmtR(stats?.ticket)}</p>
        </div>
      </div>
    </div>
  )
}
