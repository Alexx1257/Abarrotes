import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  LogIn, Mail, Lock, AlertCircle, Eye, EyeOff,
  Store, BarChart3, ShoppingCart, Package, Sun, Moon
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      navigate('/');
    } catch (err) {
      setError('Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex font-sans text-ink-primary transition-colors duration-300">

      {/* Botón de tema flotante */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-surface-card border border-border-subtle text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors shadow-sm"
        title="Cambiar tema"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Lado Izquierdo: Branding e Ilustración (Visible en Tablet/Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface-default border-r border-border-subtle relative overflow-hidden items-center justify-center p-12">
        {/* Fondo con patrón de puntos sutil */}
        <div
          className="absolute top-0 left-0 w-full h-full opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--ink-primary) 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />

        <div className="max-w-md w-full relative z-10 space-y-8">
          {/* Logo Branding */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-brand-500">
              <Store size={22} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-ink-primary">MiTiendita</span>
          </div>

          {/* Ilustración de dashboard */}
          <div className="relative h-64 w-full flex items-center justify-center">
            {/* Fondo tilted */}
            <div className="absolute inset-0 bg-surface-elevated rounded-2xl border border-border-subtle shadow-sm transform -rotate-3 translate-y-4" />
            {/* Card principal */}
            <div className="absolute inset-0 bg-surface-card rounded-2xl border border-border-strong shadow-md p-6 space-y-4">
              <div className="h-4 w-1/3 bg-surface-hover rounded" />
              <div className="flex gap-2">
                <div className="h-20 flex-1 bg-brand-500/10 rounded-lg border border-brand-500/20 flex items-center justify-center">
                  <BarChart3 className="text-brand-400 opacity-60" size={32} />
                </div>
                <div className="h-20 flex-1 bg-accent-400/10 rounded-lg border border-accent-400/20 flex items-center justify-center">
                  <Package className="text-accent-400 opacity-60" size={32} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-surface-hover rounded" />
                <div className="h-2 w-5/6 bg-surface-elevated rounded" />
              </div>
            </div>
            {/* Elemento flotante */}
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-surface-card rounded-2xl shadow-xl border border-border-strong flex items-center justify-center animate-bounce" style={{ animationDuration: '3000ms' }}>
              <ShoppingCart className="text-brand-400" size={28} />
            </div>
          </div>

          <div className="pt-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold mb-4 text-ink-primary">
              Digitaliza tu tienda de abarrotes
            </h2>
            <p className="text-ink-secondary text-lg leading-relaxed">
              Controla ventas, inventario y productos en un solo lugar.
            </p>
          </div>
        </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          {/* Logo mobile solamente */}
          <div className="flex items-center gap-2 mb-8 lg:hidden justify-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-brand-500">
              <Store size={18} />
            </div>
            <span className="text-xl font-bold tracking-tight text-ink-primary">AbarroteSaaS</span>
          </div>

          <div className="bg-surface-card p-8 md:p-10 rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-border-subtle">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-ink-primary">Bienvenido de nuevo</h1>
              <p className="text-ink-secondary mt-2">Inicia sesión para administrar tu tienda</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-danger-400/10 border border-danger-400/30 rounded-xl flex items-center gap-3 text-danger-400 text-sm animate-slide-down">
                <AlertCircle size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-ink-secondary ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand-400 transition-colors" size={18} />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-surface-elevated border border-border-strong rounded-xl outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-ink-primary placeholder:text-ink-muted"
                    placeholder="nombre@tienda.com"
                  />
                </div>
              </div>

              {/* Campo Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-ink-secondary">Contraseña</label>
                  <Link to="#" className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted group-focus-within:text-brand-400 transition-colors" size={18} />
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-surface-elevated border border-border-strong rounded-xl outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-ink-primary placeholder:text-ink-muted"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Checkbox Recordarme */}
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border-strong accent-brand-500 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-ink-secondary cursor-pointer select-none">
                  Recordarme en este equipo
                </label>
              </div>

              {/* Botón Principal */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-70 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-brand-glow active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Iniciar sesión
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <p className="text-ink-secondary">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="font-bold text-brand-400 hover:text-brand-300 transition-colors">
                  Crear cuenta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}