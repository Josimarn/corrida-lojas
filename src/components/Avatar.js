import { getCor, getInitials } from '@/lib/helpers'

export default function Avatar({ nome, fotoUrl, index = 0, size = 36, label }) {
  const c = getCor(index)
  const displayLabel = label || getInitials(nome)
  const fontSize = label
    ? Math.round(size * (label.length > 3 ? 0.25 : label.length > 2 ? 0.30 : 0.35))
    : Math.round(size * 0.35)
  const style = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
    border: `1.5px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: c.bg, fontWeight: 700, fontSize,
    color: c.text,
  }
  if (fotoUrl) {
    return (
      <div style={{ ...style, padding: 0 }}>
        <img src={fotoUrl} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      </div>
    )
  }
  return <div style={style}>{displayLabel}</div>
}
