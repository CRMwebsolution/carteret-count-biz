// src/hooks/useAuth.ts
import { useState, useEffect } from 'react'
import { AuthUser, getCurrentUser, onAuthStateChange } from '../lib/auth'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // initial fetch
    getCurrentUser().then((u) => {
      if (mounted) {
        setUser(u)
        setLoading(false)
      }
    })

    // subscription
    const { data: { subscription } } = onAuthStateChange((u) => {
      if (mounted) {
        setUser(u)
        setLoading(false)
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
