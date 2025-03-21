import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setUser(data);
      } else {
        setUser(null);
        // If no profile exists, sign out
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
      // If error occurs, sign out
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  // Check the useEffect in AuthContext
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
  
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );
  
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    travels_with_pets: boolean;
    travels_with_family: boolean;
    disability_needs: any;
    other_preferences: any;
    created_at: string;
  }
  
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
  
      if (authError) throw authError;
  
      if (authData.user) {
        // Create the user profile immediately after auth
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: authData.user.id,  // This must match the auth.users id
              name: name,
              email: email,
              travels_with_pets: false,
              travels_with_family: false,
              disability_needs: {},
              other_preferences: {}
            }
          ])
          .select()
          .single();
  
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // If profile creation fails, we should clean up
          await supabase.auth.signOut();
          throw new Error('Failed to create user profile');
        }
      }
  
      return authData;
    } catch (error) {
      console.error('Signup process failed:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (authError) throw authError;
  
      if (authData.user) {
        // Check if user profile exists
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
  
        if (profileError || !profileData) {
          // If no profile exists, sign out and throw error
          await supabase.auth.signOut();
          throw new Error('User profile not found. Please sign up first.');
        }
  
        setUser(profileData);
        return authData;
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};