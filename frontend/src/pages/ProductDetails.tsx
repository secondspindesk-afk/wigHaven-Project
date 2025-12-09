import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import productApi from '@/lib/api/product';
import ProductGallery from '@/components/product/ProductGallery';
import ProductInfo from '@/components/product/ProductInfo';
import ProductTabs from '@/components/product/ProductTabs';
import RelatedProducts from '@/components/product/RelatedProducts';

export default function ProductDetails() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const variantIdFromUrl = searchParams.get('variant');

    const { data: product, isLoading, error } = useQuery({
        queryKey: ['product', id],
        queryFn: () => productApi.getProduct(id!),
        enabled: !!id
    });

    const [displayImages, setDisplayImages] = useState<string[]>([]);

    // Initialize images when product loads - use VARIANT images (product.images is deprecated)
    useEffect(() => {
        if (product) {
            // Get images from first variant (variants[0] is the main product variant)
            let variantImages = product.variants?.[0]?.images || [];

            // Override with URL param if valid
            if (variantIdFromUrl) {
                const urlVariant = product.variants?.find(v => v.id === variantIdFromUrl);
                if (urlVariant?.images?.length) {
                    variantImages = urlVariant.images;
                }
            }

            if (variantImages.length > 0) {
                setDisplayImages(variantImages);
            }
        }
    }, [product, variantIdFromUrl]);

    const handleVariantChange = (variant: any) => {
        if (variant && variant.images && variant.images.length > 0) {
            setDisplayImages(variant.images);
        } else if (product?.variants?.[0]?.images) {
            // Fallback to first variant's images, NOT product.images
            setDisplayImages(product.variants[0].images);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                <h1 className="text-2xl font-bold text-white mb-4">Product Not Found</h1>
                <p className="text-zinc-400">The product you are looking for does not exist.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-8 uppercase tracking-widest">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <span>/</span>
                <Link to="/shop" className="hover:text-white transition-colors">Shop</Link>
                <span>/</span>
                <Link to={`/shop?category=${product.category?.id || ''}`} className="hover:text-white transition-colors">
                    {product.category?.name || 'Category'}
                </Link>
                <span>/</span>
                <span className="text-white">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Left: Gallery */}
                <ProductGallery images={displayImages.length > 0 ? displayImages : (product.variants?.[0]?.images || [])} productName={product.name} />

                {/* Right: Info */}
                <ProductInfo product={product} onVariantChange={handleVariantChange} />
            </div>

            {/* Tabs: Description & Reviews */}
            <ProductTabs productId={product.id} description={product.description} />

            {/* Related Products */}
            <RelatedProducts categoryId={product.category?.id || ''} currentProductId={product.id} />
        </div>
    );
}
