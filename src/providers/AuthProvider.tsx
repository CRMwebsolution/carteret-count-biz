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

  // Helper function to fetch user with role
  const fetchUserWithRole = async (authUser: SupabaseUser): Promise<User> => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      if (error) {
        console.error('Error fetching user role:', error);
        // If user doesn't exist in users table, create them
        if (error.code === 'PGRST116') {
          const { data: newUserData, error: createError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || null,
              role: 'user'
            })
            .select('role')
            .single();
          
          if (createError) {
            console.error('Error creating user record:', createError);
            return { ...authUser, role: 'user' };
          }
          
          return { ...authUser, role: newUserData?.role || 'user' };
        }
        
        return { ...authUser, role: 'user' };
      }
      
      return { ...authUser, role: userData?.role || 'user' };
    } catch (err) {
      console.error('Exception fetching user role:', err);
      return { ...authUser, role: 'user' };
    }
  };

  // Load initial user once
  useEffect(() => {
    let canceled = false;

    const loadUserWithRole = async () => {
      try {
        const { data: authData, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Auth error:', error);
          if (!canceled) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        if (!canceled && authData.user) {
          const userWithRole = await fetchUserWithRole(authData.user);
          console.log('Initial user load with role:', userWithRole);
          setUser(userWithRole);
        } else if (!canceled) {
          setUser(null);
        }
        
        if (!canceled) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        if (!canceled) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    loadUserWithRole();

    // Subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (session?.user) {
        const userWithRole = await fetchUserWithRole(session.user);
        console.log('Auth state change - user with role:', userWithRole);
        setUser(userWithRole);
      } else {
        setUser(null);
      }
      
      if (!canceled) {
        setLoading(false);
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