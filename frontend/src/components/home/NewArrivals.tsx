import ProductCarousel from './ProductCarousel';
import { useProducts } from '@/lib/hooks/useProducts';

export default function NewArrivals() {
    const { data: productsData, isLoading } = useProducts({ sort: 'newest', page: 1 });

    const products = productsData?.data?.slice(0, 10) || [];

    return (
        <ProductCarousel
            products={products}
            title="New Arrivals"
            subtitle="Fresh styles just added"
            isLoading={isLoading}
            viewAllLink="/shop?sort=newest"
        />
    );
}
