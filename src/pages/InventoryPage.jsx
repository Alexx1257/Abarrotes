import { useState, useEffect } from 'react';
import { Package, AlertTriangle, ArrowUpDown, History, Search, Plus, Edit2, Trash2, Barcode, Scale, QrCode, Info, DollarSign, Tag, Layers, Camera } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../services/supabase';
import { useApp } from '../context/AppContext';
import { getCachedProducts, setCachedProducts, addToOfflineQueue, getOfflineQueue } from '../utils/offlineSync';

export default function InventoryPage() {
  const { isOnline, setLowStockCount } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Ajuste de Stock
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('entrada');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  // Modal CRUD de Productos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasBarcode, setHasBarcode] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [formData, setFormData] = useState({
    id: null, name: '', price: '', cost: '', stock: '', category: 'Abarrotes', barcode: '', min_stock: 5, unit: 'PZA'
  });

  useEffect(() => {
    fetchInventory();

    const handleSyncComplete = () => fetchInventory();
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
    };
  }, [isOnline]); // Agregamos dependencias relevantes si se precisa, fetchInventory y isOnline son estados que aplican.

  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render((decodedText) => {
        setFormData(prev => ({ ...prev, barcode: decodedText }));
        setIsScanning(false);
        scanner.clear();
      }, (error) => {
        // Ignorar errores de escaneo rutinarios
      });

      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [isScanning]);

  async function fetchInventory() {
    try {
      setLoading(true);
      // Evitar sobreescribir con datos viejos de Supabase si la cola sigue viva
      if (!isOnline || getOfflineQueue().length > 0) {
        const cached = getCachedProducts();
        setProducts(cached);
        setLowStockCount(cached.filter(p => p.stock < 10).length);
        return;
      }
      
      const { data, error } = await supabase.from('products').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      
      setProducts(data || []);
      setCachedProducts(data || []); // Guardar copia local fresh
      setLowStockCount((data || []).filter(p => p.stock < 10).length);
    } catch (err) {
      console.error('Error fetching inventory', err);
      // Fallback a caché si falla la red a pesar de decir que estamos online
      const cached = getCachedProducts();
      setProducts(cached);
      setLowStockCount(cached.filter(p => p.stock < 10).length);
    } finally {
      setLoading(false);
    }
  }

  // ---- Funciones CRUD Productos ----
  const openNewModal = () => {
    setFormData({ id: null, name: '', price: '', cost: '', stock: '0', category: 'Abarrotes', barcode: '', min_stock: 5, unit: 'PZA' });
    setHasBarcode(true);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setFormData({ ...product, min_stock: product.min_stock ?? 5, unit: product.unit || 'PZA' });
    setHasBarcode(!!product.barcode);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const payload = { 
      ...formData, 
      price: Number(formData.price), 
      cost: Number(formData.cost), 
      stock: Number(formData.stock)
    };
    if (!hasBarcode) {
      payload.barcode = null;
    }
    
    try {
      if (!isOnline) {
        const offlineId = isEditing ? payload.id : crypto.randomUUID();
        const optimisticProduct = { ...payload, id: offlineId };
        
        let newProducts = [...products];
        if (isEditing) {
          newProducts = newProducts.map(p => p.id === offlineId ? optimisticProduct : p);
          addToOfflineQueue('UPDATE', 'products', optimisticProduct);
        } else {
          newProducts.push(optimisticProduct);
          addToOfflineQueue('INSERT', 'products', optimisticProduct);
        }
        
        setProducts(newProducts);
        setCachedProducts(newProducts);
        setIsModalOpen(false);
        return;
      }

      const onlinePayload = { ...payload };
      delete onlinePayload.min_stock;
      delete onlinePayload.unit;

      if (isEditing) {
        await supabase.from('products').update(onlinePayload).eq('id', onlinePayload.id);
      } else {
        delete onlinePayload.id;
        await supabase.from('products').insert([onlinePayload]);
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert("Error al guardar producto");
    }
  };

  const handleDeleteProduct = async (id) => {
    if(!window.confirm("¿Seguro que deseas eliminar este producto?")) return;
    try {
      if (!isOnline) {
        const newProducts = products.filter(p => p.id !== id);
        setProducts(newProducts);
        setCachedProducts(newProducts);
        addToOfflineQueue('DELETE', 'products', { id });
        return;
      }

      await supabase.from('products').delete().eq('id', id);
      fetchInventory();
    } catch {
      alert("Error al eliminar");
    }
  };

  // ---- Funciones Ajuste Inventario ----
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(adjustQty);
    if (!qty || qty <= 0) return;
    
    let newStock = selectedProduct.stock;
    if (adjustType === 'entrada') newStock += qty;
    if (adjustType === 'salida' || adjustType === 'ajuste') newStock -= qty;
    
    if (newStock < 0) newStock = 0;

    try {
      if (!isOnline) {
        const optimisticProduct = { ...selectedProduct, stock: newStock };
        const newProducts = products.map(p => p.id === selectedProduct.id ? optimisticProduct : p);
        setProducts(newProducts);
        setCachedProducts(newProducts);
        
        addToOfflineQueue('STOCK_ADJUST', 'products', { 
          product_id: selectedProduct.id, 
          qty, 
          adjustType, 
          reason: adjustReason 
        });
        
        setIsAdjustOpen(false);
        return;
      }

      await supabase.from('products').update({ stock: newStock }).eq('id', selectedProduct.id);
      await supabase.from('inventory_logs').insert([{
        product_id: selectedProduct.id,
        type: adjustType,
        quantity: qty,
        reason: adjustReason || 'N/A'
      }]);

      setIsAdjustOpen(false);
      fetchInventory();
    } catch (err) {
      console.error(err);
      alert('Error en el ajuste');
    }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm)));

  const totalItems = products.reduce((acc, p) => acc + p.stock, 0);
  const lowStockItems = products.filter(p => p.stock < 10).length;
  const gananciaTotal = products.reduce((acc, p) => acc + (Number(p.price) - Number(p.cost)) * p.stock, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── HEADER & KPIS ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Catálogo e Inventario</h1>
          <p className="text-sm text-ink-secondary mt-1">Gestiona productos, precios y niveles de stock</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden sm:flex divide-x divide-border-subtle bg-surface-card rounded-xl border border-border-subtle overflow-hidden">
            <div className="px-4 py-2 flex flex-col items-center">
              <span className="text-xs text-ink-muted">Total Ítems</span>
              <span className="font-bold text-ink-primary">{totalItems}</span>
            </div>
            <div className="px-4 py-2 flex flex-col items-center bg-danger-500/10">
              <span className="text-xs text-danger-400">Stock Bajo</span>
              <span className="font-bold text-danger-400">{lowStockItems}</span>
            </div>
            <div className="px-4 py-2 flex flex-col items-center bg-success-500/10">
              <span className="text-xs text-success-400">Ganancia Potencial</span>
              <span className="font-bold text-success-400">${gananciaTotal.toFixed(0)}</span>
            </div>
          </div>
          <button onClick={openNewModal} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl transition-colors shadow-brand-glow">
            <Plus size={18} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
        <input
          type="text"
          placeholder="Buscar producto por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2 bg-surface-card border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:outline-none transition-colors h-11"
        />
      </div>

      {/* ── TABLA DE PRODUCTOS E INVENTARIO ── */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        {/* VISTA DESKTOP (TABLA) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-surface-elevated border-b border-border-subtle text-xs uppercase tracking-wider text-ink-muted">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Precios/Margen</th>
                <th className="px-4 py-3 font-medium">Nivel de Stock</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-muted">
                    <div className="inline-block animate-spin-fast w-6 h-6 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
                  </td>
                </tr>
              ) : filtered.map(product => {
                const isLow = product.stock < 10;
                const percentage = Math.min((product.stock / 50) * 100, 100); 
                const margin = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0;
                
                return (
                  <tr key={product.id} className="hover:bg-surface-hover/50 transition-colors group">
                    {/* Producto */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-surface-elevated flex items-center justify-center text-xs">📦</div>
                        <div>
                          <p className="text-sm font-semibold text-ink-primary">{product.name}</p>
                          <p className="text-xxs text-ink-muted font-mono">{product.barcode || '---'}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Categoría */}
                    <td className="px-4 py-3 text-sm text-ink-secondary">
                      <span className="bg-surface-elevated px-2 py-0.5 rounded border border-border-subtle">{product.category}</span>
                    </td>
                    
                    {/* Precios e Información */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-sm font-bold text-accent-400 flex justify-between w-[140px]">
                          <span className="text-ink-muted font-medium text-xs">Venta:</span> ${Number(product.price).toFixed(2)}
                        </div>
                        <div className="text-xs text-ink-secondary flex justify-between w-[140px]">
                          <span className="text-ink-muted">Costo:</span> ${Number(product.cost).toFixed(2)}
                        </div>
                        <div className="text-xs flex justify-between w-[140px]">
                          <span className="text-ink-muted">Margen:</span>
                          <span className={margin > 30 ? 'text-success-400 font-semibold' : margin > 15 ? 'text-warning-400 font-semibold' : 'text-danger-400 font-semibold'}>
                            {margin.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-xs flex justify-between w-[140px]">
                          <span className="text-ink-muted">Ganancia:</span>
                          <span className="text-success-400 font-bold">${(Number(product.price) - Number(product.cost)).toFixed(2)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-8 ${isLow ? 'text-danger-400' : 'text-ink-primary'}`}>
                          {product.stock}
                        </span>
                        <div className="flex-1 max-w-[120px] h-2 bg-surface-elevated rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isLow ? 'bg-danger-400' : 'bg-success-400'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        {isLow && <AlertTriangle size={14} className="text-warning-400" title="Stock bajo" />}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsAdjustOpen(true);
                            setAdjustQty('');
                            setAdjustReason('');
                          }}
                          className="p-1.5 sm:px-2 sm:py-1.5 bg-surface-elevated hover:bg-brand-500/10 hover:text-brand-400 border border-border-strong hover:border-brand-500/30 text-ink-secondary rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                          title="Ajustar Stock"
                        >
                          <ArrowUpDown size={14} /> <span className="hidden sm:inline">Ajustar</span>
                        </button>
                        <button onClick={() => openEditModal(product)} className="p-1.5 text-ink-secondary hover:text-brand-400 transition-colors" title="Editar Producto">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-danger-400 hover:bg-danger-500/10 rounded transition-colors" title="Eliminar Producto">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
             <div className="py-12 text-center text-ink-muted text-sm">No se encontraron productos.</div>
          )}
        </div>

        {/* VISTA MÓVIL (CARDS) */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {loading ? (
             <div className="py-12 flex justify-center text-ink-muted">
               <div className="animate-spin-fast w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
             </div>
          ) : filtered.map(product => {
            const isLow = product.stock < 10;
            const percentage = Math.min((product.stock / 50) * 100, 100); 
            const margin = product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : 0;
            
            return (
              <div key={product.id} className="bg-surface-elevated border border-border-strong rounded-xl p-4 flex flex-col gap-4 shadow-sm group hover:border-brand-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-surface-card flex items-center justify-center text-lg border border-border-subtle shadow-sm group-hover:shadow-brand-glow transition-all">📦</div>
                    <div>
                      <p className="text-base font-bold text-ink-primary leading-tight">{product.name}</p>
                      <p className="text-xs text-ink-muted font-mono mt-0.5">{product.barcode || '---'}</p>
                    </div>
                  </div>
                  <span className="bg-surface-card px-2.5 py-1 rounded border border-border-subtle text-xs text-ink-secondary font-medium tracking-wide">{product.category}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3 bg-surface-card p-3 rounded-lg border border-border-subtle">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">Precio</span>
                    <span className="font-black text-accent-400 text-base leading-none">${Number(product.price).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">Costo</span>
                    <span className="font-semibold text-ink-secondary leading-none text-sm mt-0.5">
                      ${Number(product.cost).toFixed(2)} <span className="text-ink-muted font-medium text-xs">({margin.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted mb-1">Ganancia</span>
                    <span className="font-black text-success-400 text-base leading-none">${(Number(product.price) - Number(product.cost)).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-surface-card border border-border-subtle rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-ink-secondary font-medium text-xs">Nivel de Stock</span>
                    <span className={`font-black flex items-center gap-1.5 ${isLow ? 'text-danger-400' : 'text-success-500'}`}>
                      {product.stock} {isLow && <AlertTriangle size={14} className="animate-pulse" />}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-danger-400' : 'bg-success-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsAdjustOpen(true);
                      setAdjustQty('');
                      setAdjustReason('');
                    }}
                    className="flex-1 py-2.5 bg-surface-card hover:bg-brand-500/10 border border-border-strong text-ink-primary hover:text-brand-400 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold shadow-sm"
                  >
                    <ArrowUpDown size={16} /> Ajustar
                  </button>
                  <button onClick={() => openEditModal(product)} className="w-[42px] h-[42px] flex-shrink-0 bg-surface-card border border-border-strong text-ink-secondary hover:text-ink-primary hover:border-ink-primary rounded-xl transition-colors flex justify-center items-center shadow-sm">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDeleteProduct(product.id)} className="w-[42px] h-[42px] flex-shrink-0 bg-surface-card border border-border-strong text-danger-400 hover:bg-danger-500/10 hover:border-danger-400/50 rounded-xl transition-colors flex justify-center items-center shadow-sm">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !loading && (
             <div className="py-10 flex flex-col items-center justify-center text-ink-muted text-sm border-2 border-border-subtle rounded-xl border-dashed">
                <Package size={24} className="mb-2 opacity-50" />
                No se encontraron productos
             </div>
          )}
        </div>
      </div>

      {/* ── MODAL CRUD PRODUCTO ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-surface-card w-full max-w-2xl rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
            
            {/* Cabecera / Selectores */}
            <div className="bg-surface-elevated p-4 sm:p-6 border-b border-border-subtle shrink-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-xl font-bold text-ink-primary">
                  {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-ink-muted hover:text-ink-primary transition-colors p-1">
                  &times;
                </button>
              </div>

              {/* Selector de Tipo (Toggle) */}
              <div className="flex bg-surface-card rounded-xl p-1 border border-border-subtle shadow-sm">
                <button 
                  type="button"
                  onClick={() => setHasBarcode(true)}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${hasBarcode ? 'bg-brand-500 text-white shadow-md' : 'text-ink-secondary hover:bg-surface-hover'}`}
                >
                  <Barcode size={18} /> Con Código de Barras
                </button>
                <button 
                  type="button"
                  onClick={() => setHasBarcode(false)}
                  className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all ${!hasBarcode ? 'bg-brand-500 text-white shadow-md' : 'text-ink-secondary hover:bg-surface-hover'}`}
                >
                  <Scale size={18} /> Sin Código / A Granel
                </button>
              </div>
            </div>

            {/* Formulario scrollable */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              
              <div className="flex items-center gap-2 text-brand-500 font-bold border-b border-border-subtle pb-2 mb-4">
                <Info size={18} /> <span>Información General</span>
              </div>

              {/* Fila: Código de barras (Condicional) */}
              {hasBarcode && (
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Código de Barras</label>
                  <div className="relative flex items-center">
                    <QrCode className="absolute left-3.5 text-ink-muted" size={18} />
                    <input 
                      type="text" 
                      value={formData.barcode || ''} 
                      onChange={e => setFormData({...formData, barcode: e.target.value})} 
                      className="w-full pl-10 pr-24 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm" 
                      placeholder="Escanea o escribe el código" 
                      autoFocus
                    />
                    <button 
                      type="button"
                      onClick={() => setIsScanning(true)}
                      className="absolute right-2 px-3 py-1.5 bg-brand-50 text-brand-600 font-bold text-xs rounded-lg hover:bg-brand-100 transition-colors flex items-center gap-1"
                    >
                      <Camera size={14} /> ESCANEAR
                    </button>
                  </div>
                </div>
              )}

              {/* Fila: Nombre y Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Nombre del Producto *</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all shadow-sm" 
                    placeholder="Ej. Jabón de Tocador 150g" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Categoría</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full px-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="Abarrotes">Abarrotes</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Botanas">Botanas</option>
                    <option value="Lácteos">Lácteos</option>
                    <option value="Panadería">Panadería</option>
                    <option value="Granel">Granel</option>
                    <option value="Limpieza">Limpieza</option>
                  </select>
                </div>
              </div>

              {/* Fila: Precios y Unidad */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Costo Unitario ($)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted font-bold">$</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={formData.cost} 
                      onChange={e => setFormData({...formData, cost: e.target.value})} 
                      className="w-full pl-8 pr-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm transition-all" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Precio Venta ($) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-success-500 font-bold">$</span>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      value={formData.price} 
                      onChange={e => setFormData({...formData, price: e.target.value})} 
                      className="w-full pl-8 pr-4 py-3 bg-surface-elevated border border-success-400/50 focus:border-success-500 focus:ring-1 focus:ring-success-500 rounded-xl text-ink-primary font-bold outline-none shadow-sm transition-all bg-success-50/5" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Unidad de Venta</label>
                  <div className="flex bg-surface-elevated border border-border-strong rounded-xl overflow-hidden shadow-sm">
                    {['PZA', 'KG', 'GR', 'LT', 'PQ'].map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormData({...formData, unit: u})}
                        className={`flex-1 py-3 text-xs font-bold transition-all ${formData.unit === u ? 'bg-surface-card text-brand-500 shadow-sm ring-1 ring-border-strong relative z-10' : 'text-ink-secondary hover:bg-surface-hover'}`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fila: Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1">Stock Inicial *</label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
                    <input 
                      required 
                      type="number" 
                      disabled={isEditing} 
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary font-bold focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none shadow-sm transition-all disabled:opacity-50 disabled:bg-surface-hover" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-primary mb-1 pl-1 flex items-center gap-1">
                    Stock Mínimo (Alerta) <AlertTriangle size={14} className="text-warning-500" />
                  </label>
                  <div className="relative">
                    <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warning-400" size={18} />
                    <input 
                      required 
                      type="number" 
                      value={formData.min_stock} 
                      onChange={e => setFormData({...formData, min_stock: e.target.value})} 
                      className="w-full pl-10 pr-4 py-3 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary font-bold focus:border-warning-500 focus:ring-1 focus:ring-warning-500 outline-none shadow-sm transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* Controles Pie de Modal */}
              <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-border-subtle sticky bottom-0 bg-surface-card">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 text-ink-secondary hover:text-ink-primary font-bold hover:bg-surface-hover rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl shadow-brand-glow transition-all active:scale-95"
                >
                  Guardar Producto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE AJUSTE DE STOCK ── */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsAdjustOpen(false)} />
          <div className="relative bg-surface-card w-full max-w-sm rounded-2xl border border-border-subtle shadow-xl p-6 animate-slide-up">
            <h3 className="text-lg font-bold text-ink-primary mb-1">Ajuste de Stock</h3>
            <p className="text-sm text-ink-muted mb-6">
              Producto: <span className="font-semibold text-ink-primary">{selectedProduct?.name}</span> (Actual: {selectedProduct?.stock})
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['entrada', 'salida', 'ajuste'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAdjustType(type)}
                    className={`p-2 border rounded-xl text-xs font-bold uppercase transition-colors ${
                      adjustType === type 
                        ? (type === 'entrada' ? 'bg-success-400/10 border-success-400/50 text-success-400' 
                           : type === 'salida' ? 'bg-warning-400/10 border-warning-400/50 text-warning-400' 
                           : 'bg-danger-400/10 border-danger-400/50 text-danger-400')
                        : 'bg-surface-elevated border-border-strong text-ink-secondary hover:bg-surface-hover'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Cantidad a {adjustType}</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  placeholder="Ej: 5"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1">Motivo (Opcional)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border-strong rounded-xl text-ink-primary focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  placeholder="Ej: Llegó de proveedor, Producto dañado..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsAdjustOpen(false)} className="flex-1 py-2 text-ink-secondary hover:text-ink-primary font-medium text-sm transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 bg-brand-500 hover:bg-brand-400 text-white font-bold rounded-xl transition-colors text-sm shadow-brand-glow">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
