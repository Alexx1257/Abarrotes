/**
 * Layout.jsx — Componente raíz de la aplicación autenticada
 *
 * Estructura de layout:
 *  ┌──────────────────────────────────────────────────────┐
 *  │  SIDEBAR fixed (w-[240px])  │  MAIN scrollable       │
 *  │  • Solo visible en md+      │  • ml-[240px] en md+   │
 *  │  • Overlay en mobile        │  • Header sticky mobile│
 *  │                             │  • Bottom nav mobile   │
 *  └──────────────────────────────────────────────────────┘
 */
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp }  from '../context/AppContext';
import {
  LayoutDashboard, ShoppingCart, Package, ArchiveX,
  CreditCard, BarChart2, Settings, LogOut,
  Wifi, WifiOff, Menu, X, Sun, Moon
} from 'lucide-react';
import { useState, useEffect } from 'react';

/* ── Ítems de navegación ── */
const NAV_ITEMS = [
  { to: '/',            label: 'Punto de Venta', icon: ShoppingCart,    section: 'main' },
  { to: '/inventario',  label: 'Catálogo e Inventario', icon: Package,  section: 'main' },
  { to: '/fiado',       label: 'Fiado',          icon: CreditCard,      section: 'main' },
  { to: '/reportes',    label: 'Dashboard y Reportes', icon: BarChart2, section: 'main' },
  { to: '/corte',       label: 'Corte de Caja',  icon: Settings,        section: 'ops' },
];

const BOTTOM_NAV = [
  { to: '/',            label: 'Venta',      icon: ShoppingCart    },
  { to: '/inventario',  label: 'Cat/Inv',    icon: Package         },
  { to: '/fiado',       label: 'Fiado',      icon: CreditCard      },
  { to: '/reportes',    label: 'Dashboard',  icon: LayoutDashboard },
];

const navItemBase = 'flex items-center gap-3 px-3 rounded-lg min-h-[44px] text-sm font-medium transition-colors duration-[150ms] border border-transparent';
const navItemActive   = 'bg-brand-500/10 text-brand-300 border-brand-500/20';
const navItemInactive = 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary';

export default function Layout({ children }) {
  const { user, logout, isDueno }   = useAuth();
  const { lowStockCount, isOnline, theme, toggleTheme } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'US';

  return (
    <div className="min-h-screen bg-surface-base">
      {sidebarOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={[
          'fixed top-0 left-0 z-50 h-screen w-[240px]',
          'flex flex-col bg-surface-sidebar border-r border-border-subtle',
          'transition-transform duration-[250ms] ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg text-xl bg-gradient-to-br from-brand-500 to-accent-500 shrink-0">
            🏪
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-primary truncate">AbarroteSaaS</p>
            <p className="text-xxs text-ink-muted truncate">Tienda Principal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <p className="px-3 pt-3 pb-1.5 text-xxs font-semibold text-ink-muted uppercase tracking-widest">
            Principal
          </p>
          {NAV_ITEMS.filter(i => i.section === 'main').map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${navItemBase} ${isActive ? navItemActive : navItemInactive}`
              }
            >
              <item.icon size={17} className="shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.to === '/inventario' && lowStockCount > 0 && (
                <span className="bg-danger-500 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
                  {lowStockCount}
                </span>
              )}
            </NavLink>
          ))}
          
          <p className="px-3 pt-4 pb-1.5 text-xxs font-semibold text-ink-muted uppercase tracking-widest">
            Operaciones
          </p>
          {NAV_ITEMS.filter(i => i.section === 'ops').map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${navItemBase} ${isActive ? navItemActive : navItemInactive}`
              }
            >
              <item.icon size={17} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 p-4 border-t border-border-subtle space-y-3">
          <div className={[
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xxs font-semibold border',
            isOnline ? 'text-success-400 bg-success-400/10 border-success-400/20' : 'text-danger-400 bg-danger-400/10 border-danger-400/20',
          ].join(' ')}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className={['w-1.5 h-1.5 rounded-full animate-pulse-dot', isOnline ? 'bg-success-400' : 'bg-danger-400'].join(' ')} />
            {isOnline ? 'En línea' : 'Sin conexión'}
          </div>

          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-semibold text-ink-muted">Apariencia</span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-ink-secondary hover:bg-surface-hover hover:text-ink-primary transition-colors"
              title="Cambiar tema"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-hover transition-colors duration-[150ms]">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.email}</p>
              <p className="text-xxs text-ink-muted capitalize">Encargado</p>
            </div>
            <button onClick={logout} title="Cerrar sesión" className="p-2 rounded-lg text-ink-muted hover:text-danger-400 hover:bg-danger-400/10 transition-colors duration-[150ms] shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="md:ml-[240px] flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-surface-default border-b border-border-subtle shrink-0">
          <button onClick={() => setSidebarOpen(o => !o)} aria-label="Abrir menú" className="p-2 rounded-lg text-ink-secondary hover:bg-surface-elevated transition-colors">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>🏪</span><span>AbarroteSaaS</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={toggleTheme} className="p-2 rounded-lg text-ink-secondary hover:bg-surface-elevated transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-brand-400 to-accent-500 text-white">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          <div className="max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-30 bg-surface-sidebar border-t border-border-subtle flex items-center justify-around px-1">
          {BOTTOM_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => [
                  'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-[10px] font-medium transition-colors duration-[150ms] min-w-[52px]',
                  isActive ? 'text-brand-400' : 'text-ink-muted',
                ].join(' ')
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
