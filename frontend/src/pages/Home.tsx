import HeroSlider from '@/components/home/HeroSlider';
import FeaturedCategories from '@/components/home/FeaturedCategories';
import NewArrivals from '@/components/home/NewArrivals';
import BestSellers from '@/components/home/BestSellers';
import { Link } from 'react-router-dom';
import { ShoppingBag, Crown } from 'lucide-react';

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
        </div >
    );
}
