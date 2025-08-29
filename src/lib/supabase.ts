import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function storageUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

export function safeFilename(name: string) {
  const idx = name.lastIndexOf('.')
  const baseRaw = idx === -1 ? name : name.slice(0, idx)
  const ext = idx === -1 ? '' : name.slice(idx)

  const cleanedBase = baseRaw
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${cleanedBase || 'file'}${ext}`
}

/** Authenticated Storage upload (keep for future photo support) */
export async function hardAuthUpload(bucket: string, path: string, file: File) {
  const { data: sess } = await supabase.auth.getSession()
  const token = sess?.session?.access_token
  if (!token) throw new Error('No Supabase session token found')
  const userId = sess?.session?.user?.id
  if (!userId) throw new Error('No user ID found in session')

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return data
}

/** Bulletproof sign-out + cleanup + hard redirect */
export async function hardSignOut(opts?: { redirectTo?: string }) {
  try { await supabase.auth.signOut({ scope: 'local' }) } catch {}

  // Close realtime channels (defensive)
  try {
    // @ts-ignore
    if (supabase?.realtime?.channels) {
      // @ts-ignore
      for (const ch of supabase.realtime.channels) {
        try { await ch.unsubscribe() } catch {}
      }
      // @ts-ignore
      try { await supabase.realtime.disconnect() } catch {}
    }
  } catch {}

  // Remove lingering auth tokens that can rehydrate a session
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key)
      }
    }
  } catch {}

  try { sessionStorage.clear() } catch {}

  const target = opts?.redirectTo ?? '/'
  if (location.pathname !== target) {
    location.assign(target)
  } else {
    location.reload()
  }
}
