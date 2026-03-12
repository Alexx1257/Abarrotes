import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4 sm:p-8 font-sans">
      {/* Header Top (opcional, como en el mockup) */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10 hidden sm:flex">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white">
             <ShoppingBag size={18} />
           </div>
           <span className="font-bold text-ink-primary text-xl tracking-tight">Abarrote SaaS</span>
        </div>
        <button className="text-sm font-medium text-ink-secondary hover:text-brand-400 transition-colors">
          Support
        </button>
      </div>

      <div className="w-full max-w-5xl bg-surface-card rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-border-subtle animate-fade-in relative z-20">
        
        {/* Lado Izquierdo: Ilustración / Imagen */}
        <div className="md:w-1/2 relative hidden md:block bg-brand-700">
          {/* Asumiendo que tendrás una imagen en public/illustration.png o public/store-bg.jpg */}
          {/* Si no la tienes aún, este div de color verde/oscuro servirá de fallback */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-700/90 to-transparent z-10" />
          <img 
            src="/store-bg.jpg" // Nombre sugerido para la tercera imagen
            alt="Store Concept" 
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-80"
            onError={(e) => {
               // Fallback si la imagen no existe aún
               e.target.style.display = 'none';
            }}
          />
          
          <div className="relative z-20 h-full flex flex-col justify-end p-12 text-white">
            <h2 className="text-4xl font-extrabold mb-4 leading-tight">
              Streamline your grocery<br/>business.
            </h2>
            <p className="text-lg text-white/80 font-medium">
              Manage inventory, track sales, and delight your<br/>customers with the all-in-one retail OS.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Formulario de Login */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-surface-card">
          <div className="max-w-md w-full mx-auto">
            {/* Logo móvil (solo visible si la ilustración se oculta) */}
            <div className="flex md:hidden items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white">
                <ShoppingBag size={18} />
              </div>
              <span className="font-bold text-ink-primary text-xl">Abarrote SaaS</span>
            </div>

            <h1 className="text-4xl font-extrabold text-ink-primary mb-2 tracking-tight">Welcome Back</h1>
            <p className="text-sm text-ink-secondary mb-8">Enter your credentials to manage your store</p>

            {errorMsg && (
              <div className="mb-6 bg-danger-500/10 border border-danger-500/20 text-danger-400 p-3 rounded-xl text-sm font-medium animate-fade-in flex items-center gap-2">
                <span className="shrink-0">⚠️</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-ink-primary mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50"
                    placeholder="manager@store.com"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-ink-primary">Password</label>
                  <button type="button" className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50 tracking-widest"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="keepLogged" 
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded border-border-strong bg-surface-elevated text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="keepLogged" className="text-sm text-ink-secondary cursor-pointer select-none">
                  Keep me logged in for 30 days
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-4 bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-brand-glow transition-all flex items-center justify-center gap-2 text-base"
              >
                {isLoading ? (
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin-fast" />
                ) : (
                  <>Log In <span>→</span></>
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <span className="text-ink-secondary">Don't have an account yet? </span>
              <Link to="/register" className="font-bold text-brand-400 hover:text-brand-300 transition-colors">
                Start free trial
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-4 text-xs font-medium text-ink-muted/60">
              <a href="#" className="hover:text-ink-secondary transition-colors">Privacy Policy</a>
              <span>•</span>
              <a href="#" className="hover:text-ink-secondary transition-colors">Terms of Service</a>
              <span>•</span>
              <span>© 2026 AbarroteSaaS</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
