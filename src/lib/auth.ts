// src/lib/auth.ts
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email?: string
  phone?: string
  [key: string]: any
}

function toAuthUser(u: User | null): AuthUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    ...u.user_metadata,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return toAuthUser(data.user)
}

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAuthUser(session?.user ?? null))
  })
  return data
}

/** Email OTP (magic link) sign-in */
export async function signIn(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return true
}

/** Explicit alias for OTP sign-in */
export async function signInWithOtp(email: string) {
  return signIn(email)
}

/** Email + password sign-in */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return toAuthUser(data.user)
}

/** Email + password sign-up */
export async function signUpWithPassword(
  email: string,
  password: string,
  metadata?: Record<string, any>
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  })
  if (error) throw error
  return toAuthUser(data.user)
}

/** Alias expected by existing imports */
export async function signUp(
  email: string,
  password: string,
  metadata?: Record<string, any>
) {
  return signUpWithPassword(email, password, metadata)
}

/**Sign out */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  return true
}
