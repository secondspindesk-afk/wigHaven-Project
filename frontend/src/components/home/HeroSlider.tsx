import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { usePublicBanners } from '@/lib/hooks/useBanners';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function HeroSlider() {
    const { data: bannersData, isLoading } = usePublicBanners();
    const banners = Array.isArray(bannersData) ? bannersData : [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const isMobile = useIsMobile();
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);

    // Auto-scroll every 5 seconds
    useEffect(() => {
        if (banners.length === 0 || isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [banners.length, isPaused]);

    // Touch handlers for mobile swipe
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
                // Swipe left - next slide
                setCurrentIndex((prev) => (prev + 1) % banners.length);
            } else {
                // Swipe right - previous slide
                setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
            }
        }
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    if (isLoading) {
        return (
            <div className="relative w-full aspect-[4/5] md:aspect-[21/9] bg-[#0A0A0A] overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#0A0A0A] to-[#050505]" />
            </div>
        );
    }

    // Fallback hero when no banners
    if (banners.length === 0) {
        return (
            <div
                className="relative w-full aspect-[4/5] md:aspect-[21/9] bg-[#0A0A0A] overflow-hidden group"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Hero Image */}
                <div className="absolute inset-0">
                    <img
                        src="/images/hero-fallback.png"
                        alt="Premium Wigs Collection"
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent md:bg-gradient-to-r md:from-black/90 md:via-black/40 md:to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end md:justify-center p-6 md:px-16 lg:px-24">
                    <div className="max-w-xl space-y-4 md:space-y-6 animate-fade-in">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">New Collection</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
                            Define Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">Signature Look</span>
                        </h1>

                        {/* Description - hidden on mobile for cleaner look */}
                        <p className="hidden md:block text-base md:text-lg text-zinc-300 max-w-md font-light leading-relaxed">
                            Experience the confidence of flawless hair. Handcrafted premium units designed for the modern woman.
                        </p>

                        {/* CTA Button */}
                        <div className="pt-2 md:pt-4">
                            <Link
                                to="/shop"
                                className="inline-flex items-center justify-center gap-3 bg-white text-black font-bold text-sm md:text-xs uppercase tracking-widest px-6 md:px-8 py-4 rounded-lg md:rounded-sm hover:bg-zinc-200 transition-all w-full md:w-auto"
                            >
                                <ShoppingBag className="w-5 h-5 md:hidden" />
                                <span>Shop Now</span>
                                <ChevronRight className="w-4 h-4 hidden md:block" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const currentBanner = banners[currentIndex];

    return (
        <div
            className="relative w-full aspect-[4/5] md:aspect-[21/9] bg-[#0A0A0A] overflow-hidden group"
            onMouseEnter={() => !isMobile && setIsPaused(true)}
            onMouseLeave={() => !isMobile && setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Banner Image */}
            <Link to={currentBanner.linkUrl || '#'} className="block w-full h-full">
                <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                />

                {/* Overlay Gradient - stronger at bottom for mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                    <h2 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-wide md:tracking-[0.2em] mb-2">
                        {currentBanner.title}
                    </h2>
                    {currentBanner.description && (
                        <p className="text-sm md:text-base text-zinc-300 max-w-2xl line-clamp-2">
                            {currentBanner.description}
                        </p>
                    )}

                    {/* Mobile Shop Button */}
                    {isMobile && currentBanner.linkUrl && (
                        <div className="mt-4">
                            <span className="inline-flex items-center gap-2 bg-white text-black font-bold text-sm uppercase tracking-wide px-6 py-3 rounded-lg">
                                <ShoppingBag className="w-4 h-4" />
                                Shop Now
                            </span>
                        </div>
                    )}
                </div>
            </Link>

            {/* Navigation Arrows - desktop only */}
            {banners.length > 1 && !isMobile && (
                <>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            goToPrevious();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110 flex items-center justify-center"
                        aria-label="Previous banner"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            goToNext();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-sm border border-white/20 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-black/70 hover:scale-110 flex items-center justify-center"
                        aria-label="Next banner"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Dots Navigation */}
            {banners.length > 1 && (
                <div className="absolute bottom-6 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-2 transition-all rounded-full ${index === currentIndex
                                    ? 'w-8 bg-white'
                                    : 'w-2 bg-white/40 active:bg-white/60'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Swipe hint for mobile */}
            {isMobile && banners.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <span className="text-[10px] text-white/70 uppercase tracking-wide">
                        {currentIndex + 1} / {banners.length}
                    </span>
                </div>
            )}
        </div>
    );
}
