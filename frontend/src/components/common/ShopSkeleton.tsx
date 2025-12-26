import Skeleton from './Skeleton';

interface ShopSkeletonProps {
    isMobile: boolean;
    mobileGridCols: 1 | 2;
}

export default function ShopSkeleton({ isMobile, mobileGridCols }: ShopSkeletonProps) {
    return (
        <div className={`grid gap-3 md:gap-6 ${isMobile ? (mobileGridCols === 2 ? 'grid-cols-2' : 'grid-cols-1') : 'grid-cols-2 lg:grid-cols-3'}`}>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#0A0A0A] border border-zinc-800 rounded-xl overflow-hidden">
                    {/* Image Placeholder */}
                    <Skeleton className="aspect-[3/4] w-full" borderRadius="0.75rem 0.75rem 0 0" />

                    {/* Content Placeholder */}
                    <div className="p-4 space-y-3">
                        <Skeleton width="40%" height={12} />
                        <Skeleton width="80%" height={20} />
                        <div className="flex justify-between items-center pt-2">
                            <Skeleton width="30%" height={24} />
                            <Skeleton width={32} height={32} borderRadius="50%" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
