/**
 * AppContext.jsx
 * Contexto global de la aplicación para estados compartidos
 * (Ej: UI global, alertas de inventario, estado PWA offline/online)
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { syncOfflineData } from '../utils/offlineSync';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Estado de conexión a internet para PWA
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Simulación rápida del contador de stock bajo (luego se conectará a Supabase)
  const [lowStockCount, setLowStockCount] = useState(0);
  
  // Estado del Tema (claro/oscuro). Lee de localStorage o detecta prefers-color-scheme del SO (RF-12.03/04).
  const [theme, setTheme] = useState(() => {
    // RF-12.03: Persistir preferencia entre sesiones
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    // RF-12.04: Respetar preferencia del sistema operativo
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Intentar sincronizar datos locales al volver online
      syncOfflineData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sincronizar en el arranque de la app si inició con internet
    if (navigator.onLine) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const value = {
    isOnline,
    lowStockCount,
    setLowStockCount,
    theme,
    toggleTheme
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
