import Skeleton from './Skeleton';

export default function ProductSkeleton() {
    return (
        <div className="container mx-auto px-4 py-12">
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center gap-2 mb-8">
                <Skeleton width={40} height={12} />
                <span className="text-zinc-800">/</span>
                <Skeleton width={40} height={12} />
                <span className="text-zinc-800">/</span>
                <Skeleton width={80} height={12} />
                <span className="text-zinc-800">/</span>
                <Skeleton width={120} height={12} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Left: Gallery Skeleton */}
                <div className="space-y-4">
                    <Skeleton className="aspect-square w-full" borderRadius="0.5rem" />
                    <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="aspect-square w-full" borderRadius="0.25rem" />
                        <Skeleton className="aspect-square w-full" borderRadius="0.25rem" />
                        <Skeleton className="aspect-square w-full" borderRadius="0.25rem" />
                        <Skeleton className="aspect-square w-full" borderRadius="0.25rem" />
                    </div>
                </div>

                {/* Right: Info Skeleton */}
                <div className="space-y-8">
                    <div className="space-y-4 border-b border-[#27272a] pb-6">
                        <Skeleton width="70%" height={32} />
                        <div className="flex items-center gap-4">
                            <Skeleton width={100} height={16} />
                        </div>
                        <Skeleton width={150} height={40} />
                    </div>

                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-3">
                                <Skeleton width={60} height={14} />
                                <div className="flex gap-3">
                                    <Skeleton width={80} height={40} />
                                    <Skeleton width={80} height={40} />
                                    <Skeleton width={80} height={40} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-[#27272a] flex gap-4">
                        <Skeleton width={120} height={56} />
                        <Skeleton className="flex-1" height={56} />
                    </div>
                </div>
            </div>
        </div>
    );
}
