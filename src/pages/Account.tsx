export default function Account() {
  const { user, loading } = useAuth()
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({
    isOpen: false,
    mode: 'signin'
  })

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-12 text-center">
        <h1 className="text-xl md:text-2xl font-bold mb-4">Sign in to access your account</h1>
        <p className="text-gray-600 mb-8">
          Create an account to manage your business listings and track your submissions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setAuthModal({ isOpen: true, mode: 'signin' })}
            className="rounded-xl bg-brand text-white px-6 py-3 hover:bg-brand-dark transition-colors font-medium"
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthModal({ isOpen: true, mode: 'signup' })}
            className="rounded-xl border border-brand text-brand px-6 py-3 hover:bg-brand hover:text-white transition-colors font-medium"
          >
            Create Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-12">
      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h1 className="text-xl md:text-2xl font-bold mb-4">My Account</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
              user.email_confirmed_at 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {user.email_confirmed_at ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
            <p className="text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-lg font-semibold mb-4">My Listings</h2>
        <p className="text-gray-600 mb-4">
          Manage your business listings, track submissions, and update information.
        </p>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-500 text-sm">
            Listing management features coming soon. For now, you can add new businesses using the "Add a Business" button.
          </p>
        </div>
      </div>
    </div>
  )
}
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'
