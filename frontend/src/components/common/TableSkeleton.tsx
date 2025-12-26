import Skeleton from './Skeleton';

interface TableSkeletonProps {
    rows?: number;
    cols?: number;
    showCheckbox?: boolean;
    showActions?: boolean;
}

export default function TableSkeleton({
    rows = 5,
    cols = 5,
    showCheckbox = false,
    showActions = false
}: TableSkeletonProps) {
    return (
        <div className="w-full overflow-hidden">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-[#27272a]">
                        {showCheckbox && <th className="w-10 px-4 py-3"><Skeleton width={16} height={16} /></th>}
                        {[...Array(cols)].map((_, i) => (
                            <th key={i} className="px-4 py-3"><Skeleton width="60%" height={10} /></th>
                        ))}
                        {showActions && <th className="px-4 py-3 text-right"><Skeleton width="40%" height={10} className="ml-auto" /></th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                    {[...Array(rows)].map((_, i) => (
                        <tr key={i}>
                            {showCheckbox && <td className="px-4 py-4"><Skeleton width={16} height={16} /></td>}
                            {[...Array(cols)].map((_, j) => (
                                <td key={j} className="px-4 py-4">
                                    <div className="space-y-2">
                                        <Skeleton width="80%" height={14} />
                                        {j === 0 && <Skeleton width="40%" height={10} />}
                                    </div>
                                </td>
                            ))}
                            {showActions && (
                                <td className="px-4 py-4 text-right">
                                    <Skeleton width={60} height={28} className="ml-auto" />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
