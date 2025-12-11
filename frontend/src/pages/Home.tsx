import HeroSlider from '@/components/home/HeroSlider';
import FeaturedCategories from '@/components/home/FeaturedCategories';
import NewArrivals from '@/components/home/NewArrivals';
import BestSellers from '@/components/home/BestSellers';
import { Link } from 'react-router-dom';
import { ShoppingBag, Sparkles, Crown } from 'lucide-react';

export default function Home() {
    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Hero Section - full bleed */}
            <section className="w-full">
                <HeroSlider />
            </section>

            {/* Featured Categories */}
            <section className="container mx-auto px-4 py-8 md:py-16">
                <FeaturedCategories />
            </section>

            {/* New Arrivals */}
            <section className="py-8 md:py-16 border-t border-zinc-800/50">
                <div className="container mx-auto px-4">
                    <NewArrivals />
                </div>
            </section>

            {/* Promo Banner - Mobile optimized */}
            <section className="py-6 md:py-12 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
                        <div className="flex items-center gap-4 text-center md:text-left">
                            <div className="hidden md:flex w-12 h-12 bg-white/10 rounded-full items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg md:text-xl font-bold text-white mb-1">
                                    Free Shipping Over $100
                                </h3>
                                <p className="text-sm text-zinc-400">
                                    Plus easy returns within 30 days
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/shop"
                            className="inline-flex items-center gap-2 bg-white text-black font-bold text-sm uppercase tracking-wide px-6 py-3 rounded-lg md:rounded-sm active:scale-95 transition-transform"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Start Shopping
                        </Link>
                    </div>
                </div>
            </section>

            {/* Best Sellers */}
            <section className="py-8 md:py-16 border-t border-zinc-800/50">
                <div className="container mx-auto px-4">
                    <BestSellers />
                </div>
            </section>

            {/* CTA Section - Premium mobile */}
            <section className="py-12 md:py-24 border-t border-zinc-800/50 bg-gradient-to-b from-transparent to-zinc-900/30">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center">
                        {/* Icon */}
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-full mb-6">
                            <Crown className="w-8 h-8 text-white" />
                        </div>

                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">
                            Explore Our Full Collection
                        </h2>
                        <p className="text-zinc-400 text-base md:text-lg mb-8 max-w-md mx-auto">
                            Discover hundreds of beautiful styles crafted for the modern woman
                        </p>

                        {/* Full-width button on mobile */}
                        <Link
                            to="/shop"
                            className="inline-flex items-center justify-center gap-3 bg-white text-black font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-lg md:rounded-sm active:scale-95 transition-transform w-full md:w-auto"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            Shop All Wigs
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
