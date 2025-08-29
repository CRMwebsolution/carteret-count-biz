import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hardSignOut } from '../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type User = SupabaseUser & {
  role?: string
}

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

  // Helper: fetch role from public.users, create row if missing
  const fetchUserWithRole = async (authUser: SupabaseUser): Promise<User> => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (error) {
        // If not found, create with default 'user' role
        if ((error as any)?.code === 'PGRST116') {
          const { data: newUserData, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || null,
              role: 'user',
            })
            .select('role')
            .single()
          if (createError) {
            console.error('Error creating user record:', createError)
            return { ...authUser, role: 'user' }
          }
          return { ...authUser, role: newUserData?.role || 'user' }
        }

        console.error('Error fetching user role:', error)
        return { ...authUser, role: 'user' }
      }

      return { ...authUser, role: userData?.role || 'user' }
    } catch (err) {
      console.error('Exception fetching user role:', err)
      return { ...authUser, role: 'user' }
    }
  }

  // Initial load
  useEffect(() => {
    let canceled = false

    const load = async () => {
      try {
        const { data: authData, error } = await supabase.auth.getUser()
        if (error) {
          if (!canceled) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        if (!canceled && authData?.user) {
          const userWithRole = await fetchUserWithRole(authData.user)
          if (!canceled) setUser(userWithRole)
        } else if (!canceled) {
          setUser(null)
        }

        if (!canceled) setLoading(false)
      } catch (err) {
        if (!canceled) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    load()

    // Auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (canceled) return
      if (session?.user) {
        const userWithRole = await fetchUserWithRole(session.user)
        if (!canceled) setUser(userWithRole)
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

  // Hardened sign-out using helper (clears tokens + reloads)
  const signOut = async () => {
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
