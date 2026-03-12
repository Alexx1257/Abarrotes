import { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, ScanBarcode, User, CreditCard, DollarSign } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useApp } from '../context/AppContext';
import { getCachedProducts, setCachedProducts, addToOfflineQueue, getOfflineQueue } from '../utils/offlineSync';

export default function POSPage() {
  const { isOnline, setLowStockCount } = useApp();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isFiadoClientOpen, setIsFiadoClientOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);

  // Estado para clientes de fiado
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchClients();

    const handleSyncComplete = () => fetchProducts();
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
    };
  }, [isOnline]);

  async function fetchClients() {
    try {
      const { data } = await supabase.from('clients').select('id, name, balance, credit_limit').order('name');
      setClients(data || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      // Evitar sobreescribir con datos viejos de Supabase si la cola sigue viva
      if (!isOnline || getOfflineQueue().length > 0) {
        const cached = getCachedProducts();
        setProducts(cached);
        setLowStockCount(cached.filter(p => p.stock < 10).length);
        return;
      }
      
      const { data } = await supabase.from('products').select('*').is('deleted_at', null).order('name');
      setProducts(data || []);
      setCachedProducts(data || []);
      // Update global context for low stock alert
      setLowStockCount((data || []).filter(p => p.stock < 10).length);
    } catch (err) {
      console.error(err);
      // Fallback si falla online
      const cached = getCachedProducts();
      setProducts(cached);
      setLowStockCount(cached.filter(p => p.stock < 10).length);
    } finally {
      setLoading(false);
    }
  }

  // Filtrado optimizado con useMemo
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      (p.barcode && p.barcode.includes(lower))
    );
  }, [products, searchTerm]);

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
            : item
        );
      }
      return [...prev, { ...product, product_id: product.id, qty: 1, subtotal: product.price }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === id) {
        const newQty = item.qty + delta;
        if (newQty < 1 || newQty > item.stock) return item;
        return { ...item, qty: newQty, subtotal: newQty * item.price };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.product_id !== id));
  
  const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);

  const processSale = async (paymentMethod, clientId = null) => {
    try {
      const saleDataToInsert = {
        total: cartTotal,
        payment_method: paymentMethod,
        ...(clientId ? { client_id: clientId } : {}),
      };
      const saleItemsToInsert = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.qty,
        price: item.price,
        cost: Number(item.cost) || 0,
        subtotal: item.subtotal
      }));

      // Modo offline: encolar venta optimísticamente
      if (!isOnline || getOfflineQueue().length > 0) {
        addToOfflineQueue('SALE', 'sales', {
          saleData: saleDataToInsert,
          saleItems: saleItemsToInsert,
          cart: cart
        });
        const currentCached = getCachedProducts();
        const updatedCache = currentCached.map(p => {
          const cartItem = cart.find(c => c.product_id === p.id);
          return cartItem ? { ...p, stock: p.stock - cartItem.qty } : p;
        });
        setCachedProducts(updatedCache);
        setProducts(updatedCache);
        setLastSaleTotal(cartTotal);
        setCart([]);
        setIsCheckoutOpen(false);
        setIsFiadoClientOpen(false);
        setIsSuccessOpen(true);
        return;
      }

      // 1. Crear Venta (Online)
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([saleDataToInsert])
        .select()
        .single();
      if (saleError) throw saleError;

      // 2. Insertar Items de la venta
      const saleItems = saleItemsToInsert.map(item => ({ ...item, sale_id: saleData.id }));
      await supabase.from('sale_items').insert(saleItems);

      // 3. Descontar stock de cada producto
      for (const item of cart) {
        await supabase.from('products').update({ stock: item.stock - item.qty }).eq('id', item.product_id);
      }

      // 4. Si es fiado, incrementar el balance del cliente (RF-08.02)
      if (paymentMethod === 'fiado' && clientId) {
        const cliente = clients.find(c => c.id === clientId);
        if (cliente) {
          const nuevoBalance = (cliente.balance || 0) + cartTotal;
          await supabase.from('clients').update({ balance: nuevoBalance }).eq('id', clientId);
        }
      }

      setLastSaleTotal(cartTotal);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsFiadoClientOpen(false);
      setSelectedClientId('');
      setIsSuccessOpen(true);
      fetchProducts();
      fetchClients();
    } catch (err) {
      console.error('Error procesando venta:', err);
      alert('Error al registrar la venta');
    }
  };

  // Clientes filtrados por búsqueda en el modal de fiado
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()));
  }, [clients, clientSearchTerm]);

  const handleFiadoConfirm = () => {
    if (!selectedClientId) {
      alert('Debes seleccionar un cliente para fiado');
      return;
    }
    const cliente = clients.find(c => c.id === selectedClientId);
    // RF-08.06: Validar límite de crédito
    if (cliente && (cliente.balance + cartTotal) > cliente.credit_limit) {
      alert(`⚠️ ${cliente.name} superaría su límite de crédito ($${cliente.credit_limit}). Deuda actual: $${cliente.balance.toFixed(2)}`);
      return;
    }
    processSale('fiado', selectedClientId);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
      {/* ── SECCIÓN CATÁLOGO DE PRODUCTOS ── */}
      <div className="flex-1 flex flex-col min-h-0 bg-surface-base lg:bg-transparent">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o escanear código (HID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-card border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-elevated hover:bg-surface-hover border border-border-strong rounded-xl text-ink-primary font-medium transition-colors whitespace-nowrap hidden sm:flex">
            <ScanBarcode size={18} /> Cámara
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-6">
          {loading ? (
             <div className="flexjustify-center py-10"><div className="mx-auto animate-spin-fast w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock}
                    className="relative text-left bg-surface-card rounded-2xl p-4 border border-border-subtle hover:border-brand-500/50 hover:shadow-brand-glow transition-all duration-250 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-2xl mb-3 opacity-80 group-hover:scale-110 transition-transform duration-250">
                      📦
                    </div>
                    <h3 className="text-sm font-semibold text-ink-primary truncate-2 h-10 mb-2">{product.name}</h3>
                    <div className="flex items-end justify-between">
                      <p className="text-lg font-bold text-accent-400">${product.price}</p>
                      <p className={`text-xxs font-semibold px-1.5 py-0.5 rounded ${isOutOfStock ? 'bg-danger-500/10 text-danger-400' : 'bg-surface-elevated text-ink-muted'}`}>
                        {product.stock} disp
                      </p>
                    </div>
                  </button>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-ink-muted">
                  No se encontraron productos
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECCIÓN CARRITO ── */}
      <div className="w-full lg:w-[380px] shrink-0 bg-surface-card rounded-2xl border border-border-subtle shadow-sm flex flex-col h-[500px] lg:h-full">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-semibold text-ink-primary flex items-center gap-2">
            <ShoppingCart size={18} className="text-brand-400" /> Carrito actual
          </h2>
          <span className="bg-brand-500/10 text-brand-400 text-xs font-bold px-2 py-1 rounded-full">
            {cart.length} ítems
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-ink-muted opacity-60">
              <ShoppingCart size={48} className="mb-4" />
              <p className="text-sm">Agrega productos para cobrar</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="flex gap-3 animate-fade-in group">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-ink-primary truncate">{item.name}</h4>
                  <p className="text-xs text-ink-muted">${item.price} c/u</p>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-sm font-bold text-ink-primary">${item.subtotal}</p>
                  
                  <div className="flex items-center gap-1 bg-surface-elevated rounded-lg p-0.5 border border-border-subtle opacity-100 lg:opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateQty(item.product_id, -1)} className="p-1 hover:bg-surface-hover hover:text-danger-400 rounded text-ink-secondary transition-colors">
                      <Minus size={14} />
                    </button>
                    <span className="text-xs font-bold w-6 text-center text-ink-primary">{item.qty}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="p-1 hover:bg-surface-hover hover:text-success-400 rounded text-ink-secondary transition-colors">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => removeFromCart(item.product_id)} className="p-1 hover:bg-danger-500 hover:text-white text-danger-400 rounded transition-colors ml-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border-subtle bg-surface-elevated/50 rounded-b-2xl">
          <div className="flex justify-between items-end mb-4">
            <p className="text-sm font-medium text-ink-secondary">Total a Cobrar</p>
            <p className="text-3xl font-bold text-accent-400">${cartTotal.toFixed(2)}</p>
          </div>
          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-3.5 bg-brand-500 hover:bg-brand-400 active:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-brand-glow transition-all duration-200"
          >
            Cobrar Todo
          </button>
        </div>
      </div>

      {/* ── MODAL DE CHECKOUT ── */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative bg-surface-card w-full max-w-sm rounded-2xl border border-border-subtle shadow-xl p-6 animate-slide-up">
            <h3 className="text-xl font-bold text-ink-primary mb-2">Selecciona pago</h3>
            <p className="text-sm text-ink-muted mb-6">El monto total es <span className="text-accent-400 font-bold">${cartTotal.toFixed(2)}</span></p>

            <div className="space-y-3">
              <button
                onClick={() => processSale('efectivo')}
                className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface-hover border border-border-strong hover:border-brand-500 rounded-xl transition-all group"
              >
                <span className="font-semibold text-ink-primary group-hover:text-brand-400 transition-colors">Efectivo (Contado)</span>
                <DollarSign size={20} className="text-brand-400" />
              </button>
              <button
                onClick={() => { setIsCheckoutOpen(false); setClientSearchTerm(''); setSelectedClientId(''); setIsFiadoClientOpen(true); }}
                className="w-full flex items-center justify-between p-4 bg-surface-elevated hover:bg-surface-hover border border-border-strong hover:border-warning-500 rounded-xl transition-all group"
              >
                <span className="font-semibold text-ink-primary group-hover:text-warning-400 transition-colors">Fiado (Crédito)</span>
                <CreditCard size={20} className="text-warning-400" />
              </button>
            </div>
            <button onClick={() => setIsCheckoutOpen(false)} className="w-full mt-4 py-3 text-ink-secondary hover:text-ink-primary font-medium">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL SELECTOR DE CLIENTE (FIADO) ── */}
      {isFiadoClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsFiadoClientOpen(false)} />
          <div className="relative bg-surface-card w-full max-w-sm rounded-2xl border border-border-subtle shadow-xl p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-warning-500/10 flex items-center justify-center">
                <User size={20} className="text-warning-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-primary">Selecciona cliente</h3>
                <p className="text-xs text-ink-muted">Total a fiar: <span className="font-bold text-warning-400">${cartTotal.toFixed(2)}</span></p>
              </div>
            </div>

            <div className="relative my-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clientSearchTerm}
                onChange={e => setClientSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-elevated border border-border-strong rounded-xl text-sm text-ink-primary focus:border-warning-500 outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-52 overflow-y-auto space-y-2 mb-4">
              {filteredClients.length === 0 && (
                <p className="text-sm text-ink-muted text-center py-4">No se encontraron clientes</p>
              )}
              {filteredClients.map(client => {
                const wouldExceed = (client.balance + cartTotal) > client.credit_limit;
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    disabled={wouldExceed}
                    className={[
                      'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                      selectedClientId === client.id
                        ? 'border-warning-500 bg-warning-500/10'
                        : wouldExceed
                          ? 'border-danger-400/30 bg-danger-400/5 opacity-50 cursor-not-allowed'
                          : 'border-border-strong bg-surface-elevated hover:border-warning-500/50',
                    ].join(' ')}
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink-primary">{client.name}</p>
                      <p className="text-xs text-ink-muted">
                        Deuda: <span className={client.balance > 0 ? 'text-warning-400 font-medium' : 'text-ink-muted'}>${client.balance.toFixed(2)}</span>
                        {' / '}
                        Límite: ${client.credit_limit}
                      </p>
                    </div>
                    {wouldExceed && <span className="text-xxs text-danger-400 font-bold">Límite excedido</span>}
                    {selectedClientId === client.id && <CheckCircle2 size={18} className="text-warning-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2 border-t border-border-subtle">
              <button
                type="button"
                onClick={() => setIsFiadoClientOpen(false)}
                className="flex-1 py-2.5 bg-surface-elevated border border-border-strong text-ink-secondary font-medium rounded-xl hover:bg-surface-hover transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleFiadoConfirm}
                disabled={!selectedClientId}
                className="flex-1 py-2.5 bg-warning-500 hover:bg-warning-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
              >
                Confirmar Fiado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ÉXITO ── */}
      {isSuccessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface-card w-full max-w-xs rounded-2xl border border-success-400/30 text-center p-8 shadow-[0_0_40px_-10px_var(--tw-shadow-color)] shadow-success-400/20">
            <div className="mx-auto w-16 h-16 bg-success-400/20 text-success-400 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-ink-primary mb-1">Cobro exitoso</h3>
            <p className="text-2xl font-black text-success-400 mb-6">${lastSaleTotal.toFixed(2)}</p>
            <button
              onClick={() => setIsSuccessOpen(false)}
              className="w-full py-2.5 bg-surface-elevated hover:bg-surface-hover border border-border-strong text-ink-primary font-semibold rounded-xl transition-colors"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
