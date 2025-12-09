import { useState } from 'react';
import { Download, TrendingUp, Users, CreditCard, Calendar } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRevenueByCategory, useCustomerAnalytics, usePaymentMethods, useSalesTrends, useTopProducts } from '@/lib/hooks/useAdminDashboard';
import adminApi from '@/lib/api/admin';
import { formatCurrency } from '@/lib/utils/currency';
import { useToast } from '@/contexts/ToastContext';

// Color palette
const PAYMENT_COLORS = {
    paystack: '#10b981',
    cash: '#71717a',
    card: '#3b82f6'
};

import { useCartAbandonment } from '@/lib/hooks/useAdminDashboard';
import { ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react';

function CartAbandonmentStats() {
    const { data, isLoading, isError } = useCartAbandonment();

    if (isLoading || isError) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <ShoppingCart size={16} className="text-zinc-400" strokeWidth={1.5} />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Carts</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl text-white font-mono font-medium">
                        {(data?.total_carts || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">ACTIVE SESSIONS</span>
                </div>
            </div>

            <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle size={16} className="text-amber-500" strokeWidth={1.5} />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Abandoned</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl text-white font-mono font-medium">
                        {(data?.abandonment_rate || 0).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">RATE</span>
                </div>
            </div>

            <div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <CheckCircle size={16} className="text-emerald-500" strokeWidth={1.5} />
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Recovered</span>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl text-white font-mono font-medium">
                        {(data?.recovered_carts || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">SAVED ORDERS</span>
                </div>
            </div>
        </div>
    );
}

export default function Analytics() {
    const { showToast } = useToast();
    const [dateRange, setDateRange] = useState<30 | 90>(30);
    const [isExporting, setIsExporting] = useState(false);

    // Data Hooks - include isError for proper error handling
    const { data: revenueByCat, isLoading: catLoading, isError: catError } = useRevenueByCategory();
    const { data: customerData, isLoading: customerLoading, isError: customerError } = useCustomerAnalytics();
    const { data: paymentMethodsData, isLoading: paymentLoading, isError: paymentError } = usePaymentMethods();
    const { data: salesTrends, isLoading: trendsLoading, isError: trendsError } = useSalesTrends(dateRange);
    const { data: topProducts, isLoading: productsLoading, isError: productsError } = useTopProducts(5);

    // Combined error state for showing error banner
    const hasDataError = catError || customerError || paymentError || trendsError || productsError;

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
        } catch (error) {
            showToast('Export failed. Please try again.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    // Transform Data for Charts
    const categoryData = Array.isArray(revenueByCat) ? revenueByCat : [];

    const paymentData = paymentMethodsData ? Object.entries(paymentMethodsData).map(([method, data]: [string, any]) => ({
        name: method.charAt(0).toUpperCase() + method.slice(1),
        value: data.revenue,
        count: data.count,
        percent: data.percent
    })) : [];

    const salesData = salesTrends?.daily?.map(day => ({
        date: new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        revenue: day.revenue,
        orders: day.orders
    })) || [];

    return (
        <div className="space-y-8">
            {/* Error Banner */}
            {hasDataError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm text-red-400">
                        Some data failed to load. Charts may be incomplete.
                    </span>
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Analytics & Reports</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">DATA ANALYTICS DASHBOARD</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setDateRange(30)}
                        className={`px-3 py-1.5 text-[9px] font-mono uppercase transition-all ${dateRange === 30 ? 'bg-white text-black' : 'bg-[#0A0A0A] text-zinc-500 hover:text-white border border-[#27272a]'
                            }`
                        }
                    >
                        30 Days
                    </button >
                    <button
                        onClick={() => setDateRange(90)}
                        className={`px-3 py-1.5 text-[9px] font-mono uppercase transition-all ${dateRange === 90 ? 'bg-white text-black' : 'bg-[#0A0A0A] text-zinc-500 hover:text-white border border-[#27272a]'
                            }`}
                    >
                        90 Days
                    </button>
                </div >
            </div >

            {/* Key Metrics Row */}
            < div className="grid grid-cols-1 md:grid-cols-4 gap-4" >
                {/* Total Customers */}
                < div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors" >
                    <div className="flex items-center gap-3 mb-4">
                        <Users size={16} className="text-blue-500" strokeWidth={1.5} />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Customers</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {customerLoading ? '---' : (customerData?.total_customers || 0).toLocaleString()}
                        </span>
                    </div>
                </div >

                {/* New Customers */}
                < div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors" >
                    <div className="flex items-center gap-3 mb-4">
                        <TrendingUp size={16} className="text-emerald-500" strokeWidth={1.5} />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">New (30D)</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {customerLoading ? '--' : String(customerData?.new_customers || 0).padStart(2, '0')}
                        </span>
                    </div>
                </div >

                {/* Retention Rate */}
                < div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors" >
                    <div className="flex items-center gap-3 mb-4">
                        <Calendar size={16} className="text-purple-500" strokeWidth={1.5} />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Retention</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {customerLoading ? '--' : `${(customerData?.customer_retention_rate || 0).toFixed(0)}%`}
                        </span>
                    </div>
                </div >

                {/* Avg LTV */}
                < div className="p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-zinc-600 transition-colors" >
                    <div className="flex items-center gap-3 mb-4">
                        <CreditCard size={16} className="text-yellow-500" strokeWidth={1.5} />
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Avg LTV</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-white font-mono font-medium">
                            {customerLoading ? '---' : formatCurrency(customerData?.average_ltv || 0)}
                        </span>
                    </div>
                </div >
            </div >

            {/* Cart Abandonment Row */}
            < CartAbandonmentStats />

            {/* Charts Row 1: Sales Trends & Revenue by Category */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-4" >
                {/* Sales Trends (Revenue) */}
                < div className="p-6 bg-[#0A0A0A] border border-[#27272a]" >
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Sales Revenue ({dateRange} Days)</h3>
                    {
                        trendsLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span>
                            </div>
                        ) : salesData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">No sales data</span>
                            </div>
                        ) : (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="#1f1f22" strokeDasharray="0" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0A0A0A',
                                                border: '1px solid #27272a',
                                                borderRadius: 0,
                                            }}
                                            labelStyle={{ color: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                            itemStyle={{ color: '#ffffff', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 3, fill: '#10b981', stroke: '#050505', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    }
                </div >

                {/* Revenue by Category */}
                < div className="p-6 bg-[#0A0A0A] border border-[#27272a]" >
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Revenue by Category</h3>
                    {
                        catLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span>
                            </div>
                        ) : categoryData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">No category data</span>
                            </div>
                        ) : (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="#1f1f22" strokeDasharray="0" vertical={false} />
                                        <XAxis
                                            dataKey="category_name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0A0A0A',
                                                border: '1px solid #27272a',
                                                borderRadius: 0,
                                            }}
                                            labelStyle={{ color: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}
                                            itemStyle={{ color: '#ffffff', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                        />
                                        <Bar dataKey="revenue" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )
                    }
                </div >
            </div >

            {/* Charts Row 2: Payment Methods & Top Products */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-4" >
                {/* Payment Methods */}
                < div className="p-6 bg-[#0A0A0A] border border-[#27272a] flex flex-col" >
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Payment Methods</h3>
                    {
                        paymentLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span>
                            </div>
                        ) : paymentData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">No payment data</span>
                            </div>
                        ) : (
                            <>
                                <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="65%"
                                                outerRadius="85%"
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {paymentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name.toLowerCase() as keyof typeof PAYMENT_COLORS] || '#71717a'} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-mono text-white">
                                            {formatCurrency(paymentData.reduce((sum, m) => sum + m.value, 0))}
                                        </span>
                                        <span className="text-[9px] text-zinc-500 uppercase">Total Revenue</span>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="mt-6 space-y-2">
                                    {paymentData.map((method) => (
                                        <div key={method.name} className="flex justify-between text-[10px] font-mono">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2" style={{ backgroundColor: PAYMENT_COLORS[method.name.toLowerCase() as keyof typeof PAYMENT_COLORS] || '#71717a' }} />
                                                <span className="text-zinc-400">{method.name}</span>
                                            </div>
                                            <span className="text-white">{method.count} orders ({method.percent}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    }
                </div >

                {/* Top Products */}
                < div className="p-6 bg-[#0A0A0A] border border-[#27272a] flex flex-col" >
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Top Products</h3>
                    {
                        productsLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">Loading...</span>
                            </div>
                        ) : !topProducts || topProducts.length === 0 ? (
                            <div className="h-64 flex items-center justify-center">
                                <span className="text-zinc-600 font-mono text-xs uppercase">No product data</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {topProducts.map((product, index) => (
                                    <div key={product.product_id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-xs">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="text-xs text-white font-medium line-clamp-1">{product.product_name}</p>
                                                <p className="text-[10px] text-zinc-500 uppercase">{product.category || 'Uncategorized'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-emerald-400 font-mono">{formatCurrency(product.revenue)}</p>
                                            <p className="text-[10px] text-zinc-500">{product.units_sold} sold</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                </div >
            </div >

            {/* Export Section */}
            < div className="border border-[#27272a] bg-[#0A0A0A] p-6" >
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Export Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleExport('orders')}
                        disabled={isExporting}
                        className="p-4 border border-[#27272a] hover:border-emerald-500 bg-[#0f0f0f] hover:bg-emerald-900/10 transition-all group disabled:opacity-50"
                    >
                        <Download size={16} className="text-emerald-500 mb-2" strokeWidth={1.5} />
                        <p className="text-[10px] text-white font-mono uppercase tracking-wider">Export Orders</p>
                        <p className="text-[9px] text-zinc-600 font-mono mt-1">CSV Format</p>
                    </button>

                    <button
                        onClick={() => handleExport('products')}
                        disabled={isExporting}
                        className="p-4 border border-[#27272a] hover:border-blue-500 bg-[#0f0f0f] hover:bg-blue-900/10 transition-all group disabled:opacity-50"
                    >
                        <Download size={16} className="text-blue-500 mb-2" strokeWidth={1.5} />
                        <p className="text-[10px] text-white font-mono uppercase tracking-wider">Export Products</p>
                        <p className="text-[9px] text-zinc-600 font-mono mt-1">CSV Format</p>
                    </button>

                    <button
                        onClick={() => handleExport('customers')}
                        disabled={isExporting}
                        className="p-4 border border-[#27272a] hover:border-purple-500 bg-[#0f0f0f] hover:bg-purple-900/10 transition-all group disabled:opacity-50"
                    >
                        <Download size={16} className="text-purple-500 mb-2" strokeWidth={1.5} />
                        <p className="text-[10px] text-white font-mono uppercase tracking-wider">Export Customers</p>
                        <p className="text-[9px] text-zinc-600 font-mono mt-1">CSV Format</p>
                    </button>
                </div>
            </div >
        </div >
    );
}
