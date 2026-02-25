import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Usa sessionStorage se siamo nel browser, altrimenti undefined
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true, // Ora persisterà solo finché la scheda è aperta
  },
})
