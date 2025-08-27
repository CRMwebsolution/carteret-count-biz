// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { AuthUser, getCurrentUser, onAuthStateChange } from '../lib/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // initial fetch
    getCurrentUser()
      .then((u) => {
        console.log('useAuth - getCurrentUser resolved with user:', u)
        if (mounted) {
          setUser(u)
          console.log('useAuth - setUser called with:', u)
        }
      })
      .catch((error) => {
        console.error('Error fetching current user:', error)
        if (mounted) {
          setUser(null)
          console.log('useAuth - setUser called with null due to error')
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
          console.log('useAuth - setLoading(false) called')
        }
      })

    // subscription
    const { subscription } = onAuthStateChange((u) => {
      console.log('useAuth - onAuthStateChange callback called with user:', u)
      if (mounted) {
        setUser(u)
        console.log('useAuth - setUser called from subscription with:', u)
        // Don't set loading to false here since it's already false after initial fetch
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}

export default useAuth
