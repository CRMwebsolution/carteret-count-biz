// src/lib/auth.ts
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type AuthUser = {
  id: string
  email?: string
  phone?: string
  role?: string
  email_confirmed_at?: string
  [key: string]: any
}

function toAuthUser(u: User | null, role?: string): AuthUser | null {
  if (!u) return null
  return {
    id: u.id,
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    role: role,
    email_confirmed_at: u.email_confirmed_at ?? undefined,
    ...u.user_metadata,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  
  if (!data.user) return null
  
  // Fetch role from public.users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()
  
  return toAuthUser(data.user, userData?.role)
}

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null)
      return
    }
    
    // Fetch role from public.users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    callback(toAuthUser(session.user, userData?.role))
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
