import { createBrowserClient } from '@supabase/ssr'

export function createClientComponent() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Alias para compatibilidade com imports que usam createClient
export const createClient = createClientComponent
