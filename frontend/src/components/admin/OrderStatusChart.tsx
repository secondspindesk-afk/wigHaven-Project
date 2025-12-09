import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface OrderStatusData {
    status: string;
    count: number;
    percentage: number;
}

interface OrderStatusChartProps {
    data?: OrderStatusData[];
    isLoading?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
    pending: '#eab308',     // Yellow
    paid: '#3b82f6',        // Blue
    processing: '#a855f7',  // Purple
    shipped: '#3b82f6',     // Blue
    delivered: '#10b981',   // Emerald
    completed: '#10b981',   // Emerald
    cancelled: '#ef4444',   // Red
    failed: '#ef4444',      // Red
    refunded: '#f97316',    // Orange
};

export function OrderStatusChart({ data, isLoading }: OrderStatusChartProps) {
    const safeData = Array.isArray(data) ? data : [];

    if (isLoading) {
        return (
            <div className="p-6 bg-[#0A0A0A] border border-[#27272a] h-full flex flex-col">
                <div className="h-3 w-32 bg-zinc-800 animate-pulse mb-6" />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full bg-zinc-800 animate-pulse" />
                </div>
            </div>
        );
    }

    const chartData = safeData.map(item => ({
        name: item.status,
        value: item.count,
        color: STATUS_COLORS[item.status.toLowerCase()] || '#71717a',
    }));

    const totalOrders = chartData.reduce((sum, item) => sum + item.value, 0);
    const completedOrders = safeData.filter(d =>
        ['delivered', 'completed', 'shipped'].includes(d.status.toLowerCase())
    ).reduce((sum, d) => sum + d.count, 0);
    const efficiency = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    return (
        <div className="p-6 bg-[#0A0A0A] border border-[#27272a] h-full flex flex-col">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Fulfillment Ratio</h3>

            <div className="relative flex-1 flex items-center justify-center min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1, color: '#27272a' }]}
                            cx="50%"
                            cy="50%"
                            innerRadius="75%"
                            outerRadius="95%"
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {(chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1, color: '#27272a' }]).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-mono text-white">{efficiency}%</span>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Efficiency</span>
                </div>
            </div>

            {/* Status Bars */}
            <div className="mt-6 space-y-3">
                {safeData.slice(0, 3).map((item) => (
                    <div key={item.status}>
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                            <span className="text-zinc-400 capitalize">{item.status}</span>
                            <span className="text-white">{item.count}</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1">
                            <div
                                className="h-1 transition-all"
                                style={{
                                    width: `${item.percentage || 0}%`,
                                    backgroundColor: STATUS_COLORS[item.status.toLowerCase()] || '#71717a'
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default OrderStatusChart;
