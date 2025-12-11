import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import productApi from '@/lib/api/product';
import ProductGallery from '@/components/product/ProductGallery';
import ProductInfo from '@/components/product/ProductInfo';
import ProductTabs from '@/components/product/ProductTabs';
import RelatedProducts from '@/components/product/RelatedProducts';
import { ChevronLeft } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function ProductDetails() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const variantIdFromUrl = searchParams.get('variant');
    const isMobile = useIsMobile();

    const { data: product, isLoading, error } = useQuery({
        queryKey: ['product', id],
        queryFn: () => productApi.getProduct(id!),
        enabled: !!id
    });

    const [displayImages, setDisplayImages] = useState<string[]>([]);

    // Initialize images when product loads
    useEffect(() => {
        if (product) {
            let variantImages = product.variants?.[0]?.images || [];

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
                <p className="text-zinc-400 mb-6">The product you are looking for does not exist.</p>
                <Link to="/shop" className="text-white underline">Back to Shop</Link>
            </div>
        );
    }

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505]">
                {/* Mobile Header with Back */}
                <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-sm border-b border-zinc-800">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <Link to="/shop" className="p-2 -ml-2 text-zinc-400 active:text-white">
                            <ChevronLeft size={24} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-500 uppercase tracking-wide truncate">
                                {product.category?.name || 'Category'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Gallery */}
                <div className="px-4 pt-4">
                    <ProductGallery
                        images={displayImages.length > 0 ? displayImages : (product.variants?.[0]?.images || [])}
                        productName={product.name}
                    />
                </div>

                {/* Product Info */}
                <div className="px-4 py-6">
                    <ProductInfo product={product} onVariantChange={handleVariantChange} />
                </div>

                {/* Tabs */}
                <div className="px-4">
                    <ProductTabs productId={product.id} description={product.description} />
                </div>

                {/* Related Products */}
                <div className="px-4 pb-8">
                    <RelatedProducts categoryId={product.category?.id || ''} currentProductId={product.id} />
                </div>
            </div>
        );
    }

    // Desktop Layout
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
