import { useState } from 'react'
import { signInWithPassword, signUp } from '../lib/auth'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
}

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'signup') {
        await signUp(email, password)
        setSuccess('Account created! Please check your email to verify your account.')
      } else {
        await signInWithPassword(email, password)
        setSuccess('Signed in successfully!')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand text-white py-3 font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => onModeChange(mode === 'signup' ? 'signin' : 'signup')}
            className="text-brand hover:underline text-sm"
          >
            {mode === 'signup' 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
    </div>
  )
}