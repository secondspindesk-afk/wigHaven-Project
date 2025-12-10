import { Link } from 'react-router-dom';
import {
    Heart,
    Sparkles,
    Users,
    Award,
    Star,
    Truck,
    Shield,
    CheckCircle
} from 'lucide-react';

export default function About() {
    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Hero Section */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#00C3F7]/5 via-transparent to-transparent" />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block px-4 py-1 bg-[#00C3F7]/10 text-[#00C3F7] text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
                            Our Story
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-[0.15em] mb-6">
                            About WigHaven
                        </h1>
                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                            Ghana's premier destination for luxury wigs and hair extensions.
                            We believe every woman deserves to feel confident and beautiful.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="container mx-auto px-4 py-16 md:py-24 border-t border-[#27272a]">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-6">
                            Our Mission
                        </h2>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                            At WigHaven, we're dedicated to providing premium quality wigs and hair products
                            that empower women to express themselves confidently. Whether you're looking for
                            a natural everyday look or a bold statement piece, we have something special for you.
                        </p>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Founded with a passion for beauty and self-expression, we source the finest
                            human and synthetic hair from trusted suppliers worldwide to bring you
                            exceptional quality at accessible prices.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 text-center">
                            <Heart className="w-8 h-8 text-[#00C3F7] mx-auto mb-3" />
                            <h3 className="text-white font-bold text-sm uppercase mb-1">Quality First</h3>
                            <p className="text-zinc-500 text-xs">Premium materials only</p>
                        </div>
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 text-center">
                            <Users className="w-8 h-8 text-[#00C3F7] mx-auto mb-3" />
                            <h3 className="text-white font-bold text-sm uppercase mb-1">Customer Love</h3>
                            <p className="text-zinc-500 text-xs">5000+ happy customers</p>
                        </div>
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 text-center">
                            <Award className="w-8 h-8 text-[#00C3F7] mx-auto mb-3" />
                            <h3 className="text-white font-bold text-sm uppercase mb-1">Expert Curated</h3>
                            <p className="text-zinc-500 text-xs">Hand-selected styles</p>
                        </div>
                        <div className="bg-[#0A0A0A] border border-[#27272a] p-6 text-center">
                            <Sparkles className="w-8 h-8 text-[#00C3F7] mx-auto mb-3" />
                            <h3 className="text-white font-bold text-sm uppercase mb-1">Always Fresh</h3>
                            <p className="text-zinc-500 text-xs">New arrivals weekly</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="container mx-auto px-4 py-16 md:py-24 border-t border-[#27272a]">
                <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider text-center mb-12">
                    Why Choose WigHaven
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-[#00C3F7]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Truck className="w-8 h-8 text-[#00C3F7]" />
                        </div>
                        <h3 className="text-white font-bold uppercase tracking-wide mb-2">Fast Delivery</h3>
                        <p className="text-zinc-500 text-sm">
                            Nationwide delivery within 2-5 business days. Express options available for Accra.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-[#00C3F7]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-[#00C3F7]" />
                        </div>
                        <h3 className="text-white font-bold uppercase tracking-wide mb-2">Quality Guarantee</h3>
                        <p className="text-zinc-500 text-sm">
                            All products undergo strict quality checks. Not satisfied? We'll make it right.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-[#00C3F7]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star className="w-8 h-8 text-[#00C3F7]" />
                        </div>
                        <h3 className="text-white font-bold uppercase tracking-wide mb-2">Expert Support</h3>
                        <p className="text-zinc-500 text-sm">
                            Our beauty consultants are here to help you find your perfect style.
                        </p>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="bg-[#0A0A0A] border-y border-[#27272a]">
                <div className="container mx-auto px-4 py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="text-center">
                            <span className="text-3xl md:text-4xl font-bold text-[#00C3F7]">500+</span>
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Products</p>
                        </div>
                        <div className="text-center">
                            <span className="text-3xl md:text-4xl font-bold text-[#00C3F7]">5000+</span>
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Happy Customers</p>
                        </div>
                        <div className="text-center">
                            <span className="text-3xl md:text-4xl font-bold text-[#00C3F7]">4.9</span>
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Average Rating</p>
                        </div>
                        <div className="text-center">
                            <span className="text-3xl md:text-4xl font-bold text-[#00C3F7]">24/7</span>
                            <p className="text-zinc-500 text-xs uppercase tracking-wider mt-2">Support</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="container mx-auto px-4 py-16 md:py-24">
                <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider text-center mb-12">
                    Our Values
                </h2>
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-start gap-4 p-6 bg-[#0A0A0A] border border-[#27272a]">
                        <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-white font-bold uppercase mb-1">Authenticity</h3>
                            <p className="text-zinc-400 text-sm">
                                We only sell authentic, high-quality products. No counterfeits, no compromises.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-6 bg-[#0A0A0A] border border-[#27272a]">
                        <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-white font-bold uppercase mb-1">Inclusivity</h3>
                            <p className="text-zinc-400 text-sm">
                                Beauty comes in all forms. We offer styles for every taste, texture, and preference.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-6 bg-[#0A0A0A] border border-[#27272a]">
                        <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-white font-bold uppercase mb-1">Sustainability</h3>
                            <p className="text-zinc-400 text-sm">
                                We're committed to eco-friendly packaging and ethical sourcing practices.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-4 py-16 md:py-24 border-t border-[#27272a]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-wider mb-4">
                        Ready to Transform Your Look?
                    </h2>
                    <p className="text-zinc-500 text-sm mb-8">
                        Join thousands of satisfied customers who trust WigHaven for their beauty needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/shop"
                            className="bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-zinc-200 transition-colors"
                        >
                            Shop Now
                        </Link>
                        <Link
                            to="/contact"
                            className="bg-transparent border border-white text-white font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-white hover:text-black transition-colors"
                        >
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
