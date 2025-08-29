import { useState, useEffect } from 'react'
import { useAuth } from '../providers/AuthProvider'
import { supabase } from '../lib/supabase'

type Listing = {
  id: string
  name: string
  city: string
  status: string
  created_at: string
  user_id: string
  email?: string
  phone?: string
  description?: string
}

type Verification = {
  id: number
  listing_id: string
  requester_id: string
  entity_type: string
  status: string
  created_at: string
  notes?: string
  listing?: { name: string }
  requester?: { email: string }
}

type User = {
  id: string
  email: string
  full_name?: string
  role: string
  created_at: string
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  
  // Debug logging
  console.log('Admin component debug:', { authLoading, user, userRole: user?.role, userEmail: user?.email })
  
  const [activeTab, setActiveTab] = useState<'listings' | 'verifications' | 'users'>('listings')
  const [listings, setListings] = useState<Listing[]>([])
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.email?.includes('admin')

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadData()
    }
  }, [authLoading, user, isAdmin])

  async function loadData() {
    setLoading(true)
    setError(null)
    
    try {
      // Load listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id, name, city, status, created_at, user_id, email, phone, description')
        .order('created_at', { ascending: false })
        .limit(50)

      if (listingsError) throw listingsError
      setListings(listingsData || [])

      // Load verifications
      const { data: verificationsData, error: verificationsError } = await supabase
        .from('verifications')
        .select(`
          id, listing_id, requester_id, entity_type, status, created_at, notes,
          listing:listings(name),
          requester:users(email)
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (verificationsError) throw verificationsError
      setVerifications(verificationsData || [])

      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(50)

      if (usersError) throw usersError
      setUsers(usersData || [])

    } catch (err: any) {
      setError(err.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  async function updateListingStatus(id: string, status: 'active' | 'rejected' | 'suspended') {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch (err: any) {
      setError(err.message || 'Failed to update listing')
    }
  }

  async function updateVerificationStatus(id: number, status: 'approved' | 'rejected') {
    try {
      const { error } = await supabase
        .from('verifications')
        .update({ 
          status, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', id)

      if (error) throw error

      // If approved, also update the listing badge
      if (status === 'approved') {
        const verification = verifications.find(v => v.id === id)
        if (verification?.listing_id) {
          await supabase
            .from('listings')
            .update({ badge: 'verified' })
            .eq('id', verification.listing_id)
        }
      }
      
      setVerifications(prev => prev.map(v => v.id === id ? { ...v, status } : v))
    } catch (err: any) {
      setError(err.message || 'Failed to update verification')
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete user')
    }
  }

  async function deleteListing(id: string) {
    if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setListings(prev => prev.filter(l => l.id !== id))
    } catch (err: any) {
      setError(err.message || 'Failed to delete listing')
    }
  }

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">Please sign in to access the admin dashboard.</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
      {/* Temporary debug info */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-bold text-yellow-800 mb-2">Debug Info (remove this later):</h3>
        <p className="text-sm">Auth Loading: {String(authLoading)}</p>
        <p className="text-sm">User: {user ? user.email : 'None'}</p>
        <p className="text-sm">User Role: {user?.role || 'No role'}</p>
        <p className="text-sm">Is Admin: {String(isAdmin)}</p>
        <p className="text-sm">Admin Check: {String(user?.role === 'admin')} || {String(user?.email?.includes('admin'))}</p>
      </div>
      {/* End temporary debug info */}

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage listings, verifications, and users</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'listings', label: 'Listings', count: listings.length },
            { key: 'verifications', label: 'Verifications', count: verifications.length },
            { key: 'users', label: 'Users', count: users.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {/* Listings Tab */}
          {activeTab === 'listings' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Listings Management</h2>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Refresh
                </button>
              </div>
              
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {listings.map((listing) => (
                        <tr key={listing.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{listing.name}</div>
                              <div className="text-sm text-gray-500">{listing.city}</div>
                              {listing.email && (
                                <div className="text-xs text-gray-400">{listing.email}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              listing.status === 'active' ? 'bg-green-100 text-green-800' :
                              listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              listing.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(listing.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {listing.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateListingStatus(listing.id, 'active')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateListingStatus(listing.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {listing.status === 'active' && (
                              <button
                                onClick={() => updateListingStatus(listing.id, 'suspended')}
                                className="text-yellow-600 hover:text-yellow-900"
                              >
                                Suspend
                              </button>
                            )}
                            <button
                              onClick={() => deleteListing(listing.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Verifications Tab */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Verifications Management</h2>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Refresh
                </button>
              </div>
              
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requester
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {verifications.map((verification) => (
                        <tr key={verification.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {verification.listing?.name || 'Unknown Business'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {verification.requester?.email || 'Unknown User'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {verification.entity_type?.replace('_', ' ') || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              verification.status === 'approved' ? 'bg-green-100 text-green-800' :
                              verification.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                              verification.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {verification.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {verification.status === 'submitted' && (
                              <>
                                <button
                                  onClick={() => updateVerificationStatus(verification.id, 'approved')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => updateVerificationStatus(verification.id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Users Management</h2>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Refresh
                </button>
              </div>
              
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {user.role !== 'admin' && (
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}