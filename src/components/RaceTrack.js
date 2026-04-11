'use client'
import Avatar from './Avatar'
import { getCor, fmtPct } from '@/lib/helpers'

export default function RaceTrack({ vendedores, scores, semanas = 4 }) {
  if (!vendedores?.length) return (
    <div className="text-sm text-stone-400 text-center py-8">
      Nenhum vendedor cadastrado nesta loja.
    </div>
  )

  // Ordena por score (quem está na frente primeiro)
  const ordenados = [...vendedores].sort((a, b) => {
    const sa = scores?.[a.id]?.score || 0
    const sb = scores?.[b.id]?.score || 0
    return sb - sa
  })

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#1a1a2e' }}>
      {/* Header da pista */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Pista</span>
        <div className="flex gap-4 text-xs text-white/40">
          {semanas > 0 && Array.from({ length: semanas }, (_, i) => (
            <span key={i}>Sem {i + 1}</span>
          ))}
        </div>
        <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Meta</span>
      </div>

      {/* Pistas */}
      <div className="p-3 space-y-2">
        {ordenados.map((v, idx) => {
          const originalIdx = vendedores.findIndex(vv => vv.id === v.id)
          const c   = getCor(originalIdx)
          const sc      = scores?.[v.id] || { score: 0 }
          const pos     = Math.min(Math.max(sc.score, 0), 100)
          const display = sc.scoreDisplay ?? sc.score
          const isLeading = idx === 0 && pos > 0

          return (
            <div key={v.id} className="flex items-center gap-3">
              {/* Posição */}
              <div className="text-xs font-black w-5 text-center"
                style={{ color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#ffffff50' }}>
                {idx + 1}
              </div>

              {/* Avatar */}
              <Avatar nome={v.nome} fotoUrl={v.foto_url} index={originalIdx} size={28} label={v.label} />

              {/* Pista */}
              <div className="flex-1 relative" style={{ height: 36 }}>
                {/* Asfalto */}
                <div className="absolute inset-0 rounded-lg overflow-hidden"
                  style={{ background: 'linear-gradient(180deg, #2d2d44 0%, #1e1e30 50%, #2d2d44 100%)' }}>

                  {/* Linhas da pista (tracejado central) */}
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center px-1">
                    <div className="w-full flex justify-around">
                      {[...Array(20)].map((_, i) => (
                        <div key={i} className="rounded-full opacity-20"
                          style={{ width: 10, height: 2, background: '#fff' }} />
                      ))}
                    </div>
                  </div>

                  {/* Divisórias das semanas */}
                  {semanas > 0 && [25, 50, 75].map(p => (
                    <div key={p} className="absolute top-0 bottom-0 w-px opacity-20"
                      style={{ left: `${p}%`, background: '#fff' }} />
                  ))}

                  {/* Trilha de progresso */}
                  {pos > 0 && (
                    <div className="absolute top-0 bottom-0 left-0 rounded-lg transition-all duration-700"
                      style={{
                        width: `${Math.max(pos, 4)}%`,
                        background: `linear-gradient(90deg, ${c.fill}22 0%, ${c.fill}55 100%)`,
                        borderRight: `2px solid ${c.fill}`,
                        boxShadow: `0 0 12px ${c.fill}66`,
                      }} />
                  )}

                  {/* Carro */}
                  <div
                    className="absolute top-1/2 transition-all duration-700 flex items-center justify-center"
                    style={{
                      left: `calc(${Math.max(pos, 4)}% - 22px)`,
                      transform: 'translateY(-50%) scaleX(-1)',
                      fontSize: 32,
                      filter: `drop-shadow(0 0 6px ${c.fill})`,
                    }}
                  >
                    {c.car}
                  </div>
                </div>

                {/* Bandeirada (meta) */}
                <div className="absolute right-0 top-0 bottom-0 w-5 flex flex-col justify-center items-center rounded-r-lg overflow-hidden"
                  style={{ background: pos >= 100 ? '#FFD700' : '#ffffff15' }}>
                  {pos >= 100
                    ? <span className="text-xs">🏆</span>
                    : <div className="grid grid-cols-2 gap-px opacity-40">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="w-2 h-2"
                            style={{ background: i % 2 === (Math.floor(i / 2) % 2) ? '#fff' : '#000' }} />
                        ))}
                      </div>
                  }
                </div>
              </div>

              {/* Score */}
              <div className="text-xs font-black min-w-[44px] text-right tabular-nums"
                style={{ color: isLeading ? '#FFD700' : c.fill }}>
                {fmtPct(display)}
                {isLeading && <span className="ml-1">👑</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Rodapé */}
      <div className="flex justify-between text-xs text-white/25 px-4 pb-3"
        style={{ paddingLeft: 'calc(1rem + 20px + 28px + 12px + 12px + 4px)' }}>
        <span>Largada</span>
        {semanas > 0 && <span>50%</span>}
        <span>100% Meta</span>
      </div>
    </div>
  )
}
