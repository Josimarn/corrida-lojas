'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponent } from '@/lib/supabase-browser'

export default function DashboardPage() {
  const router  = useRouter()
  const supabase = createClientComponent()

  useEffect(() => {
    async function redirect() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }
      const user = session.user

      const { data: usuario } = await supabase
        .from('usuarios').select('perfil').eq('id', user.id).single()

      if (!usuario) { router.replace('/'); return }

      const rotas = {
        super_admin:   '/super-admin',
        admin_cliente: '/admin',
        dono:          '/dono',
        supervisor:    '/supervisor',
        gerente:       '/gerente',
        vendedor:      '/vendedor',
      }
      router.replace(rotas[usuario.perfil] || '/')
    }
    redirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-stone-400 text-sm">Carregando...</div>
    </div>
  )
}
