import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // AuthProvider's onAuthStateChange will update the Navbar
      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Optional metadata—adjust to your needs
          data: { full_name: fullName },
          // Important so session/redirect stays on the same origin
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      setSuccess('Account created! Check your email to verify, then sign in.');
      onModeChange('signin');
    } catch (e: any) {
      setErr(e?.message ?? 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-6">
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                placeholder="Jane Doe"
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>

          {err && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {err}
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
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
