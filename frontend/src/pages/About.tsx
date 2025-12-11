import { Link } from 'react-router-dom';
import { Heart, Sparkles, Users, Award, Star, Truck, Shield, CheckCircle } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function About() {
    const isMobile = useIsMobile();

    const stats = [
        { value: '500+', label: 'Products' },
        { value: '5000+', label: 'Happy Customers' },
        { value: '4.9', label: 'Average Rating' },
        { value: '24/7', label: 'Support' }
    ];

    const values = [
        { icon: Heart, title: 'Quality First', desc: 'Premium materials only' },
        { icon: Users, title: 'Customer Love', desc: '5000+ happy customers' },
        { icon: Award, title: 'Expert Curated', desc: 'Hand-selected styles' },
        { icon: Sparkles, title: 'Always Fresh', desc: 'New arrivals weekly' }
    ];

    const features = [
        { icon: Truck, title: 'Fast Delivery', desc: 'Nationwide delivery within 2-5 business days. Express options available for Accra.' },
        { icon: Shield, title: 'Quality Guarantee', desc: "All products undergo strict quality checks. Not satisfied? We'll make it right." },
        { icon: Star, title: 'Expert Support', desc: 'Our beauty consultants are here to help you find your perfect style.' }
    ];

    const coreValues = [
        { title: 'Authenticity', desc: 'We only sell authentic, high-quality products. No counterfeits, no compromises.' },
        { title: 'Inclusivity', desc: 'Beauty comes in all forms. We offer styles for every taste, texture, and preference.' },
        { title: 'Sustainability', desc: "We're committed to eco-friendly packaging and ethical sourcing practices." }
    ];

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505] pb-20">
                {/* Hero */}
                <section className="px-4 pt-8 pb-10 text-center">
                    <span className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase tracking-widest rounded-full mb-4">Our Story</span>
                    <h1 className="text-2xl font-bold text-white mb-3">About WigHaven</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed">Ghana's premier destination for luxury wigs and hair extensions.</p>
                </section>

                {/* Stats Strip */}
                <section className="px-4 py-6 bg-zinc-900/50 border-y border-zinc-800/50">
                    <div className="grid grid-cols-4 gap-2">
                        {stats.map((s, i) => (
                            <div key={i} className="text-center">
                                <p className="text-lg font-bold text-cyan-400">{s.value}</p>
                                <p className="text-[8px] text-zinc-500 uppercase">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Mission */}
                <section className="px-4 py-8">
                    <h2 className="text-lg font-bold text-white mb-4">Our Mission</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">At WigHaven, we're dedicated to providing premium quality wigs and hair products that empower women to express themselves confidently.</p>
                    <p className="text-zinc-500 text-sm leading-relaxed">Founded with a passion for beauty and self-expression, we source the finest human and synthetic hair from trusted suppliers worldwide.</p>
                </section>

                {/* Values Grid */}
                <section className="px-4 pb-8">
                    <div className="grid grid-cols-2 gap-3">
                        {values.map((v, i) => (
                            <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-center">
                                <v.icon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                                <h3 className="text-white text-xs font-bold uppercase mb-1">{v.title}</h3>
                                <p className="text-zinc-500 text-[10px]">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 mx-4" />

                {/* Why Choose Us */}
                <section className="px-4 py-8">
                    <h2 className="text-lg font-bold text-white text-center mb-6">Why Choose Us</h2>
                    <div className="space-y-4">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                                <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0">
                                    <f.icon className="w-5 h-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-white text-sm font-bold mb-1">{f.title}</h3>
                                    <p className="text-zinc-500 text-xs">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 mx-4" />

                {/* Core Values */}
                <section className="px-4 py-8">
                    <h2 className="text-lg font-bold text-white text-center mb-6">Our Values</h2>
                    <div className="space-y-3">
                        {coreValues.map((v, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-white text-sm font-bold mb-1">{v.title}</h3>
                                    <p className="text-zinc-500 text-xs">{v.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="px-4 pt-4 pb-8">
                    <div className="p-6 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-2xl text-center">
                        <h2 className="text-lg font-bold text-white mb-2">Ready to Transform?</h2>
                        <p className="text-zinc-400 text-sm mb-4">Join thousands of satisfied customers.</p>
                        <div className="flex gap-3">
                            <Link to="/shop" className="flex-1 py-3 bg-white text-black text-xs font-bold uppercase rounded-xl">Shop Now</Link>
                            <Link to="/contact" className="flex-1 py-3 border border-white text-white text-xs font-bold uppercase rounded-xl">Contact</Link>
                        </div>
                    </div>
                </section>
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Hero Section */}
            <section className="relative py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
                <div className="absolute inset-0" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)', opacity: 0.3 }} />
                <div className="container mx-auto px-8 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <span className="inline-block px-4 py-1.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Our Story</span>
                        <h1 className="text-5xl font-bold text-white uppercase tracking-[0.15em] mb-6">About WigHaven</h1>
                        <p className="text-zinc-400 leading-relaxed">Ghana's premier destination for luxury wigs and hair extensions. We believe every woman deserves to feel confident and beautiful.</p>
                    </div>
                </div>
            </section>

            {/* Stats Strip */}
            <section className="bg-[#0A0A0A] border-y border-[#27272a]">
                <div className="container mx-auto px-8 py-12">
                    <div className="grid grid-cols-4 gap-8">
                        {stats.map((s, i) => (
                            <div key={i} className="text-center">
                                <p className="text-4xl font-bold text-cyan-400 font-mono">{s.value}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="container mx-auto px-8 py-24 border-b border-[#27272a]">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-6">Our Mission</h2>
                        <p className="text-zinc-400 leading-relaxed mb-6">At WigHaven, we're dedicated to providing premium quality wigs and hair products that empower women to express themselves confidently. Whether you're looking for a natural everyday look or a bold statement piece, we have something special for you.</p>
                        <p className="text-zinc-500 leading-relaxed">Founded with a passion for beauty and self-expression, we source the finest human and synthetic hair from trusted suppliers worldwide to bring you exceptional quality at accessible prices.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {values.map((v, i) => (
                            <div key={i} className="bg-[#0A0A0A] border border-[#27272a] p-6 text-center hover:border-zinc-600 transition-colors">
                                <v.icon className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                                <h3 className="text-white font-bold text-sm uppercase mb-1">{v.title}</h3>
                                <p className="text-zinc-500 text-xs">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Choose Us */}
            <section className="container mx-auto px-8 py-24 border-b border-[#27272a]">
                <h2 className="text-3xl font-bold text-white uppercase tracking-wider text-center mb-16">Why Choose WigHaven</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="text-center group">
                            <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-cyan-500/20 transition-colors">
                                <f.icon className="w-7 h-7 text-cyan-400" />
                            </div>
                            <h3 className="text-white font-bold uppercase tracking-wide mb-3">{f.title}</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Values Section */}
            <section className="container mx-auto px-8 py-24 border-b border-[#27272a]">
                <h2 className="text-3xl font-bold text-white uppercase tracking-wider text-center mb-16">Our Values</h2>
                <div className="max-w-3xl mx-auto space-y-4">
                    {coreValues.map((v, i) => (
                        <div key={i} className="flex items-start gap-4 p-6 bg-[#0A0A0A] border border-[#27272a] hover:border-emerald-500/30 transition-colors">
                            <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-bold uppercase mb-2">{v.title}</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">{v.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="container mx-auto px-8 py-24">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-4">Ready to Transform Your Look?</h2>
                    <p className="text-zinc-500 mb-10">Join thousands of satisfied customers who trust WigHaven for their beauty needs.</p>
                    <div className="flex gap-4 justify-center">
                        <Link to="/shop" className="bg-white text-black font-bold text-xs uppercase tracking-widest px-10 py-4 hover:bg-zinc-200 transition-colors">Shop Now</Link>
                        <Link to="/contact" className="bg-transparent border border-white text-white font-bold text-xs uppercase tracking-widest px-10 py-4 hover:bg-white hover:text-black transition-colors">Contact Us</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
