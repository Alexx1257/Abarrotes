/**
 * AuthContext.jsx
 * Manejo de Autenticación Centralizado usando Supabase Auth.
 * Provee la sesión y el usuario activo a toda la aplicación.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión activa al cargar
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[Auth] Error obteniendo sesión:', error.message);
        }
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('[Auth] Excepción al obtener sesión:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Suscribirse a cambios de auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Función Helper para Iniciar Sesión
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Función Helper para Cerrar Sesión
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Función Helper para Registrarse
  const register = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      // You can add data to auth.users metadata if needed:
      // options: { data: userData }
    });
    if (error) throw error;
    return data;
  };

  // Identificar rol del usuario (Simulado como 'dueño' si está logueado para fines del MVP)
  const isDueno = true; // El documento RF-02 especifica "un único rol: Encargado".

  const value = {
    session,
    user,
    login,
    logout,
    register,
    isDueno,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-surface-base flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center text-3xl shadow-brand-glow animate-pulse">
              🏪
            </div>
            <div className="flex items-center gap-2 text-ink-secondary">
              <span className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></span>
              <span className="font-medium">Cargando aplicación...</span>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
