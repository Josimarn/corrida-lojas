'use client'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const PERFIL_LABELS = { dono: 'Dono', supervisor: 'Supervisor', gerente: 'Gerente', vendedor: 'Vendedor' }
const PERFIL_BADGE  = { dono: 'badge-purple', supervisor: 'badge-blue', gerente: 'badge-green', vendedor: 'badge-gray' }

export default function NavBar({ usuario, titulo, subtitulo }) {
  const router   = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl">🏁</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900 leading-tight truncate">
              {titulo || 'Corrida das Lojas'}
            </p>
            {subtitulo && <p className="text-xs text-stone-400 truncate">{subtitulo}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {usuario && (
            <div className="hidden sm:flex items-center gap-2">
              <span className={`badge ${PERFIL_BADGE[usuario.perfil]}`}>
                {PERFIL_LABELS[usuario.perfil]}
              </span>
              <span className="text-sm text-stone-600 max-w-[120px] truncate">{usuario.nome}</span>
            </div>
          )}
          <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
