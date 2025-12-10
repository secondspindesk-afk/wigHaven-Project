import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    MessageSquare,
    Loader2,
    CheckCircle,
    Instagram,
    Facebook,
    Twitter,
    ExternalLink
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { usePublicSettings } from '@/lib/hooks/useSettings';
import { useCreateTicket, useCreateGuestTicket } from '@/lib/hooks/useSupport';
import { useUser } from '@/lib/hooks/useUser';

export default function Contact() {
    const { showToast } = useToast();
    const { data: settings } = usePublicSettings();
    const { data: user } = useUser();
    const createTicketMutation = useCreateTicket();
    const createGuestTicketMutation = useCreateGuestTicket();

    // Form state for logged-in users
    const [authFormData, setAuthFormData] = useState({
        subject: '',
        message: ''
    });

    // Form state for guests
    const [guestFormData, setGuestFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [submitted, setSubmitted] = useState(false);

    // Handle authenticated user form submission
    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!authFormData.subject || !authFormData.message) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            await createTicketMutation.mutateAsync({
                subject: authFormData.subject,
                message: authFormData.message,
                priority: 'medium'
            });
            setSubmitted(true);
            setAuthFormData({ subject: '', message: '' });
        } catch (error: any) {
            showToast(error.message || 'Failed to send message', 'error');
        }
    };

    // Handle guest form submission
    const handleGuestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!guestFormData.name || !guestFormData.email || !guestFormData.subject || !guestFormData.message) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            await createGuestTicketMutation.mutateAsync({
                name: guestFormData.name,
                email: guestFormData.email,
                subject: guestFormData.subject,
                message: guestFormData.message,
                priority: 'medium'
            });
            setSubmitted(true);
            setGuestFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error: any) {
            showToast(error.message || 'Failed to send message', 'error');
        }
    };

    const contactInfo = [
        {
            icon: Mail,
            label: 'Email',
            value: settings?.supportEmail || 'support@wighaven.com',
            href: `mailto:${settings?.supportEmail || 'support@wighaven.com'}`,
            description: 'Send us an email anytime'
        },
        {
            icon: Phone,
            label: 'Phone',
            value: settings?.supportPhone || '+233 XX XXX XXXX',
            href: `tel:${settings?.supportPhone?.replace(/\s/g, '') || '+233000000000'}`,
            description: 'Mon-Sat, 9AM-6PM'
        },
        {
            icon: MapPin,
            label: 'Address',
            value: settings?.businessAddress || 'Accra, Ghana',
            href: null,
            description: 'Visit our store'
        },
        {
            icon: Clock,
            label: 'Business Hours',
            value: 'Mon - Sat: 9AM - 6PM',
            href: null,
            description: 'Closed on Sundays'
        }
    ];

    const socialLinks = [
        { icon: Instagram, href: settings?.socialLinks?.instagram || '#', label: 'Instagram' },
        { icon: Facebook, href: settings?.socialLinks?.facebook || '#', label: 'Facebook' },
        { icon: Twitter, href: settings?.socialLinks?.twitter || '#', label: 'Twitter' }
    ];

    const isPending = user ? createTicketMutation.isPending : createGuestTicketMutation.isPending;

    return (
        <div className="min-h-screen bg-[#050505]">
            {/* Hero Section */}
            <section className="relative py-20 md:py-28 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#00C3F7]/5 via-transparent to-transparent" />
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-2xl mx-auto text-center">
                        <span className="inline-block px-4 py-1 bg-[#00C3F7]/10 text-[#00C3F7] text-[10px] font-bold uppercase tracking-widest rounded-full mb-6">
                            Get in Touch
                        </span>
                        <h1 className="text-3xl md:text-5xl font-bold text-white uppercase tracking-[0.15em] mb-6">
                            Contact Us
                        </h1>
                        <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                            Have questions, feedback, or need help? We're here for you.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Content */}
            <section className="container mx-auto px-4 py-16 md:py-24 border-t border-[#27272a]">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                    {/* Contact Info */}
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-8">
                            Contact Information
                        </h2>

                        <div className="space-y-4 mb-12">
                            {contactInfo.map((item, index) => (
                                <div key={index} className="flex items-start gap-4 p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-[#00C3F7]/30 transition-colors">
                                    <div className="w-12 h-12 bg-[#00C3F7]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-5 h-5 text-[#00C3F7]" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                                            {item.label}
                                        </p>
                                        {item.href ? (
                                            <a
                                                href={item.href}
                                                className="text-white font-medium hover:text-[#00C3F7] transition-colors flex items-center gap-2"
                                            >
                                                {item.value}
                                                <ExternalLink className="w-3 h-3 opacity-50" />
                                            </a>
                                        ) : (
                                            <p className="text-white font-medium">{item.value}</p>
                                        )}
                                        <p className="text-zinc-500 text-xs mt-1">{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Social Links */}
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                                Follow Us
                            </h3>
                            <div className="flex gap-3">
                                {socialLinks.map((social, index) => (
                                    <a
                                        key={index}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-12 h-12 bg-[#0A0A0A] border border-[#27272a] rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#00C3F7] hover:border-[#00C3F7]/50 transition-all"
                                        aria-label={social.label}
                                    >
                                        <social.icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wider mb-8">
                            Send a Message
                        </h2>

                        {submitted ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-8 text-center">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-white font-bold text-lg mb-2">Message Sent!</h3>
                                <p className="text-zinc-400 text-sm mb-6">
                                    Thank you for reaching out. We'll get back to you within 24 hours
                                    {user ? '. You can track your ticket in your account.' : ' via email.'}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="text-[#00C3F7] text-xs font-bold uppercase tracking-wider hover:underline"
                                    >
                                        Send Another Message
                                    </button>
                                    {user && (
                                        <Link
                                            to="/account/support"
                                            className="text-zinc-400 text-xs font-bold uppercase tracking-wider hover:text-white"
                                        >
                                            View My Tickets →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : user ? (
                            /* LOGGED IN USER FORM */
                            <form onSubmit={handleAuthSubmit} className="space-y-6">
                                <div className="p-4 bg-[#00C3F7]/5 border border-[#00C3F7]/20 rounded mb-6">
                                    <p className="text-[#00C3F7] text-xs flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4" />
                                        <span><span className="font-bold">Logged in as:</span> {user.email}</span>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={authFormData.subject}
                                        onChange={(e) => setAuthFormData({ ...authFormData, subject: e.target.value })}
                                        className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 transition-colors"
                                        placeholder="What can we help you with?"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        value={authFormData.message}
                                        onChange={(e) => setAuthFormData({ ...authFormData, message: e.target.value })}
                                        rows={6}
                                        className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 transition-colors resize-none"
                                        placeholder="Describe your issue or question in detail..."
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            /* GUEST USER FORM */
                            <form onSubmit={handleGuestSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                                            Your Name
                                        </label>
                                        <input
                                            type="text"
                                            value={guestFormData.name}
                                            onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })}
                                            className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 transition-colors"
                                            placeholder="Jane Doe"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={guestFormData.email}
                                            onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })}
                                            className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 transition-colors"
                                            placeholder="jane@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                                        Subject
                                    </label>
                                    <input
                                        type="text"
                                        value={guestFormData.subject}
                                        onChange={(e) => setGuestFormData({ ...guestFormData, subject: e.target.value })}
                                        className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 transition-colors"
                                        placeholder="What can we help you with?"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        value={guestFormData.message}
                                        onChange={(e) => setGuestFormData({ ...guestFormData, message: e.target.value })}
                                        rows={6}
                                        className="w-full bg-[#0A0A0A] border border-[#27272a] px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 transition-colors resize-none"
                                        placeholder="Describe your issue or question in detail..."
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest px-8 py-4 hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send Message
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-zinc-600 text-xs">
                                    Have an account?{' '}
                                    <Link to="/login" className="text-[#00C3F7] hover:underline">
                                        Login
                                    </Link>{' '}
                                    to track your support tickets.
                                </p>
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
                        <p className="text-zinc-500 text-xs uppercase tracking-wider">
                            {settings?.businessAddress || 'Accra, Ghana'}
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
