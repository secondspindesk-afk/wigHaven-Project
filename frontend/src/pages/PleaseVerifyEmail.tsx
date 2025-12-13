import { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';
import AuthHeader from '@/components/ui/AuthHeader';
import { motion } from 'framer-motion';

export default function PleaseVerifyEmail() {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || 'your email';
    const [isResending, setIsResending] = useState(false);
    const [justResent, setJustResent] = useState(false);
    const { showToast } = useToast();

    const handleResend = async () => {
        setIsResending(true);
        try {
            const response = await authService.resendVerificationEmail(email);

            // Check if user is already verified - redirect to login
            if ((response as any).alreadyVerified) {
                showToast('Your email is already verified! Redirecting to login...', 'success');
                setTimeout(() => navigate('/login'), 1500);
                return;
            }

            showToast('Verification link sent!', 'success');
            setJustResent(true);
            setTimeout(() => setJustResent(false), 5000);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to resend link';
            showToast(errorMessage, 'error');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-[#050505]">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            {/* CONTAINER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[400px] backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl text-center"
            >
                <AuthHeader title="Verify Email" subtitle="CHECK YOUR INBOX" />

                <div className="mt-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                        <Mail className="w-8 h-8 text-white relative z-10" />
                    </div>

                    <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-3">
                        Almost There!
                    </h3>

                    <p className="text-zinc-400 text-xs leading-relaxed font-mono mb-2">
                        We've sent a verification link to:
                    </p>
                    <p className="text-white text-sm font-mono mb-6 break-all px-4">
                        {email}
                    </p>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6 w-full">
                        <p className="text-zinc-400 text-xs leading-relaxed font-mono">
                            Click the link in the email to verify your account. You'll be able to login once verified.
                        </p>
                    </div>

                    {justResent && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4 w-full flex items-center gap-2 justify-center"
                        >
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 text-xs font-mono">Email sent!</span>
                        </motion.div>
                    )}

                    <button
                        onClick={handleResend}
                        disabled={isResending || justResent}
                        className="text-xs text-zinc-500 hover:text-white transition-colors font-mono underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                    >
                        {isResending ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Sending...
                            </span>
                        ) : justResent ? (
                            'Link sent!'
                        ) : (
                            'Didn\'t receive it? Resend verification link'
                        )}
                    </button>

                    <div className="pt-4 border-t border-white/5 w-full">
                        <Link
                            to="/login"
                            className="text-xs text-zinc-500 hover:text-white transition-colors font-mono"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
