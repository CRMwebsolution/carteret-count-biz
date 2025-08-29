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
  console.log('getCurrentUser - supabase.auth.getUser() result:', { data, error })
  
  if (error) {
    console.log('getCurrentUser - auth error, returning null')
    return null
  }
  
  if (!data.user) {
    console.log('getCurrentUser - no user in data, returning null')
    return null
  }
  
  // Fetch role from public.users table
  let userData = null
  try {
    const { data: userDataResult, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()
    
    if (userDataError) {
      console.error('getCurrentUser - error fetching userData:', userDataError)
      // If user doesn't exist in users table, create them
      if (userDataError.code === 'PGRST116') {
        console.log('getCurrentUser - user not found in users table, creating user record')
        const { data: newUserData, error: createError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || null,
            role: 'user'
          })
          .select('role')
          .single()
        
        if (createError) {
          console.error('getCurrentUser - error creating user record:', createError)
          userData = { role: 'user' } // fallback
        } else {
          userData = newUserData
          console.log('getCurrentUser - created new user record:', userData)
        }
      } else {
        userData = { role: 'user' } // fallback for other errors
      }
    } else {
      userData = userDataResult
    }
  } catch (err) {
    console.error('getCurrentUser - exception fetching userData:', err)
    userData = { role: 'user' } // fallback
  }
  
  console.log('getCurrentUser - userData from users table:', userData)
  
  const authUser = toAuthUser(data.user, userData?.role)
  console.log('getCurrentUser - final authUser:', authUser)
  
  return authUser
}

export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    console.log('onAuthStateChange - event:', _event, 'session:', session)
    
    if (!session?.user) {
      console.log('onAuthStateChange - no session or user, calling callback with null')
      callback(null)
      return
    }
    
    // Fetch role from public.users table
    let userData = null
    try {
      const { data: userDataResult, error: userDataError } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (userDataError) {
        console.error('onAuthStateChange - error fetching userData:', userDataError)
        // If user doesn't exist in users table, create them
        if (userDataError.code === 'PGRST116') {
          console.log('onAuthStateChange - user not found in users table, creating user record')
          const { data: newUserData, error: createError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || null,
              role: 'user'
            })
            .select('role')
            .single()
          
          if (createError) {
            console.error('onAuthStateChange - error creating user record:', createError)
            userData = { role: 'user' } // fallback
          } else {
            userData = newUserData
            console.log('onAuthStateChange - created new user record:', userData)
          }
        } else {
          userData = { role: 'user' } // fallback for other errors
        }
      } else {
        userData = userDataResult
      }
    } catch (err) {
      console.error('onAuthStateChange - exception fetching userData:', err)
      userData = { role: 'user' } // fallback
    }
    
    console.log('onAuthStateChange - userData from users table:', userData)
    
    const authUser = toAuthUser(session.user, userData?.role)
    console.log('onAuthStateChange - final authUser:', authUser)
    
    callback(authUser)
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