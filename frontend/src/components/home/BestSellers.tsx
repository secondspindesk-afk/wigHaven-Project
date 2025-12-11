import ProductCarousel from './ProductCarousel';
import { useProducts } from '@/lib/hooks/useProducts';

export default function BestSellers() {
    const { data: productsData, isLoading } = useProducts({ sort: 'popular', page: 1 });

    const products = productsData?.data?.slice(0, 10) || [];

    return (
        <ProductCarousel
            products={products}
            title="Customer Favorites"
            subtitle="Most loved by our community"
            isLoading={isLoading}
            viewAllLink="/shop?sort=popular"
        />
    );
}
