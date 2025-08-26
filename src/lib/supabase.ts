import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, anon, { auth: { persistSession: false } })

export function storageUrl(bucket: string, path: string){
  return `${url}/storage/v1/object/public/${bucket}/${path}`
}
