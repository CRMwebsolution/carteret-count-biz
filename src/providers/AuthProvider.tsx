import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type User = SupabaseUser & {
  role?: string;
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial user once
  useEffect(() => {
    let canceled = false;

    const loadUserWithRole = async () => {
      const { data: authData } = await supabase.auth.getUser();
      
      if (!canceled && authData.user) {
        // Fetch role from users table
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', authData.user.id)
          .single();
        
        const userWithRole = {
          ...authData.user,
          role: userData?.role || 'user'
        };
        
        setUser(userWithRole);
      } else if (!canceled) {
        setUser(null);
      }
      
      if (!canceled) {
        setLoading(false);
      }
    };

    loadUserWithRole();

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Fetch role from users table
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        const userWithRole = {
          ...session.user,
          role: userData?.role || 'user'
        };
        
        setUser(userWithRole);
      } else {
        setUser(null);
      }
    });

    return () => {
      canceled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // user gets set to null by the listener
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
