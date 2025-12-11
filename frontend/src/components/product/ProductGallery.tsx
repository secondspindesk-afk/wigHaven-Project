import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface ProductGalleryProps {
    images: string[];
    productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const isMobile = useIsMobile();
    const scrollRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);

    // Ensure we have at least one image
    const displayImages = images.length > 0 ? images : ['/placeholder-product.jpg'];

    // Reset index when images change (e.g. variant switch)
    useEffect(() => {
        setSelectedIndex(0);
    }, [images]);

    // Scroll to selected thumbnail on mobile
    useEffect(() => {
        if (isMobile && scrollRef.current) {
            const container = scrollRef.current;
            const scrollTo = selectedIndex * 72; // thumbnail width + gap
            container.scrollTo({ left: scrollTo - container.clientWidth / 2 + 36, behavior: 'smooth' });
        }
    }, [selectedIndex, isMobile]);

    const handlePrevious = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelectedIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    // Touch swipe handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;

        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                handleNext();
            } else {
                handlePrevious();
            }
        }
    };

    // Mobile Gallery
    if (isMobile) {
        return (
            <div className="space-y-3">
                {/* Main Image with Swipe */}
                <div
                    className="relative aspect-square bg-zinc-900 overflow-hidden rounded-xl"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => setIsLightboxOpen(true)}
                >
                    <img
                        src={displayImages[selectedIndex]}
                        alt={`${productName} - View ${selectedIndex + 1}`}
                        className="w-full h-full object-cover"
                    />

                    {/* Image Counter */}
                    {displayImages.length > 1 && (
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <span className="text-xs text-white font-medium">
                                {selectedIndex + 1} / {displayImages.length}
                            </span>
                        </div>
                    )}

                    {/* Zoom hint */}
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm p-2 rounded-full">
                        <ZoomIn size={16} className="text-white" />
                    </div>
                </div>

                {/* Thumbnail Strip - Horizontal Scroll */}
                {displayImages.length > 1 && (
                    <div
                        ref={scrollRef}
                        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {displayImages.map((image, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedIndex(index)}
                                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${selectedIndex === index
                                        ? 'border-white'
                                        : 'border-transparent opacity-60'
                                    }`}
                            >
                                <img
                                    src={image}
                                    alt={`Thumbnail ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* Mobile Lightbox */}
                <AnimatePresence>
                    {isLightboxOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] bg-black flex flex-col"
                            onClick={() => setIsLightboxOpen(false)}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
                                <span className="text-sm text-white">
                                    {selectedIndex + 1} / {displayImages.length}
                                </span>
                                <button
                                    onClick={() => setIsLightboxOpen(false)}
                                    className="p-2 text-white"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Image */}
                            <div
                                className="flex-1 flex items-center justify-center"
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <img
                                    src={displayImages[selectedIndex]}
                                    alt={productName}
                                    className="max-w-full max-h-full object-contain"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>

                            {/* Bottom Thumbnails */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {displayImages.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedIndex(index)}
                                        className={`w-2 h-2 rounded-full transition-all ${selectedIndex === index ? 'bg-white w-6' : 'bg-white/40'
                                            }`}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Desktop Gallery
    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div
                className="relative aspect-[4/5] bg-zinc-900 overflow-hidden group cursor-zoom-in border border-[#27272a]"
                onClick={() => setIsLightboxOpen(true)}
            >
                <img
                    src={displayImages[selectedIndex]}
                    alt={`${productName} - View ${selectedIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <ZoomIn className="text-white drop-shadow-lg" size={32} />
                </div>

                {/* Navigation Arrows */}
                {displayImages.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevious}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {displayImages.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`aspect-square bg-zinc-900 border transition-all ${selectedIndex === index
                                ? 'border-white opacity-100 ring-1 ring-white'
                                : 'border-transparent opacity-60 hover:opacity-100 hover:border-zinc-700'
                                }`}
                        >
                            <img
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Desktop Lightbox */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => setIsLightboxOpen(false)}
                    >
                        <button
                            onClick={() => setIsLightboxOpen(false)}
                            className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors p-2"
                        >
                            <X size={32} />
                        </button>

                        <div className="relative w-full max-w-6xl h-full max-h-screen p-4 flex items-center justify-center">
                            <motion.img
                                key={selectedIndex}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                src={displayImages[selectedIndex]}
                                alt={productName}
                                className="max-w-full max-h-full object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />

                            {displayImages.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrevious}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors"
                                    >
                                        <ChevronLeft size={48} />
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors"
                                    >
                                        <ChevronRight size={48} />
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] p-2" onClick={(e) => e.stopPropagation()}>
                            {displayImages.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedIndex(index)}
                                    className={`w-16 h-16 flex-shrink-0 border transition-all ${selectedIndex === index
                                        ? 'border-white opacity-100'
                                        : 'border-transparent opacity-50 hover:opacity-100'
                                        }`}
                                >
                                    <img
                                        src={image}
                                        alt={`Thumbnail ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
