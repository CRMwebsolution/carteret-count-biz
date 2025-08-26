import { Link, NavLink } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signOut } from '../lib/auth'
import AuthModal from './AuthModal'

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authModal, setAuthModal] = useState<{ isOpen: boolean; mode: 'signin' | 'signup' }>({
    isOpen: false,
    mode: 'signin'
  })
  const { user, loading } = useAuth()

  async function handleSignOut() {
    try {
      await signOut()
      setIsMenuOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  function openAuthModal(mode: 'signin' | 'signup') {
    setAuthModal({ isOpen: true, mode })
    setIsMenuOpen(false)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">Carteret Local</Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink to="/categories" className={({isActive}) => isActive ? 'text-brand font-medium' : 'text-gray-700'}>Categories</NavLink>
          <NavLink to="/add" className="rounded-full bg-brand text-white px-4 py-2 hover:bg-brand-dark transition">Add a Business</NavLink>
          {!loading && (
            user ? (
              <div className="flex items-center gap-4">
                <NavLink to="/account" className={({isActive}) => isActive ? 'text-brand font-medium' : 'text-gray-700'}>Account</NavLink>
                <button
                  onClick={handleSignOut}
                  className="text-gray-700 hover:text-brand transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="text-gray-700 hover:text-brand transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="rounded-full border border-brand text-brand px-4 py-2 hover:bg-brand hover:text-white transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )
          )}
        </nav>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="px-4 py-4 space-y-3">
            <NavLink 
              to="/categories" 
              className={({isActive}) => `block py-2 ${isActive ? 'text-brand font-medium' : 'text-gray-700'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Categories
            </NavLink>
            <NavLink 
              to="/add" 
              className="block rounded-full bg-brand text-white px-4 py-2 text-center hover:bg-brand-dark transition"
              onClick={() => setIsMenuOpen(false)}
            >
              Add a Business
            </NavLink>
              {!loading && (
                user ? (
                  <>
                    <NavLink 
                      to="/account" 
                      className={({isActive}) => `block py-2 ${isActive ? 'text-brand font-medium' : 'text-gray-700'}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Account
                    </NavLink>
                    <button
                      onClick={handleSignOut}
                      className="block py-2 text-gray-700 hover:text-brand transition-colors w-full text-left"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => openAuthModal('signin')}
                      className="block py-2 text-gray-700 hover:text-brand transition-colors w-full text-left"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="block rounded-full border border-brand text-brand px-4 py-2 text-center hover:bg-brand hover:text-white transition-colors"
                    >
                      Sign Up
                    </button>
                  </>
                )
              )}
          </nav>
        </div>
      )}
      </header>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        mode={authModal.mode}
        onModeChange={(mode) => setAuthModal({ ...authModal, mode })}
      />
    </>
  )
}
