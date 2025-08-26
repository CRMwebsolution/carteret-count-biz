import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  email?: string
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/account`
    }
  })
  
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}