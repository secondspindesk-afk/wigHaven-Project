import HeroSlider from '@/components/home/HeroSlider';
import FeaturedCategories from '@/components/home/FeaturedCategories';
import NewArrivals from '@/components/home/NewArrivals';
import BestSellers from '@/components/home/BestSellers';
import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Hero Section */}
            <section className="container mx-auto px-4 py-8 md:py-12">
                <HeroSlider />
            </section>

            {/* Featured Categories */}
            <section className="container mx-auto px-4 py-12 md:py-16">
                <FeaturedCategories />
            </section>

            {/* New Arrivals */}
            <section className="container mx-auto px-4 py-12 md:py-16 border-t border-[#27272a]">
                <NewArrivals />
            </section>

            {/* Best Sellers */}
            <section className="container mx-auto px-4 py-12 md:py-16 border-t border-[#27272a]">
                <BestSellers />
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-16 md:py-24 border-t border-[#27272a]">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-[0.2em] mb-4">
                        Explore Our Full Collection
                    </h2>
                    <p className="text-zinc-500 text-sm font-mono uppercase mb-8">
                        Discover hundreds of beautiful styles
                    </p>
                    <Link
                        to="/shop"
                        className="inline-block bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-sm hover:bg-zinc-200 transition-colors"
                    >
                        Shop All Wigs
                    </Link>
                </div>
            </section>
        </div>
    );
}

