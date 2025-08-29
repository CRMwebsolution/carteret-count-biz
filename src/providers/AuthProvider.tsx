```typescript
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
  
  console.log('AuthProvider: Component rendered, initial state:', { user: user?.email, loading });

  // Helper function to fetch user with role
  const fetchUserWithRole = async (authUser: SupabaseUser): Promise<User> => {
    console.log('fetchUserWithRole: Starting for user:', authUser.email, authUser.id);
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      console.log('fetchUserWithRole: Database query result:', { userData, error });
      
      if (error) {
        console.error('Error fetching user role:', error);
        // If user doesn't exist in users table, create them
        if (error.code === 'PGRST116') {
          console.log('fetchUserWithRole: User not found in database, creating new record');
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
          
          console.log('fetchUserWithRole: Create user result:', { newUserData, createError });
          
          if (createError) {
            console.error('Error creating user record:', createError);
            console.log('fetchUserWithRole: Returning fallback role "user" due to create error');
            return { ...authUser, role: 'user' };
          }
          
          console.log('fetchUserWithRole: Successfully created user with role:', newUserData?.role);
          return { ...authUser, role: newUserData?.role || 'user' };
        }
        
        console.log('fetchUserWithRole: Returning fallback role "user" due to other error');
        return { ...authUser, role: 'user' };
      }
      
      console.log('fetchUserWithRole: Successfully fetched role from database:', userData?.role);
      return { ...authUser, role: userData?.role || 'user' };
    } catch (err) {
      console.error('Exception fetching user role:', err);
      console.log('fetchUserWithRole: Returning fallback role "user" due to exception');
      return { ...authUser, role: 'user' };
    }
  };

  // Load initial user once
  useEffect(() => {
    console.log('AuthProvider useEffect: Starting initial load');
    let canceled = false;

    const loadUserWithRole = async () => {
      console.log('loadUserWithRole: Starting async function');
      try {
        const { data: authData, error } = await supabase.auth.getUser();
        
        console.log('loadUserWithRole: supabase.auth.getUser() result:', { 
          user: authData?.user?.email, 
          userId: authData?.user?.id,
          error 
        });
        
        if (error) {
          console.error('Auth error:', error);
          if (!canceled) {
            console.log('loadUserWithRole: Setting user to null due to auth error');
            setUser(null);
            setLoading(false);
          }
          return;
        }
        
        if (!canceled && authData.user) {
          console.log('loadUserWithRole: Auth user found, fetching role from database');
          const userWithRole = await fetchUserWithRole(authData.user);
          console.log('Initial user load with role:', userWithRole);
          console.log('loadUserWithRole: Setting user state with role:', userWithRole.role);
          setUser(userWithRole);
        } else if (!canceled) {
          console.log('loadUserWithRole: No auth user found, setting user to null');
          setUser(null);
        }
        
        if (!canceled) {
          console.log('loadUserWithRole: Setting loading to false');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        if (!canceled) {
          console.log('loadUserWithRole: Exception occurred, setting user to null and loading to false');
          setUser(null);
          setLoading(false);
        }
      }
    };

    console.log('AuthProvider useEffect: Calling loadUserWithRole');
    loadUserWithRole();

    // Subscribe to auth changes
    console.log('AuthProvider useEffect: Setting up auth state change listener');
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (session?.user) {
        console.log('Auth state change: User found in session, fetching role');
        const userWithRole = await fetchUserWithRole(session.user);
        console.log('Auth state change - user with role:', userWithRole);
        console.log('Auth state change: Setting user state with role:', userWithRole.role);
        setUser(userWithRole);
      } else {
        console.log('Auth state change: No user in session, setting user to null');
        setUser(null);
      }
      
      if (!canceled) {
        console.log('Auth state change: Setting loading to false');
        setLoading(false);
      }
    });

    console.log('AuthProvider useEffect: Setup complete, returning cleanup function');
    return () => {
      console.log('AuthProvider useEffect cleanup: Canceling and unsubscribing');
      canceled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('AuthProvider signOut: Starting sign out process');
    await supabase.auth.signOut();
    console.log('AuthProvider signOut: Sign out complete');
    // user gets set to null by the listener
  };

  console.log('AuthProvider: Rendering with state:', { user: user?.email, userRole: user?.role, loading });

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```