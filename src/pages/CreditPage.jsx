import { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, TrendingDown, UserPlus, DollarSign } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function CreditPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const [clientData, setClientData] = useState({ name: '', phone: '', credit_limit: '1000' });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('[CreditPage] Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('clients').insert([{ 
        name: clientData.name, 
        phone: clientData.phone, 
        credit_limit: parseFloat(clientData.credit_limit),
        balance: 0 
      }]);
      setIsClientModalOpen(false);
      fetchClients();
    } catch {
      alert("Error al crear cliente");
    }
  };

  const handleRegisterPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || amount > selectedClient.balance) return;
    
    try {
      // Descontar del balance
      const newBalance = selectedClient.balance - amount;
      await supabase.from('clients').update({ balance: newBalance }).eq('id', selectedClient.id);
      setIsPaymentModalOpen(false);
      fetchClients();
    } catch {
      alert("Error al registrar abono");
    }
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalDebt = clients.reduce((acc, c) => acc + c.balance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HEADER & KPIS ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Gestión de Fiado</h1>
          <p className="text-sm text-ink-secondary mt-1">Créditos de clientes y recepción de abonos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:flex-none flex flex-col items-center bg-warning-500/10 border border-warning-500/20 px-6 py-2 rounded-xl">
            <span className="text-xs text-warning-400 font-medium whitespace-nowrap">Deuda Total</span>
            <span className="text-lg font-black text-warning-400">${totalDebt.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => { setClientData({ name: '', phone: '', credit_limit: '1000' }); setIsClientModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 sm:py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl shadow-brand-glow transition-all whitespace-nowrap"
          >
            <UserPlus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2.5 bg-surface-card border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
             <div className="col-span-full py-10 flex justify-center"><div className="animate-spin-fast w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" /></div>
          ) : filtered.map(client => {
          const usagePercent = (client.balance / client.credit_limit) * 100;
          const isOverLimit = client.balance >= client.credit_limit;
          
          return (
            <div key={client.id} className="bg-surface-card rounded-2xl border border-border-subtle p-5 hover:border-border-strong hover:shadow-sm transition-all flex flex-col justify-between h-48 group">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-ink-primary truncate">{client.name}</h3>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${client.balance > 0 ? 'bg-warning-500/10 text-warning-400' : 'bg-success-400/10 text-success-400'}`}>
                    ${client.balance.toFixed(2)}
                  </div>
                </div>
                <p className="text-xs text-ink-muted">{client.phone || 'Sin télefono'}</p>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-secondary">Uso de crédito</span>
                    <span className="text-ink-primary font-medium">${client.credit_limit} max</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isOverLimit ? 'bg-danger-400' : usagePercent > 70 ? 'bg-warning-400' : 'bg-brand-500'}`} 
                      style={{ width: `${Math.min(usagePercent, 100)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border-subtle">
                <button
                  onClick={() => { setSelectedClient(client); setPaymentAmount(''); setIsPaymentModalOpen(true); }}
                  disabled={client.balance <= 0}
                  className="w-full py-2 bg-surface-elevated hover:bg-brand-500/10 disabled:hover:bg-surface-elevated border border-border-strong hover:border-brand-500/30 text-ink-primary disabled:text-ink-muted disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <TrendingDown size={16} className={client.balance > 0 ? "text-success-400" : ""} /> Registrar Abono
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-ink-muted">No se encontraron clientes</div>
        )}
      </div>

      {/* ── MODAL NUEVO CLIENTE ── */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsClientModalOpen(false)} />
          <div className="relative bg-surface-card w-full max-w-sm rounded-2xl border border-border-subtle shadow-xl p-6 animate-slide-up">
            <h3 className="text-xl font-bold text-ink-primary mb-6">Nuevo Cliente</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Nombre Completo *</label>
                <input required type="text" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} className="w-full px-4 py-2 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 outline-none" placeholder="Ej: Don Pepe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Teléfono</label>
                  <input type="tel" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} className="w-full px-4 py-2 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 outline-none" placeholder="Opcional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-secondary mb-1">Límite Fiado ($) *</label>
                  <input required type="number" step="100" value={clientData.credit_limit} onChange={e => setClientData({...clientData, credit_limit: e.target.value})} className="w-full px-4 py-2 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-5 py-2.5 text-ink-secondary font-medium transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL ABONO ── */}
      {isPaymentModalOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsPaymentModalOpen(false)} />
          <div className="relative bg-surface-card w-full max-w-sm rounded-2xl border border-border-subtle shadow-xl p-6 animate-slide-up text-center">
            <h3 className="text-xl font-bold text-ink-primary mb-1">Abono a Cuenta</h3>
            <p className="text-sm text-ink-muted mb-6">De {selectedClient.name}</p>

            <div className="bg-warning-500/10 border border-warning-500/20 rounded-xl p-3 mb-6">
              <p className="text-xs text-warning-400 font-medium tracking-wide uppercase">Deuda Actual</p>
              <p className="text-2xl font-black text-warning-400">${selectedClient.balance.toFixed(2)}</p>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Monto del abono</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                  <input
                    required
                    type="number"
                    step="0.01"
                    max={selectedClient.balance}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary text-xl font-bold focus:border-brand-500 outline-none transition-colors"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="flex-1 py-3 bg-surface-elevated border border-border-strong text-ink-primary font-medium rounded-xl hover:bg-surface-hover transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-3 bg-success-400 hover:bg-success-500 text-white font-bold rounded-xl shadow-[0_0_15px_-3px_var(--tw-shadow-color)] shadow-success-400/50 transition-colors">
                  Liquidarlo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
