import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, CheckCircle, Instagram, Facebook, Twitter, ExternalLink } from 'lucide-react';
import BrandedSpinner from '@/components/ui/BrandedSpinner';
import { useToast } from '@/contexts/ToastContext';
import { usePublicSettings } from '@/lib/hooks/useSettings';
import { useCreateTicket, useCreateGuestTicket } from '@/lib/hooks/useSupport';
import { useUser } from '@/lib/hooks/useUser';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function Contact() {
    const { showToast } = useToast();
    const { data: settings } = usePublicSettings();
    const { data: user } = useUser();
    const createTicketMutation = useCreateTicket();
    const createGuestTicketMutation = useCreateGuestTicket();
    const isMobile = useIsMobile();

    const [authFormData, setAuthFormData] = useState({ subject: '', message: '' });
    const [guestFormData, setGuestFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authFormData.subject || !authFormData.message) { showToast('Please fill in all fields', 'error'); return; }
        try { await createTicketMutation.mutateAsync({ subject: authFormData.subject, message: authFormData.message, priority: 'medium' }); setSubmitted(true); setAuthFormData({ subject: '', message: '' }); } catch (error: any) { showToast(error.message || 'Failed to send message', 'error'); }
    };

    const handleGuestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestFormData.name || !guestFormData.email || !guestFormData.subject || !guestFormData.message) { showToast('Please fill in all fields', 'error'); return; }
        try { await createGuestTicketMutation.mutateAsync({ name: guestFormData.name, email: guestFormData.email, subject: guestFormData.subject, message: guestFormData.message, priority: 'medium' }); setSubmitted(true); setGuestFormData({ name: '', email: '', subject: '', message: '' }); } catch (error: any) { showToast(error.message || 'Failed to send message', 'error'); }
    };

    const contactInfo = [
        { icon: Mail, label: 'Email', value: settings?.supportEmail || 'support@wighaven.com', href: `mailto:${settings?.supportEmail || 'support@wighaven.com'}`, desc: 'Send us an email anytime' },
        { icon: Phone, label: 'Phone', value: settings?.supportPhone || '+233 XX XXX XXXX', href: `tel:${settings?.supportPhone?.replace(/\s/g, '') || '+233000000000'}`, desc: 'Mon-Sat, 9AM-6PM' },
        { icon: MapPin, label: 'Address', value: settings?.businessAddress || 'Accra, Ghana', href: null, desc: 'Visit our store' },
        { icon: Clock, label: 'Hours', value: 'Mon - Sat: 9AM - 6PM', href: null, desc: 'Closed on Sundays' }
    ];

    const socialLinks = [
        { icon: Instagram, href: settings?.socialLinks?.instagram || '#', label: 'Instagram' },
        { icon: Facebook, href: settings?.socialLinks?.facebook || '#', label: 'Facebook' },
        { icon: Twitter, href: settings?.socialLinks?.twitter || '#', label: 'Twitter' }
    ];

    const isPending = user ? createTicketMutation.isPending : createGuestTicketMutation.isPending;

    // ==================== MOBILE ====================
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505] pb-20">
                {/* Hero */}
                <section className="px-4 pt-8 pb-10 text-center">
                    <span className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase tracking-widest rounded-full mb-4">Get in Touch</span>
                    <h1 className="text-2xl font-bold text-white mb-3">Contact Us</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed">Have questions or need help? We're here for you.</p>
                </section>

                {/* Contact Cards */}
                <section className="px-4 space-y-3">
                    {contactInfo.map((item, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <item.icon className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{item.label}</p>
                                {item.href ? (
                                    <a href={item.href} className="text-white text-sm font-medium flex items-center gap-1">{item.value}<ExternalLink className="w-3 h-3 text-zinc-500" /></a>
                                ) : (
                                    <p className="text-white text-sm font-medium">{item.value}</p>
                                )}
                                <p className="text-zinc-500 text-[10px] mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Social Links */}
                <section className="px-4 py-6">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3">Follow Us</p>
                    <div className="flex gap-3">
                        {socialLinks.map((s, i) => (
                            <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-zinc-900/50 border border-zinc-800/50 rounded-xl flex items-center justify-center text-zinc-400" aria-label={s.label}>
                                <s.icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </section>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 mx-4" />

                {/* Contact Form */}
                <section className="px-4 py-6">
                    <h2 className="text-lg font-bold text-white mb-4">Send a Message</h2>

                    {submitted ? (
                        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                            <h3 className="text-white font-bold mb-2">Message Sent!</h3>
                            <p className="text-zinc-400 text-sm mb-4">We'll get back to you within 24 hours{user ? '. Track in your account.' : ' via email.'}</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => setSubmitted(false)} className="text-cyan-400 text-xs font-bold uppercase">Send Another</button>
                                {user && <Link to="/account/support" className="text-zinc-500 text-xs">View Tickets →</Link>}
                            </div>
                        </div>
                    ) : user ? (
                        <form onSubmit={handleAuthSubmit} className="space-y-4">
                            <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                                <p className="text-cyan-400 text-xs truncate"><span className="font-bold">Logged in:</span> {user.email}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2">Subject</label>
                                <input type="text" value={authFormData.subject} onChange={(e) => setAuthFormData({ ...authFormData, subject: e.target.value })} className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white text-sm" placeholder="What can we help with?" required />
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2">Message</label>
                                <textarea value={authFormData.message} onChange={(e) => setAuthFormData({ ...authFormData, message: e.target.value })} rows={5} className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white text-sm resize-none" placeholder="Describe your issue..." required />
                            </div>
                            <button type="submit" disabled={isPending} className="w-full py-3.5 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                {isPending ? <><BrandedSpinner size="xs" />Sending...</> : <><Send className="w-4 h-4" />Send Message</>}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleGuestSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2">Name</label>
                                    <input type="text" value={guestFormData.name} onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })} className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white text-sm" placeholder="Jane" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2">Email</label>
                                    <input type="email" value={guestFormData.email} onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })} className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white text-sm" placeholder="email" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2">Subject</label>
                                <input type="text" value={guestFormData.subject} onChange={(e) => setGuestFormData({ ...guestFormData, subject: e.target.value })} className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white text-sm" placeholder="What can we help with?" required />
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-2">Message</label>
                                <textarea value={guestFormData.message} onChange={(e) => setGuestFormData({ ...guestFormData, message: e.target.value })} rows={5} className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white text-sm resize-none" placeholder="Describe your issue..." required />
                            </div>
                            <button type="submit" disabled={isPending} className="w-full py-3.5 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                                {isPending ? <><BrandedSpinner size="xs" />Sending...</> : <><Send className="w-4 h-4" />Send Message</>}
                            </button>
                            <p className="text-center text-zinc-600 text-xs">Have an account? <Link to="/login" className="text-cyan-400">Login</Link> to track tickets.</p>
                        </form>
                    )}
                </section>

                {/* Map placeholder */}
                <section className="mx-4 p-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-center">
                    <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500 text-xs">{settings?.businessAddress || 'Accra, Ghana'}</p>
                </section>
            </div>
        );
    }

    // ==================== DESKTOP ====================
    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Hero Section */}
            <section className="relative py-28 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
                <div className="absolute inset-0" style={{ backgroundSize: '40px 40px', backgroundImage: 'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)', opacity: 0.3 }} />
                <div className="container mx-auto px-8 relative z-10">
                    <div className="max-w-2xl mx-auto text-center">
                        <span className="inline-block px-4 py-1.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">Get in Touch</span>
                        <h1 className="text-5xl font-bold text-white uppercase tracking-[0.15em] mb-6">Contact Us</h1>
                        <p className="text-zinc-400 leading-relaxed">Have questions, feedback, or need help? We're here for you.</p>
                    </div>
                </div>
            </section>

            {/* Contact Content */}
            <section className="container mx-auto px-8 py-24 border-t border-[#27272a]">
                <div className="grid lg:grid-cols-2 gap-16">
                    {/* Contact Info */}
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-8">Contact Information</h2>
                        <div className="space-y-4 mb-12">
                            {contactInfo.map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 bg-[#0A0A0A] border border-[#27272a] hover:border-cyan-500/30 transition-colors">
                                    <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-5 h-5 text-cyan-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{item.label}</p>
                                        {item.href ? (
                                            <a href={item.href} className="text-white font-medium hover:text-cyan-400 transition-colors flex items-center gap-2">{item.value}<ExternalLink className="w-3 h-3 opacity-50" /></a>
                                        ) : (
                                            <p className="text-white font-medium">{item.value}</p>
                                        )}
                                        <p className="text-zinc-500 text-xs mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Follow Us</h3>
                            <div className="flex gap-3">
                                {socialLinks.map((s, i) => (
                                    <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-[#0A0A0A] border border-[#27272a] rounded-lg flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all" aria-label={s.label}>
                                        <s.icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-8">Send a Message</h2>
                        {submitted ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-10 text-center">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-white font-bold text-lg mb-2">Message Sent!</h3>
                                <p className="text-zinc-400 text-sm mb-6">Thank you for reaching out. We'll get back to you within 24 hours{user ? '. You can track your ticket in your account.' : ' via email.'}</p>
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => setSubmitted(false)} className="text-cyan-400 text-xs font-bold uppercase tracking-wider hover:underline">Send Another Message</button>
                                    {user && <Link to="/account/support" className="text-zinc-400 text-xs font-bold uppercase tracking-wider hover:text-white">View My Tickets →</Link>}
                                </div>
                            </div>
                        ) : user ? (
                            <form onSubmit={handleAuthSubmit} className="space-y-6">
                                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                                    <p className="text-cyan-400 text-xs"><span className="font-bold">Logged in as:</span> {user.email}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Subject</label>
                                    <input type="text" value={authFormData.subject} onChange={(e) => setAuthFormData({ ...authFormData, subject: e.target.value })} className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors" placeholder="What can we help you with?" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Message</label>
                                    <textarea value={authFormData.message} onChange={(e) => setAuthFormData({ ...authFormData, message: e.target.value })} rows={6} className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" placeholder="Describe your issue or question in detail..." required />
                                </div>
                                <button type="submit" disabled={isPending} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isPending ? <><BrandedSpinner size="xs" />Sending...</> : <><Send className="w-4 h-4" />Send Message</>}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleGuestSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Your Name</label>
                                        <input type="text" value={guestFormData.name} onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })} className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors" placeholder="Jane Doe" required />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Email Address</label>
                                        <input type="email" value={guestFormData.email} onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })} className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors" placeholder="jane@example.com" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Subject</label>
                                    <input type="text" value={guestFormData.subject} onChange={(e) => setGuestFormData({ ...guestFormData, subject: e.target.value })} className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors" placeholder="What can we help you with?" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Message</label>
                                    <textarea value={guestFormData.message} onChange={(e) => setGuestFormData({ ...guestFormData, message: e.target.value })} rows={6} className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" placeholder="Describe your issue or question in detail..." required />
                                </div>
                                <button type="submit" disabled={isPending} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isPending ? <><BrandedSpinner size="xs" />Sending...</> : <><Send className="w-4 h-4" />Send Message</>}
                                </button>
                                <p className="text-center text-zinc-600 text-xs">Have an account? <Link to="/login" className="text-cyan-400 hover:underline">Login</Link> to track your support tickets.</p>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="border-t border-[#27272a]">
                <div className="h-64 bg-[#0A0A0A] flex items-center justify-center">
                    <div className="text-center">
                        <MapPin className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="text-zinc-500 text-xs uppercase tracking-wider">{settings?.businessAddress || 'Accra, Ghana'}</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
