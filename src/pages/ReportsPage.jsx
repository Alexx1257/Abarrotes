import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { TrendingUp, FileText, AlertTriangle, DollarSign, Package, Users, ShoppingCart, LayoutDashboard } from 'lucide-react';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  
  // Dashboard states
  const [stats, setStats] = useState({
    ventasHoy: 0,
    ventasSemana: 0,
    productosBajos: 0,
    clientesMora: 0
  });
  const [recentSales, setRecentSales] = useState([]);

  // Reports states
  const [salesData, setSalesData] = useState([]);
  const [productStats, setProductStats] = useState([]);

  useEffect(() => {
    async function fetchAllData() {
      try {
        setLoading(true);

        // Rango de "hoy" para el filtro de ventas del día (RF-09.01)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // Ventas del día actual únicamente
        const { data: salesHoy } = await supabase
          .from('sales')
          .select('total')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString());

        // Todas las ventas para gráficas históricas y ventas recientes
        const { data: allSales, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });

        const { count: lowStock } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .lt('stock', 10)
          .is('deleted_at', null);
        const { count: debtClients } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gt('balance', 0);

        if (salesError) throw salesError;

        // KPI: suma real de ventas de hoy
        const ventasHoy = (salesHoy || []).reduce((acc, s) => acc + Number(s.total), 0);
        // KPI: total histórico
        const ventasSemana = (allSales || []).reduce((acc, s) => acc + Number(s.total), 0);

        setStats({
          ventasHoy,
          ventasSemana,
          productosBajos: lowStock || 0,
          clientesMora: debtClients || 0,
        });

        setRecentSales((allSales || []).slice(0, 5));

        // Agrupar todas las ventas por día para las gráficas
        const groupedSales = {};
        (allSales || []).forEach(s => {
          const date = new Date(s.created_at).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
          if (!groupedSales[date]) groupedSales[date] = 0;
          groupedSales[date] += Number(s.total);
        });

        const chartSales = Object.keys(groupedSales).map(k => ({ name: k, ventas: groupedSales[k] }));
        setSalesData(chartSales.length > 0 ? chartSales : [{ name: 'Hoy', ventas: 0 }]);

        // Distribución de inventario por categoría (sin productos eliminados)
        const { data: products } = await supabase
          .from('products')
          .select('category, stock')
          .is('deleted_at', null);
        const catCount = {};
        (products || []).forEach(p => {
          if (!catCount[p.category]) catCount[p.category] = 0;
          catCount[p.category] += p.stock;
        });
        const chartCats = Object.keys(catCount).map(k => ({ name: k, value: catCount[k] }));
        setProductStats(chartCats);

      } catch (err) {
        console.error('Error fetching combined data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAllData();
  }, []);

  const COLORS = ['hsl(222, 80%, 58%)', 'hsl(190, 80%, 50%)', 'hsl(145, 63%, 52%)', 'hsl(32, 95%, 60%)', 'hsl(0, 72%, 61%)'];

  if (loading) return <div className="p-10 text-center"><div className="mx-auto flex h-40 items-center justify-center animate-spin-fast w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary flex items-center gap-2">
            <LayoutDashboard className="text-brand-400" /> Dashboard y Reportes
          </h1>
          <p className="text-sm text-ink-secondary mt-1">Resumen general y análisis de tu negocio</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas Hoy" value={`$${stats.ventasHoy.toFixed(2)}`} icon={DollarSign} trend="+12%" type="success" />
        <StatCard title="Ventas Históricas" value={`$${stats.ventasSemana.toFixed(2)}`} icon={TrendingUp} trend="+5%" type="success" />
        <StatCard title="Stock Bajo" value={stats.productosBajos.toString()} icon={Package} trend="Alerta" type="warning" />
        <StatCard title="Fianzas Activas" value={stats.clientesMora.toString()} icon={Users} trend="Revisar" type="danger" />
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm">
          <h3 className="text-base font-bold text-ink-primary mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-success-400" /> Tendencia de Ventas
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVentasComb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(222, 80%, 48%)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(222, 80%, 48%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }} itemStyle={{ color: 'var(--ink-primary)', fontWeight: 'bold' }} cursor={{ fill: 'var(--surface-hover)' }} />
                <Area type="monotone" dataKey="ventas" stroke="hsl(222, 80%, 48%)" strokeWidth={3} fillOpacity={1} fill="url(#colorVentasComb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas Recientes */}
        <div className="bg-surface-card rounded-2xl p-6 border border-border-subtle shadow-sm flex flex-col">
          <h2 className="text-base font-semibold text-ink-primary mb-4">Ventas Recientes</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-primary capitalize">{sale.payment_method}</p>
                    <p className="text-xxs text-ink-muted">
                      {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-ink-primary text-right">
                  +${sale.total}
                </span>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-sm text-ink-muted text-center pt-4">No hay ventas recientes</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Gráfica de Barras */}
        <div className="bg-surface-card rounded-2xl border border-border-subtle p-6 shadow-sm">
          <h3 className="text-base font-bold text-ink-primary mb-4 flex items-center gap-2">
            <FileText size={18} className="text-brand-400" /> Comparativa de Ventas
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--ink-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--ink-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }} itemStyle={{ color: 'var(--ink-primary)', fontWeight: 'bold' }} cursor={{ fill: 'var(--surface-hover)' }} />
                <Bar dataKey="ventas" fill="hsl(190, 80%, 50%)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Distribución de Inventario */}
        <div className="bg-surface-card rounded-2xl border border-border-subtle p-6 shadow-sm">
          <h3 className="text-base font-bold text-ink-primary mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-warning-400" /> Inventario x Categoría
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productStats}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {productStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', color: 'var(--ink-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, type }) {
  const isPositive = trend.startsWith('+');
  const typeStyles = {
    success: 'text-success-400 bg-success-400/10',
    warning: 'text-warning-400 bg-warning-400/10',
    danger:  'text-danger-400 bg-danger-400/10',
  };

  return (
    <div className="bg-surface-card rounded-2xl p-5 border border-border-subtle shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-medium text-ink-secondary">{title}</p>
        <div className="p-2 rounded-lg bg-surface-hover text-ink-muted">
          <Icon size={18} />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-ink-primary mb-1">{value}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeStyles[type] || typeStyles.success}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}
