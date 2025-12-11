import { useState } from 'react';
import { Download, TrendingUp, Users, CreditCard, Calendar, ShoppingCart, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRevenueByCategory, useCustomerAnalytics, usePaymentMethods, useSalesTrends, useTopProducts, useCartAbandonment } from '@/lib/hooks/useAdminDashboard';
import adminApi from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/contexts/ToastContext';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const PAYMENT_COLORS: Record<string, string> = { paystack: '#10b981', cash: '#71717a', card: '#3b82f6' };

// ==================== MOBILE METRIC CARD ====================
function MobileMetricCard({ icon: Icon, iconColor, label, value, sublabel }: { icon: any; iconColor: string; label: string; value: string; sublabel?: string }) {
    return (
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={iconColor} strokeWidth={1.5} />
                <span className="text-[9px] text-zinc-500 uppercase font-bold">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl text-white font-mono font-semibold">{value}</span>
                {sublabel && <span className="text-[9px] text-zinc-600 font-mono">{sublabel}</span>}
            </div>
        </div>
    );
}

// ==================== MOBILE CHART CARD ====================
function MobileChartCard({ title, children, loading, empty }: { title: string; children: React.ReactNode; loading?: boolean; empty?: boolean }) {
    return (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
            <h3 className="text-xs font-bold text-white uppercase mb-4">{title}</h3>
            {loading ? (
                <div className="h-48 flex items-center justify-center"><span className="text-zinc-600 text-xs">Loading...</span></div>
            ) : empty ? (
                <div className="h-48 flex items-center justify-center"><span className="text-zinc-600 text-xs">No data</span></div>
            ) : children}
        </div>
    );
}

// ==================== MAIN COMPONENT ====================
export default function Analytics() {
    const { showToast } = useToast();
    const isMobile = useIsMobile();
    const [dateRange, setDateRange] = useState<30 | 90>(30);
    const [isExporting, setIsExporting] = useState(false);

    const { data: revenueByCat, isLoading: catLoading } = useRevenueByCategory();
    const { data: customerData, isLoading: customerLoading } = useCustomerAnalytics();
    const { data: paymentMethodsData, isLoading: paymentLoading } = usePaymentMethods();
    const { data: salesTrends, isLoading: trendsLoading } = useSalesTrends(dateRange);
    const { data: topProducts, isLoading: productsLoading } = useTopProducts(5);
    const { data: cartData } = useCartAbandonment();

    const handleExport = async (type: 'orders' | 'products' | 'customers') => {
        try {
            setIsExporting(true);
            const blob = await adminApi.exportReport(type, dateRange);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast(`${type} exported successfully`, 'success');
        } catch { showToast('Export failed', 'error'); }
        finally { setIsExporting(false); }
    };

    const categoryData = Array.isArray(revenueByCat) ? revenueByCat : [];
    const paymentData = paymentMethodsData ? Object.entries(paymentMethodsData).map(([method, data]: [string, any]) => ({
        name: method.charAt(0).toUpperCase() + method.slice(1), value: data.revenue, count: data.count, percent: data.percent
    })) : [];
    const salesData = salesTrends?.daily?.map(day => ({
        date: new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        revenue: day.revenue, orders: day.orders
    })) || [];

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg text-white font-semibold">Analytics</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">INSIGHTS & REPORTS</p>
                    </div>
                    <div className="flex gap-2">
                        {[30, 90].map(d => (
                            <button key={d} onClick={() => setDateRange(d as 30 | 90)} className={`px-3 py-2 text-xs font-medium rounded-lg ${dateRange === d ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                {d}D
                            </button>
                        ))}
                    </div>
                </div>

                {/* Key Metrics - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <MobileMetricCard icon={Users} iconColor="text-blue-500" label="Customers" value={customerLoading ? '---' : (customerData?.total_customers || 0).toLocaleString()} />
                    <MobileMetricCard icon={TrendingUp} iconColor="text-emerald-500" label="New (30D)" value={customerLoading ? '--' : String(customerData?.new_customers || 0)} />
                    <MobileMetricCard icon={Calendar} iconColor="text-purple-500" label="Retention" value={customerLoading ? '--' : `${(customerData?.customer_retention_rate || 0).toFixed(0)}%`} />
                    <MobileMetricCard icon={CreditCard} iconColor="text-yellow-500" label="Avg LTV" value={customerLoading ? '---' : formatCurrency(customerData?.average_ltv || 0)} />
                </div>

                {/* Cart Abandonment */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
                        <ShoppingCart size={16} className="text-zinc-400 mx-auto mb-1" />
                        <p className="text-lg text-white font-mono">{(cartData?.total_carts || 0)}</p>
                        <p className="text-[8px] text-zinc-500 uppercase">Carts</p>
                    </div>
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
                        <AlertTriangle size={16} className="text-amber-500 mx-auto mb-1" />
                        <p className="text-lg text-white font-mono">{(cartData?.abandonment_rate || 0).toFixed(0)}%</p>
                        <p className="text-[8px] text-zinc-500 uppercase">Abandoned</p>
                    </div>
                    <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
                        <CheckCircle size={16} className="text-emerald-500 mx-auto mb-1" />
                        <p className="text-lg text-white font-mono">{(cartData?.recovered_carts || 0)}</p>
                        <p className="text-[8px] text-zinc-500 uppercase">Recovered</p>
                    </div>
                </div>

                {/* Sales Trend Chart */}
                <MobileChartCard title={`Revenue (${dateRange}D)`} loading={trendsLoading} empty={salesData.length === 0}>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid stroke="#27272a" strokeDasharray="0" vertical={false} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 8 }} interval="preserveStartEnd" />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 8 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 10 }} formatter={(v: number) => formatCurrency(v)} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </MobileChartCard>

                {/* Category Revenue Chart */}
                <MobileChartCard title="Revenue by Category" loading={catLoading} empty={categoryData.length === 0}>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid stroke="#27272a" strokeDasharray="0" vertical={false} />
                                <XAxis dataKey="category_name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 8 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 8 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 10 }} formatter={(v: number) => formatCurrency(v)} />
                                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </MobileChartCard>

                {/* Payment Methods */}
                <MobileChartCard title="Payment Methods" loading={paymentLoading} empty={paymentData.length === 0}>
                    <div className="flex items-center">
                        <div className="w-28 h-28 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius="60%" outerRadius="85%" paddingAngle={2} dataKey="value" stroke="none">
                                        {paymentData.map((entry, i) => <Cell key={i} fill={PAYMENT_COLORS[entry.name.toLowerCase()] || '#71717a'} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] text-white font-mono">{formatCurrency(paymentData.reduce((s, m) => s + m.value, 0))}</span>
                            </div>
                        </div>
                        <div className="flex-1 ml-4 space-y-2">
                            {paymentData.map(m => (
                                <div key={m.name} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PAYMENT_COLORS[m.name.toLowerCase()] || '#71717a' }} />
                                        <span className="text-zinc-400">{m.name}</span>
                                    </div>
                                    <span className="text-white font-mono">{m.percent}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </MobileChartCard>

                {/* Top Products */}
                <MobileChartCard title="Top Products" loading={productsLoading} empty={!topProducts?.length}>
                    <div className="space-y-3">
                        {topProducts?.map((p, i) => (
                            <div key={p.product_id} className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-500 font-mono">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-white truncate">{p.product_name}</p>
                                    <p className="text-[9px] text-zinc-500">{p.units_sold} sold</p>
                                </div>
                                <span className="text-xs text-emerald-400 font-mono">{formatCurrency(p.revenue)}</span>
                            </div>
                        ))}
                    </div>
                </MobileChartCard>

                {/* Export Buttons */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <h3 className="text-xs font-bold text-white uppercase mb-4">Export Data</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { type: 'orders' as const, color: 'text-emerald-500', label: 'Orders' },
                            { type: 'products' as const, color: 'text-blue-500', label: 'Products' },
                            { type: 'customers' as const, color: 'text-purple-500', label: 'Customers' }
                        ].map(e => (
                            <button key={e.type} onClick={() => handleExport(e.type)} disabled={isExporting} className="p-3 bg-zinc-800 rounded-xl text-center disabled:opacity-50">
                                <Download size={18} className={`${e.color} mx-auto mb-1`} />
                                <p className="text-[9px] text-white font-medium uppercase">{e.label}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Analytics & Reports</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">DATA ANALYTICS DASHBOARD</p>
                </div>
                <div className="flex gap-2">
                    {[30, 90].map(d => (
                        <button key={d} onClick={() => setDateRange(d as 30 | 90)} className={`px-3 py-1.5 text-[9px] font-mono uppercase transition-all ${dateRange === d ? 'bg-white text-black' : 'bg-[#0A0A0A] text-zinc-500 hover:text-white border border-[#27272a]'}`}>
                            {d} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { icon: Users, color: 'text-blue-500', label: 'Total Customers', value: customerLoading ? '---' : (customerData?.total_customers || 0).toLocaleString() },
                    { icon: TrendingUp, color: 'text-emerald-500', label: 'New (30D)', value: customerLoading ? '--' : String(customerData?.new_customers || 0).padStart(2, '0') },
                    { icon: Calendar, color: 'text-purple-500', label: 'Retention', value: customerLoading ? '--' : `${(customerData?.customer_retention_rate || 0).toFixed(0)}%` },
                    { icon: CreditCard, color: 'text-yellow-500', label: 'Avg LTV', value: customerLoading ? '---' : formatCurrency(customerData?.average_ltv || 0) }
                ].map((m, i) => (
                    <div key={i} className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <m.icon size={16} className={m.color} strokeWidth={1.5} />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{m.label}</span>
                        </div>
                        <span className="text-2xl text-white font-mono font-medium">{m.value}</span>
                    </div>
                ))}
            </div>

            {/* Cart Abandonment Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { icon: ShoppingCart, color: 'text-zinc-400', label: 'Total Carts', value: (cartData?.total_carts || 0).toLocaleString(), sub: 'ACTIVE SESSIONS' },
                    { icon: AlertTriangle, color: 'text-amber-500', label: 'Abandoned', value: `${(cartData?.abandonment_rate || 0).toFixed(1)}%`, sub: 'RATE' },
                    { icon: CheckCircle, color: 'text-emerald-500', label: 'Recovered', value: (cartData?.recovered_carts || 0).toLocaleString(), sub: 'SAVED ORDERS' }
                ].map((m, i) => (
                    <div key={i} className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                            <m.icon size={16} className={m.color} strokeWidth={1.5} />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{m.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl text-white font-mono font-medium">{m.value}</span>
                            <span className="text-[10px] text-zinc-600 font-mono">{m.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-6 bg-[#0A0A0A] border border-[#27272a]">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Sales Revenue ({dateRange} Days)</h3>
                    {trendsLoading ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span></div> : salesData.length === 0 ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">No data</span></div> : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#1f1f22" strokeDasharray="0" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 9 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #27272a', borderRadius: 0 }} formatter={(v: number) => formatCurrency(v)} />
                                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#10b981', stroke: '#050505', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
                <div className="p-6 bg-[#0A0A0A] border border-[#27272a]">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Revenue by Category</h3>
                    {catLoading ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span></div> : categoryData.length === 0 ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">No data</span></div> : (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid stroke="#1f1f22" strokeDasharray="0" vertical={false} />
                                    <XAxis dataKey="category_name" axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 9 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#52525b', fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #27272a', borderRadius: 0 }} formatter={(v: number) => formatCurrency(v)} />
                                    <Bar dataKey="revenue" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-6 bg-[#0A0A0A] border border-[#27272a] flex flex-col">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Payment Methods</h3>
                    {paymentLoading ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span></div> : paymentData.length === 0 ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">No data</span></div> : (
                        <>
                            <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 200 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart><Pie data={paymentData} cx="50%" cy="50%" innerRadius="65%" outerRadius="85%" paddingAngle={2} dataKey="value" stroke="none">{paymentData.map((e, i) => <Cell key={i} fill={PAYMENT_COLORS[e.name.toLowerCase()] || '#71717a'} />)}</Pie></PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-mono text-white">{formatCurrency(paymentData.reduce((s, m) => s + m.value, 0))}</span>
                                    <span className="text-[9px] text-zinc-500 uppercase">Total Revenue</span>
                                </div>
                            </div>
                            <div className="mt-6 space-y-2">
                                {paymentData.map(m => (
                                    <div key={m.name} className="flex justify-between text-[10px] font-mono">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2" style={{ backgroundColor: PAYMENT_COLORS[m.name.toLowerCase()] || '#71717a' }} />
                                            <span className="text-zinc-400">{m.name}</span>
                                        </div>
                                        <span className="text-white">{m.count} orders ({m.percent}%)</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="p-6 bg-[#0A0A0A] border border-[#27272a] flex flex-col">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Top Products</h3>
                    {productsLoading ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span></div> : !topProducts?.length ? <div className="h-64 flex items-center justify-center"><span className="text-zinc-600 font-mono text-xs uppercase">No data</span></div> : (
                        <div className="space-y-4">
                            {topProducts.map((p, i) => (
                                <div key={p.product_id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-xs">{i + 1}</div>
                                        <div>
                                            <p className="text-xs text-white font-medium line-clamp-1">{p.product_name}</p>
                                            <p className="text-[10px] text-zinc-500 uppercase">{p.category || 'Uncategorized'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-emerald-400 font-mono">{formatCurrency(p.revenue)}</p>
                                        <p className="text-[10px] text-zinc-500">{p.units_sold} sold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Export Section */}
            <div className="border border-[#27272a] bg-[#0A0A0A] p-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Export Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { type: 'orders' as const, color: 'emerald', label: 'Export Orders' },
                        { type: 'products' as const, color: 'blue', label: 'Export Products' },
                        { type: 'customers' as const, color: 'purple', label: 'Export Customers' }
                    ].map(e => (
                        <button key={e.type} onClick={() => handleExport(e.type)} disabled={isExporting} className={`p-4 border border-[#27272a] hover:border-${e.color}-500 bg-[#0f0f0f] hover:bg-${e.color}-900/10 transition-all disabled:opacity-50`}>
                            <Download size={16} className={`text-${e.color}-500 mb-2`} strokeWidth={1.5} />
                            <p className="text-[10px] text-white font-mono uppercase tracking-wider">{e.label}</p>
                            <p className="text-[9px] text-zinc-600 font-mono mt-1">CSV Format</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
