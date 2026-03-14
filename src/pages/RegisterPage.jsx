import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Store, User, Mail, Phone, ShieldCheck, Headset, Lock } from 'lucide-react';

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth(); // Asumiendo que loginWithGoogle existe en tu AuthContext
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Configuración de Google One Tap
  useEffect(() => {
    /* global google */
    if (window.google && !isLoading) {
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false, // Permite que el usuario elija si tiene varias cuentas
        itp_support: true
      });

      // Muestra el banner de One Tap
      google.accounts.id.prompt();
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/');
    } catch (err) {
      setErrorMsg('Error al autenticar con Google. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle(); // Inicia flujo OAuth estándar
      navigate('/');
    } catch (err) {
      setErrorMsg('No se pudo conectar con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!agreedTerms) {
      setErrorMsg('Debes aceptar los Términos de Servicio y la Política de Privacidad.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await register(formData.email, formData.password, {
        store_name: formData.storeName,
        owner_name: formData.ownerName,
        phone: formData.phone
      });
      navigate('/');
    } catch (err) {
      // Traducción de errores comunes de Supabase
      const msg = err.message === 'User already registered'
        ? 'Este correo ya está registrado.'
        : 'Error al crear la cuenta. Revisa tus datos.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 font-sans bg-surface-base overflow-hidden">

      {/* Fondo asimétrico decorativo */}
      <div className="absolute right-0 top-0 w-1/3 h-full bg-brand-500/5 origin-top-right skew-x-[-10deg] hidden lg:block pointer-events-none" />

      {/* Cabecera Superior */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white shadow-brand-glow">
            <ShoppingBag size={18} />
          </div>
          <span className="font-bold text-ink-primary text-xl tracking-tight hidden sm:block">AbarroteSaaS</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-ink-secondary hidden sm:inline">¿Ya tienes cuenta?</span>
          <Link to="/login" className="px-5 py-2 bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 rounded-lg transition-all font-bold">
            Iniciar Sesión
          </Link>
        </div>
      </div>

      {/* Contenedor Principal */}
      <div className="w-full max-w-2xl mt-12 sm:mt-16 z-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink-primary mb-3 tracking-tight">Crea tu Tienda</h1>
          <p className="text-base text-ink-secondary font-medium max-w-lg mx-auto leading-relaxed">
            Digitaliza tu negocio de abarrotes hoy mismo con nuestra plataforma todo-en-uno.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-danger-500/10 border border-danger-500/20 text-danger-500 p-4 rounded-xl text-sm font-semibold animate-fade-in flex items-center gap-2 max-w-xl mx-auto">
            <span className="text-lg">⚠️</span> {errorMsg}
          </div>
        )}

        <div className="bg-surface-card p-6 sm:p-10 rounded-3xl shadow-xl border border-border-subtle max-w-xl mx-auto">

          {/* Botón Google OAuth */}
          <button
            onClick={handleGoogleClick}
            type="button"
            className="w-full mb-8 py-3.5 px-4 border border-border-strong rounded-xl flex items-center justify-center gap-3 font-bold text-ink-primary hover:bg-surface-elevated transition-all active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continuar con Google
          </button>

          <div className="relative mb-8 text-center">
            <hr className="border-border-subtle" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-card px-4 text-xs font-bold text-ink-muted uppercase tracking-widest">
              o regístrate con email
            </span>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">

            {/* Nombre de la Tienda */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                <Store size={16} className="text-brand-400" /> Nombre de la Tienda
              </label>
              <input
                type="text"
                name="storeName"
                required
                autoComplete="organization"
                value={formData.storeName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 transition-all placeholder:text-ink-muted/40"
                placeholder="Ej. Tienda La Bendición"
              />
            </div>

            {/* Nombre del Dueño */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                <User size={16} className="text-brand-400" /> Nombre del Propietario
              </label>
              <input
                type="text"
                name="ownerName"
                required
                autoComplete="name"
                value={formData.ownerName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 transition-all placeholder:text-ink-muted/40"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Correo Electrónico */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                  <Mail size={16} className="text-brand-400" /> Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 transition-all placeholder:text-ink-muted/40"
                  placeholder="tu@correo.com"
                />
              </div>
              {/* Teléfono */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                  <Phone size={16} className="text-brand-400" /> WhatsApp / Celular
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 transition-all placeholder:text-ink-muted/40"
                  placeholder="10 dígitos"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                <Lock size={16} className="text-brand-400" /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 transition-all placeholder:text-ink-muted/40"
                  placeholder="Mínimo 8 caracteres"
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

            {/* Términos y Condiciones */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="w-5 h-5 rounded border-border-strong bg-surface-elevated text-brand-500 focus:ring-brand-500 cursor-pointer mt-0.5"
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-ink-secondary cursor-pointer select-none leading-relaxed">
                Acepto los <span className="font-bold text-brand-500">Términos de Servicio</span> y la <span className="font-bold text-brand-500">Política de Privacidad</span> de AbarroteSaaS.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-brand-500 hover:bg-brand-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-brand-glow transition-all flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <span className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Comenzar Ahora'
              )}
            </button>
          </form>
        </div>

        {/* Footer Ayuda */}
        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-muted bg-surface-card px-4 py-2 rounded-full border border-border-subtle shadow-sm">
            <ShieldCheck size={14} className="text-success" /> Registro Seguro con Encriptación SSL
          </div>

          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-10 h-10 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-500 group-hover:bg-brand-500/20 transition-colors">
              <Headset size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">¿Necesitas ayuda?</p>
              <p className="text-sm font-bold text-ink-primary group-hover:text-brand-500 transition-colors">Contactar a soporte técnico</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}