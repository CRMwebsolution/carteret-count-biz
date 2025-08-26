// src/lib/auth.ts
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email?: string
  phone?: string
  [key: string]: any
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser()
  const u: User | null = data.user
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    ...u.user_metadata,
  }
}

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      const u = session.user
      callback({
        id: u.id,
        email: u.email ?? undefined,
        phone: u.phone ?? undefined,
        ...u.user_metadata,
      })
    } else {
      callback(null)
    }
  })

  return data
}
