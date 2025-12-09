import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface InventoryStatus {
    inStock: number;
    lowStock: number;
    outOfStock: number;
}

interface InventoryChartProps {
    data?: InventoryStatus;
    isLoading?: boolean;
}

const COLORS = {
    inStock: '#10b981',    // Emerald
    lowStock: '#eab308',   // Yellow
    outOfStock: '#ef4444', // Red
};

export function InventoryChart({ data, isLoading }: InventoryChartProps) {
    if (isLoading) {
        return (
            <div className="p-6 bg-[#0A0A0A] border border-[#27272a] h-full">
                <div className="h-3 w-32 bg-zinc-800 animate-pulse mb-6" />
                <div className="h-48 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-zinc-800 animate-pulse" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6 bg-[#0A0A0A] border border-[#27272a] h-full">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Stock Status</h3>
                <div className="h-48 flex items-center justify-center">
                    <span className="text-zinc-600 font-mono text-xs uppercase">No inventory data</span>
                </div>
            </div>
        );
    }

    const chartData = [
        { name: 'In Stock', value: data.inStock || 0, color: COLORS.inStock },
        { name: 'Low Stock', value: data.lowStock || 0, color: COLORS.lowStock },
        { name: 'Out of Stock', value: data.outOfStock || 0, color: COLORS.outOfStock },
    ].filter(item => item.value > 0);

    const total = (data.inStock || 0) + (data.lowStock || 0) + (data.outOfStock || 0);
    const healthPercent = total > 0 ? Math.round(((data.inStock || 0) / total) * 100) : 0;

    return (
        <div className="p-6 bg-[#0A0A0A] border border-[#27272a] h-full flex flex-col">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Stock Status</h3>

            <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1, color: '#27272a' }]}
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="90%"
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

                {/* Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-mono text-white">{healthPercent}%</span>
                    <span className="text-[9px] text-zinc-500 uppercase">Health</span>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-[#27272a] pt-4">
                <div>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <div className="w-2 h-2 bg-emerald-500" />
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Good</span>
                    </div>
                    <span className="text-xs font-mono text-white">{data.inStock || 0}</span>
                </div>
                <div>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <div className="w-2 h-2 bg-yellow-500" />
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Low</span>
                    </div>
                    <span className="text-xs font-mono text-yellow-500">{data.lowStock || 0}</span>
                </div>
                <div>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <div className="w-2 h-2 bg-red-500" />
                        <span className="text-[9px] text-zinc-500 uppercase font-mono">Out</span>
                    </div>
                    <span className="text-xs font-mono text-red-500">{data.outOfStock || 0}</span>
                </div>
            </div>
        </div>
    );
}

export default InventoryChart;
