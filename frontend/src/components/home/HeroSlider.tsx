import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBanners } from '@/lib/hooks/useBanners';

export default function HeroSlider() {
    const { data: banners = [], isLoading } = useBanners();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-scroll every 5 seconds
    useEffect(() => {
        if (banners.length === 0 || isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [banners.length, isPaused]);

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
            <div className="relative w-full aspect-[21/9] md:aspect-[21/7] bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#0A0A0A] to-[#050505]" />
            </div>
        );
    }

    // Fallback hero when no banners - Premium Design with Generated Image
    if (banners.length === 0) {
        return (
            <div className="relative w-full aspect-[21/9] md:aspect-[21/7] bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden group">
                {/* Hero Image */}
                <div className="absolute inset-0">
                    <img
                        src="/images/hero-fallback.png"
                        alt="Premium Wigs Collection"
                        className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24">
                    <div className="max-w-xl space-y-6 animate-fade-in">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">New Collection</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight">
                            Define Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">Signature Look</span>
                        </h1>

                        <p className="text-base md:text-lg text-zinc-300 max-w-md font-light leading-relaxed">
                            Experience the confidence of flawless hair. Handcrafted premium units designed for the modern woman.
                        </p>

                        <div className="pt-4">
                            <Link
                                to="/shop"
                                className="inline-flex items-center gap-3 bg-white text-black font-bold text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-sm hover:bg-zinc-200 transition-all hover:gap-4"
                            >
                                Shop The Collection
                                <ChevronRight className="w-4 h-4" />
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
            className="relative w-full aspect-[21/9] md:aspect-[21/7] bg-[#0A0A0A] border border-[#27272a] rounded-sm overflow-hidden group"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Banner Image */}
            <Link to={currentBanner.linkUrl || '#'} className="block w-full h-full">
                <img
                    src={currentBanner.imageUrl}
                    alt={currentBanner.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Content Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <h2 className="text-2xl md:text-4xl font-bold text-white uppercase tracking-[0.2em] mb-2">
                        {currentBanner.title}
                    </h2>
                    {currentBanner.description && (
                        <p className="text-sm md:text-base text-zinc-300 font-mono uppercase max-w-2xl">
                            {currentBanner.description}
                        </p>
                    )}
                </div>
            </Link>

            {/* Navigation Arrows */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            goToPrevious();
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 border border-[#27272a] text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        aria-label="Previous banner"
                    >
                        <ChevronLeft className="w-6 h-6 mx-auto" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            goToNext();
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 border border-[#27272a] text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                        aria-label="Next banner"
                    >
                        <ChevronRight className="w-6 h-6 mx-auto" />
                    </button>
                </>
            )}

            {/* Dots Navigation */}
            {banners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {banners.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-1 transition-all ${index === currentIndex
                                ? 'w-8 bg-white'
                                : 'w-4 bg-zinc-600 hover:bg-zinc-500'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
