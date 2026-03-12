/**
 * AuthContext.jsx
 * Manejo de Autenticación Centralizado usando Supabase Auth.
 * Provee la sesión, el usuario activo y el store_id del tenant a toda la aplicación.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Multi-tenant: tienda activa del usuario autenticado
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState(null);

  /**
   * Carga la tienda asociada al usuario en la sesión activa.
   * Si no tiene tienda, storeId queda en null (el usuario debe crear una).
   */
  const loadUserStore = useCallback(async (userId) => {
    if (!userId) {
      setStoreId(null);
      setStoreName(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('owner_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (usuario sin tienda aún)
        console.error('[Auth] Error cargando tienda:', error.message);
      }

      setStoreId(data?.id ?? null);
      setStoreName(data?.name ?? null);
    } catch (err) {
      console.error('[Auth] Excepción al cargar tienda:', err);
    }
  }, []);

  useEffect(() => {
    // 1. Obtener sesión activa al cargar
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('[Auth] Error obteniendo sesión:', error.message);
        }
        setSession(session);
        setUser(session?.user ?? null);
        return loadUserStore(session?.user?.id ?? null);
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
      loadUserStore(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadUserStore]);

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
  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  // RF-02: Un único rol "Encargado" para el MVP
  const isDueno = true;

  const value = {
    session,
    user,
    storeId,
    storeName,
    login,
    logout,
    register,
    isDueno,
    isAuthenticated: !!user,
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
              <span className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
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
