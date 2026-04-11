import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Cria o bucket avatars se não existir
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'avatars')

  if (!exists) {
    const { error } = await supabase.storage.createBucket('avatars', { public: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Cria as políticas RLS necessárias
  const policies = [
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='avatars_select'
      ) THEN
        CREATE POLICY avatars_select ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='avatars_insert'
      ) THEN
        CREATE POLICY avatars_insert ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
      END IF;
    END $$;`,
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='avatars_delete'
      ) THEN
        CREATE POLICY avatars_delete ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
      END IF;
    END $$;`,
  ]

  for (const sql of policies) {
    const { error } = await supabase.rpc('exec_sql', { sql }).single()
    // ignora erro se rpc não existir — policies podem ser criadas manualmente
    if (error && !error.message.includes('exec_sql')) {
      console.error('Policy error:', error.message)
    }
  }

  return NextResponse.json({ ok: true, criado: !exists })
}
