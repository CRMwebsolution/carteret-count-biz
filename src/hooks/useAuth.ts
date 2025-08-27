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
        if (mounted) {
          setUser(u)
        }
      })
      .catch((error) => {
        console.error('Error fetching current user:', error)
        if (mounted) {
          setUser(null)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    // subscription
    const { subscription } = onAuthStateChange((u) => {
      if (mounted) {
        setUser(u)
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
