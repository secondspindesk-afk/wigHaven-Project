import { useQuery } from '@tanstack/react-query';
import productApi from '@/lib/api/product';
import ProductCarousel from '@/components/home/ProductCarousel';

interface RelatedProductsProps {
    categoryId: string;
    currentProductId: string;
}

export default function RelatedProducts({ categoryId, currentProductId }: RelatedProductsProps) {
    const { data: products, isLoading } = useQuery({
        queryKey: ['related-products', categoryId],
        queryFn: () => productApi.getRelatedProducts(categoryId),
        enabled: !!categoryId
    });

    if (isLoading) return null;
    if (!products || products.length === 0) return null;

    // Filter out current product
    const related = products.filter(p => p.id !== currentProductId);

    if (related.length === 0) return null;

    return (
        <div className="mt-20 border-t border-[#27272a] pt-20">
            <ProductCarousel
                title="You May Also Like"
                products={related}
            />
        </div>
    );
}
