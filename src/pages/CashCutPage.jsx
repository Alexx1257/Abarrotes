import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Calculator, Wallet, DollarSign, Target, ShoppingCart, TrendingUp, ChevronLeft, ChevronRight, ReceiptText, BadgeDollarSign } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toLocalDateString(date) {
  return date.toISOString().slice(0, 10);
}

// ── Componente KPI Card ───────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, subtitle, color = 'brand', highlight = false }) {
  const colorMap = {
    brand: { icon: 'text-brand-400', value: 'text-ink-primary', border: 'border-brand-500/20', bg: highlight ? 'bg-surface-card shadow-[0_0_20px_-5px_var(--tw-shadow-color)] shadow-brand-500/10' : 'bg-surface-elevated' },
    success: { icon: 'text-success-400', value: 'text-success-400', border: 'border-success-500/20', bg: 'bg-surface-elevated' },
    warning: { icon: 'text-warning-400', value: 'text-warning-400', border: 'border-border-subtle', bg: 'bg-surface-elevated' },
    accent: { icon: 'text-accent-400', value: 'text-accent-400', border: 'border-accent-500/20', bg: 'bg-surface-elevated' },
  };
  const c = colorMap[color];
  return (
    <div className={`${c.bg} rounded-2xl p-5 border ${c.border} text-center flex flex-col items-center gap-1`}>
      <Icon size={22} className={`${c.icon} mb-1`} />
      <p className="text-xs font-semibold text-ink-secondary">{label}</p>
      <p className={`text-2xl font-black ${c.value} leading-none`}>{value}</p>
      {subtitle && <p className="text-xxs text-ink-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CashCutPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

  const fetchCorte = useCallback(async (dateStr) => {
    setLoading(true);
    const [y, m, d] = dateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end   = new Date(y, m - 1, d, 23, 59, 59, 999);

    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(quantity, price, cost, subtotal, products(cost))')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (!error) setSales(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCorte(selectedDate);
  }, [selectedDate, fetchCorte]);

  // ── Navegación de fechas ────────────────────────────────────────────────────
  const changeDay = (delta) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    setSelectedDate(toLocalDateString(next));
  };

  const isToday = selectedDate === toLocalDateString(new Date());

  // ── Cálculos agregados ──────────────────────────────────────────────────────
  const totalVentas   = sales.reduce((acc, s) => acc + Number(s.total), 0);
  const totalEfectivo = sales.filter(s => s.payment_method === 'efectivo').reduce((acc, s) => acc + Number(s.total), 0);
  const totalFiado    = sales.filter(s => s.payment_method === 'fiado').reduce((acc, s) => acc + Number(s.total), 0);

  // Ganancia real: usa el costo guardado en sale_items; si es 0, usa el costo actual del producto como fallback
  const getCostoItem = (item) => {
    const costoGuardado = Number(item.cost);
    if (costoGuardado > 0) return costoGuardado;
    // Fallback: costo actual del producto (para ventas históricas donde cost fue 0)
    return Number(item.products?.cost) || 0;
  };

  const totalGanancia = sales.reduce((acc, sale) => {
    const gananciaSale = (sale.sale_items || []).reduce((a, item) => {
      return a + (Number(item.price) - getCostoItem(item)) * Number(item.quantity);
    }, 0);
    return acc + gananciaSale;
  }, 0);

  // Ganancia por venta individual (para la tabla)
  const getSaleGanancia = (sale) =>
    (sale.sale_items || []).reduce((a, item) => a + (Number(item.price) - getCostoItem(item)) * Number(item.quantity), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">

      {/* ── ENCABEZADO ── */}
      <div className="text-center mb-2">
        <div className="mx-auto w-12 h-12 bg-surface-card border border-border-strong rounded-full flex items-center justify-center mb-3">
          <Calculator size={24} className="text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Corte de Caja</h1>
      </div>

      {/* ── SELECTOR DE FECHA ── */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => changeDay(-1)}
          className="p-2 rounded-xl bg-surface-card border border-border-strong text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2 bg-surface-card border border-border-strong rounded-xl px-4 py-2">
          <ReceiptText size={16} className="text-brand-400" />
          <input
            type="date"
            value={selectedDate}
            max={toLocalDateString(new Date())}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-ink-primary font-semibold text-sm outline-none cursor-pointer"
          />
        </div>

        <button
          onClick={() => changeDay(1)}
          disabled={isToday}
          className="p-2 rounded-xl bg-surface-card border border-border-strong text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="text-center text-xs text-ink-muted capitalize -mt-2">
        {formatFecha(selectedDate)}
        {isToday && <span className="ml-2 bg-brand-500/15 text-brand-400 text-xxs font-bold px-2 py-0.5 rounded-full">HOY</span>}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin-fast w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              icon={Target}
              label="Total Ventas"
              value={`$${totalVentas.toFixed(2)}`}
              subtitle={`${sales.length} transacción${sales.length !== 1 ? 'es' : ''}`}
              color="brand"
              highlight
            />
            <KpiCard
              icon={Wallet}
              label="Efectivo en Caja"
              value={`$${totalEfectivo.toFixed(2)}`}
              subtitle={`${sales.filter(s => s.payment_method === 'efectivo').length} ventas`}
              color="success"
            />
            <KpiCard
              icon={DollarSign}
              label="Fiado del Día"
              value={`$${totalFiado.toFixed(2)}`}
              subtitle={`${sales.filter(s => s.payment_method === 'fiado').length} ventas`}
              color="warning"
            />
            <KpiCard
              icon={TrendingUp}
              label="Ganancia del Día"
              value={`$${totalGanancia.toFixed(2)}`}
              subtitle="Precio venta − Costo"
              color="accent"
            />
          </div>

          {/* ── LISTADO DE VENTAS ── */}
          <div className="bg-surface-card rounded-2xl border border-border-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
              <ShoppingCart size={18} className="text-brand-400" />
              <h3 className="text-base font-bold text-ink-primary">Detalle de Ventas</h3>
            </div>

            {sales.length === 0 ? (
              <div className="py-14 text-center">
                <BadgeDollarSign size={32} className="mx-auto text-ink-muted opacity-30 mb-3" />
                <p className="text-sm text-ink-muted">No hay ventas registradas para esta fecha</p>
              </div>
            ) : (
              <>
                {/* Encabezados de columna */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-5 py-2 bg-surface-elevated border-b border-border-subtle text-xxs uppercase tracking-wider text-ink-muted font-semibold">
                  <span className="w-6">#</span>
                  <span>Hora / Método</span>
                  <span className="text-right">Total</span>
                  <span className="text-right w-24">Ganancia</span>
                  <span className="text-right w-16">Items</span>
                </div>

                <div className="divide-y divide-border-subtle">
                  {sales.map((sale, i) => {
                    const ganancia = getSaleGanancia(sale);
                    const totalItems = (sale.sale_items || []).reduce((a, it) => a + it.quantity, 0);
                    return (
                      <div key={sale.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors">
                        {/* Número */}
                        <span className="text-xs text-ink-muted w-6 text-right shrink-0">{i + 1}</span>

                        {/* Hora + método */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink-primary capitalize">{sale.payment_method}</p>
                          <p className="text-xxs text-ink-muted">
                            {new Date(sale.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Total venta */}
                        <span className="font-bold text-ink-primary text-sm shrink-0">
                          ${Number(sale.total).toFixed(2)}
                        </span>

                        {/* Ganancia */}
                        <span className={`text-sm font-bold w-24 text-right shrink-0 ${ganancia > 0 ? 'text-success-400' : 'text-ink-muted'}`}>
                          +${ganancia.toFixed(2)}
                        </span>

                        {/* Items count */}
                        <span className="text-xxs bg-surface-elevated text-ink-muted px-2 py-0.5 rounded-full border border-border-subtle w-16 text-center shrink-0">
                          {totalItems} ítem{totalItems !== 1 ? 's' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* ── Totales finales ── */}
                <div className="border-t-2 border-border-strong bg-surface-elevated px-5 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-sm text-ink-muted">
                      <span className="font-semibold text-ink-primary">{sales.length}</span> ventas registradas
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xxs text-ink-muted uppercase tracking-wide">Total Cobrado</p>
                        <p className="text-lg font-black text-ink-primary">${totalVentas.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xxs text-success-400 uppercase tracking-wide font-bold">Ganancia Bruta</p>
                        <p className="text-lg font-black text-success-400">${totalGanancia.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
