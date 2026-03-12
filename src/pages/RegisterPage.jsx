import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Eye, EyeOff, Store, User, Mail, Phone, ShieldCheck, Headset, Lock } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
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
      // Pasamos los nombres como metadatos adicionales en el registro si fuera necesario
      await register(formData.email, formData.password, {
        store_name: formData.storeName,
        owner_name: formData.ownerName,
        phone: formData.phone
      });
      // Navegamos al index una vez registrado
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta. Intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-8 font-sans bg-surface-base overflow-hidden">
      
      {/* Fondo asimétrico (basado en el mockup) */}
      <div className="absolute right-0 top-0 w-1/3 h-full bg-brand-500/5 origin-top-right skew-x-[-10deg] hidden lg:block pointer-events-none" />

      {/* Header Top */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white">
             <ShoppingBag size={18} />
           </div>
           <span className="font-bold text-ink-primary text-xl tracking-tight hidden sm:block">Abarrote SaaS</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-ink-secondary hidden sm:inline">Already have an account?</span>
          <Link to="/login" className="px-5 py-2 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 rounded-lg transition-colors font-bold">
            Login
          </Link>
        </div>
      </div>

      {/* Formulario de Registro Centrado */}
      <div className="w-full max-w-2xl mt-12 sm:mt-16 z-20">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-ink-primary mb-4 tracking-tight">Create Store Account</h1>
          <p className="text-base text-brand-400 font-medium max-w-lg mx-auto leading-relaxed">
            Start managing your grocery business today with our all-in-one platform.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-danger-500/10 border border-danger-500/20 text-danger-400 p-3 rounded-xl text-sm font-medium animate-fade-in flex items-center gap-2 max-w-xl mx-auto">
            <span className="shrink-0">⚠️</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="bg-surface-card p-6 sm:p-10 rounded-3xl shadow-xl border border-border-subtle max-w-xl mx-auto">
          
          <div className="space-y-6">
            {/* Store Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                <Store size={16} className="text-brand-400" /> Store Name
              </label>
              <input
                type="text"
                name="storeName"
                required
                value={formData.storeName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50"
                placeholder="e.g. Green Valley Organics"
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                <User size={16} className="text-brand-400" /> Owner Name
              </label>
              <input
                type="text"
                name="ownerName"
                required
                value={formData.ownerName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50"
                placeholder="e.g. John Doe"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                  <Mail size={16} className="text-brand-400" /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                  <Phone size={16} className="text-brand-400" /> Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-ink-primary mb-2">
                <Lock size={16} className="text-brand-400" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:outline-none focus:border-brand-500 focus:bg-surface-hover transition-all placeholder:text-ink-muted/50 tracking-widest"
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

            {/* Terms and conditions */}
            <div className="flex items-start gap-3 mt-2">
              <input 
                type="checkbox" 
                id="terms" 
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="w-5 h-5 rounded border-border-strong bg-surface-elevated text-brand-500 focus:ring-brand-500 cursor-pointer mt-0.5"
              />
              <label htmlFor="terms" className="text-sm text-ink-secondary cursor-pointer select-none leading-relaxed">
                I agree to the <span className="font-bold text-brand-400">Terms of Service</span> and <span className="font-bold text-brand-400">Privacy Policy</span>. I understand that my data will be handled according to AbarroteSaaS's security standards.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-2 bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-brand-glow transition-all flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin-fast" />
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="mt-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-sm font-bold text-ink-secondary bg-surface-card px-4 py-2 rounded-full border border-border-subtle shadow-sm">
             <ShieldCheck size={16} className="text-brand-400" /> SSL Encrypted & Secure Registration
          </div>

          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 bg-brand-500/10 rounded-full flex items-center justify-center text-brand-400 group-hover:bg-brand-500/20 transition-colors">
               <Headset size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-0.5">Need Help?</p>
              <p className="text-sm font-bold text-ink-primary group-hover:text-brand-400 transition-colors">Contact our setup team</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
