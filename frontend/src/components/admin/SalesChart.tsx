import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

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
    const isMobile = useIsMobile();

    if (isLoading) {
        return (
            <div className={`${isMobile ? 'p-4' : 'p-6'} bg-[#0A0A0A] border border-[#27272a] ${isMobile ? 'rounded-xl' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="h-3 w-32 bg-zinc-800 animate-pulse rounded" />
                    <div className="h-6 w-24 bg-zinc-800 animate-pulse rounded" />
                </div>
                <div className={`${isMobile ? 'h-48' : 'h-64'} bg-zinc-900/50 animate-pulse rounded`} />
            </div>
        );
    }

    if (!chartData.length) {
        return (
            <div className={`${isMobile ? 'p-4' : 'p-6'} bg-[#0A0A0A] border border-[#27272a] ${isMobile ? 'rounded-xl' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`${isMobile ? 'text-sm font-semibold' : 'text-xs font-bold uppercase tracking-widest'} text-white`}>
                        {isMobile ? 'Revenue' : 'Revenue Analytics'}
                    </h3>
                    <div className="flex gap-1">
                        {([7, 30, 90] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => onRangeChange(r)}
                                className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${range === r
                                    ? 'text-white bg-zinc-700'
                                    : 'text-zinc-500 active:bg-zinc-800'
                                    }`}
                            >
                                {r}D
                            </button>
                        ))}
                    </div>
                </div>
                <div className={`${isMobile ? 'h-40' : 'h-64'} flex items-center justify-center`}>
                    <span className="text-zinc-600 font-mono text-xs">No data</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`${isMobile ? 'p-4' : 'p-6'} bg-[#0A0A0A] border border-[#27272a] ${isMobile ? 'rounded-xl' : ''}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={`${isMobile ? 'text-sm font-semibold' : 'text-xs font-bold uppercase tracking-widest'} text-white`}>
                    {isMobile ? 'Revenue' : 'Revenue Analytics'}
                </h3>
                <div className="flex gap-1">
                    {([7, 30, 90] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => onRangeChange(r)}
                            className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${range === r
                                ? 'text-white bg-zinc-700'
                                : 'text-zinc-500 active:bg-zinc-800'
                                }`}
                        >
                            {r}D
                        </button>
                    ))}
                </div>
            </div>

            <div className={isMobile ? 'h-48' : 'h-64'}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: isMobile ? 0 : 10, left: 0, bottom: 0 }}>
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
                            tick={{ fill: '#52525b', fontSize: isMobile ? 8 : 9, fontFamily: 'JetBrains Mono, monospace' }}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${String(d.getDate()).padStart(2, '0')}`;
                            }}
                            interval={isMobile ? 'preserveStartEnd' : 'preserveEnd'}
                        />
                        {!isMobile && (
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                            />
                        )}
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0A0A0A',
                                border: '1px solid #27272a',
                                borderRadius: isMobile ? 8 : 0,
                                boxShadow: 'none',
                                padding: isMobile ? '8px 12px' : undefined,
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
                            activeDot={{ r: isMobile ? 4 : 3, fill: '#ffffff', stroke: '#050505', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default SalesChart;
