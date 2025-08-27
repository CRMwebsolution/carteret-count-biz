import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, anon, {
  auth: {
    persistSession: true,      // keep JWT so Storage/DB are authenticated
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function storageUrl(bucket: string, path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}

/** Make filenames safe for URLs & storage */
export function safeFilename(name: string) {
  const idx = name.lastIndexOf('.')
  const baseRaw = idx === -1 ? name : name.slice(0, idx)
  const ext = idx === -1 ? '' : name.slice(idx)

  const cleanedBase = baseRaw
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '-') // non-word to dash
    .replace(/-+/g, '-')       // collapse dashes
    .replace(/^-|-$/g, '')     // trim leading/trailing dashes

  return `${cleanedBase || 'file'}${ext}`
}

/** Force Authorization: Bearer <Supabase JWT> on the Storage request */
export async function hardAuthUpload(bucket: string, path: string, file: File) {
  const { data: sess } = await supabase.auth.getSession()
  const token = sess?.session?.access_token
  if (!token) throw new Error('No Supabase session token found')

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`, // ✅ ensure owner_id is the auth.uid() UUID
        'x-upsert': 'false',
        'cache-control': '3600',
        'content-type': file.type || 'application/octet-stream',
      },
      body: file,
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Storage upload failed (${res.status}): ${text || res.statusText}`)
  }
}
