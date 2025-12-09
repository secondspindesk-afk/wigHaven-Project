import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

interface SalesTrend {
    date: string;
    revenue: number;
    orders: number;
}

interface SalesChartProps {
    data?: SalesTrend[];
    isLoading?: boolean;
    range: 7 | 30 | 90;
    onRangeChange: (range: 7 | 30 | 90) => void;
}

export function SalesChart({ data, isLoading, range, onRangeChange }: SalesChartProps) {
    const chartData = Array.isArray(data) ? data : [];

    if (isLoading) {
        return (
            <div className="p-6 bg-[#0A0A0A] border border-[#27272a]">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-3 w-32 bg-zinc-800 animate-pulse" />
                    <div className="h-6 w-24 bg-zinc-800 animate-pulse" />
                </div>
                <div className="h-64 bg-zinc-900/50 animate-pulse" />
            </div>
        );
    }

    if (!chartData.length) {
        return (
            <div className="p-6 bg-[#0A0A0A] border border-[#27272a]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Revenue Analytics</h3>
                    <div className="flex gap-1">
                        {([7, 30, 90] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => onRangeChange(r)}
                                className={`text-[9px] font-mono px-2 py-1 transition-all ${range === r ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white'
                                    }`}
                            >
                                {r}D
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-64 flex items-center justify-center">
                    <span className="text-zinc-600 font-mono text-xs uppercase">No data for selected period</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-[#0A0A0A] border border-[#27272a]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Revenue Analytics</h3>
                <div className="flex gap-1">
                    {([7, 30, 90] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => onRangeChange(r)}
                            className={`text-[9px] font-mono px-2 py-1 transition-all ${range === r ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-white'
                                }`}
                        >
                            {r}D
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1f1f22" strokeDasharray="0" vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${String(d.getDate()).padStart(2, '0')}`;
                            }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0A0A0A',
                                border: '1px solid #27272a',
                                borderRadius: 0,
                                boxShadow: 'none',
                            }}
                            labelStyle={{ color: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}
                            itemStyle={{ color: '#ffffff', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                            formatter={(value: number) => [`GHS ${value.toLocaleString()}`, 'Revenue']}
                            labelFormatter={(label) => {
                                const d = new Date(label);
                                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();
                            }}
                        />
                        <Area
                            type="linear"
                            dataKey="revenue"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                            fill="url(#gradientRevenue)"
                            dot={false}
                            activeDot={{ r: 3, fill: '#ffffff', stroke: '#050505', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default SalesChart;
