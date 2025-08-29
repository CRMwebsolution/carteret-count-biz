import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hardSignOut } from '../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type User = SupabaseUser & { role?: string }

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch role (creates 'users' row if missing)
  const fetchUserWithRole = async (authUser: SupabaseUser): Promise<User> => {
    try {
      const { data: row, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (error) {
        // If not found, create a default row
        if ((error as any)?.code === 'PGRST116') {
          const { data: created, error: cErr } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || null,
              role: 'user',
            })
            .select('role')
            .single()
          if (cErr) {
            console.error('Error creating users row:', cErr)
            return { ...authUser, role: 'user' }
          }
          return { ...authUser, role: created?.role || 'user' }
        }
        console.error('Error loading role:', error)
        return { ...authUser, role: 'user' }
      }

      return { ...authUser, role: row?.role || 'user' }
    } catch (e) {
      console.error('fetchUserWithRole exception:', e)
      return { ...authUser, role: 'user' }
    }
  }

  // Initial load
  useEffect(() => {
    let canceled = false

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          if (!canceled) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        if (!canceled && data?.user) {
          const withRole = await fetchUserWithRole(data.user)
          if (!canceled) setUser(withRole)
        } else if (!canceled) {
          setUser(null)
        }
        if (!canceled) setLoading(false)
      } catch (e) {
        if (!canceled) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    bootstrap()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (canceled) return
      if (session?.user) {
        const withRole = await fetchUserWithRole(session.user)
        if (!canceled) setUser(withRole)
      } else {
        if (!canceled) setUser(null)
      }
      if (!canceled) setLoading(false)
    })

    return () => {
      canceled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    // Hardened logout: clears sb-* tokens and reloads
    await hardSignOut({ redirectTo: '/' })
    try { setUser(null) } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
