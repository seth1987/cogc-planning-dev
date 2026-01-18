import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Vérifier la session au montage
    checkUser();

    // Écouter les changements d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);
        if (session?.user) {
          setUser(session.user);
          setError(null);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      
      // D'abord essayer de récupérer la session (inclut le refresh token)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ Session error:', sessionError.message);
        // Si erreur de session, nettoyer et rediriger vers login
        await cleanupAndLogout();
        return;
      }
      
      if (!session) {
        // Pas de session = pas connecté, c'est normal
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Session existe, récupérer l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        // Erreur JWT (expiré, invalide, etc.) → nettoyer et rediriger vers login
        console.warn('⚠️ JWT error:', userError.message);
        await cleanupAndLogout();
        return;
      }
      
      setUser(user);
      setError(null);
    } catch (error) {
      console.error('❌ Auth check error:', error.message);
      // En cas d'erreur inattendue, nettoyer la session
      await cleanupAndLogout();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Nettoie la session locale et déconnecte proprement
   * Utilisé quand le JWT est expiré ou invalide
   */
  const cleanupAndLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignorer les erreurs de signOut (la session est déjà invalide)
      console.warn('SignOut cleanup error (ignored):', e.message);
    }
    setUser(null);
    setError(null); // Pas d'erreur à afficher, juste rediriger vers login
    setLoading(false);
  };

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user,
  };
}

export default useAuth;
