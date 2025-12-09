import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useVerifyEmail } from '@/lib/hooks/useVerifyEmail';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import AuthHeader from '@/components/ui/AuthHeader';
import { motion } from 'framer-motion';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const verifyEmailMutation = useVerifyEmail();
    const [resendEmail, setResendEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        // Only verify if we have a token and haven't already verified or attempted
        if (token && !verifyEmailMutation.isSuccess && !verifyEmailMutation.isPending && !verifyEmailMutation.isError) {
            verifyEmailMutation.mutate(token);
        }
    }, [token]); // Don't add mutation to deps - we check status instead

    const handleResendVerification = async () => {
        if (!resendEmail || !resendEmail.includes('@')) {
            showToast('Please enter a valid email address', 'error');
            return;
        }
        setIsResending(true);
        try {
            await authService.resendVerificationEmail(resendEmail);
            showToast('Verification email sent! Check your inbox.', 'success');
            setResendEmail('');
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to resend email', 'error');
        } finally {
            setIsResending(false);
        }
    };

    const isLoading = verifyEmailMutation.isPending;
    const isSuccess = verifyEmailMutation.isSuccess;
    const isError = verifyEmailMutation.isError;

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
                <AuthHeader title="System Access" subtitle="VERIFYING IDENTITY" />

                <div className="mt-8 flex flex-col items-center justify-center min-h-[200px]">
                    {/* Loading State */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                                <Loader2 className="w-16 h-16 text-white animate-spin relative z-10" />
                            </div>
                            <h3 className="mt-6 text-lg font-bold text-white uppercase tracking-widest">Verifying...</h3>
                            <p className="mt-2 text-xs text-zinc-400 font-mono">Validating your security token</p>
                        </motion.div>
                    )}

                    {/* Success State */}
                    {isSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                                <CheckCircle2 className="w-16 h-16 text-green-400 relative z-10" />
                            </div>
                            <h3 className="mt-6 text-lg font-bold text-white uppercase tracking-widest">Access Granted</h3>
                            <p className="mt-2 text-xs text-zinc-400 font-mono">Your email has been successfully verified.</p>

                            <Link
                                to="/login"
                                className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-zinc-200 transition-all mt-8 flex items-center justify-center gap-2 group"
                            >
                                <span>Proceed to Login</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    )}

                    {/* Error State */}
                    {isError && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center w-full"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                                <XCircle className="w-16 h-16 text-red-400 relative z-10" />
                            </div>
                            <h3 className="mt-6 text-lg font-bold text-white uppercase tracking-widest">Verification Failed</h3>
                            <p className="mt-2 text-xs text-zinc-400 font-mono max-w-[250px]">
                                The security token is invalid or has expired.
                            </p>

                            <div className="w-full space-y-3 mt-8">
                                {/* Resend Email Form */}
                                <div className="space-y-2">
                                    <p className="text-[10px] text-zinc-500 font-mono">Enter your email to resend verification:</p>
                                    <input
                                        type="email"
                                        value={resendEmail}
                                        onChange={(e) => setResendEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full bg-black/40 border border-white/10 text-sm text-white rounded-lg px-4 py-3 outline-none focus:border-white/30 placeholder:text-zinc-700 font-mono"
                                    />
                                    <button
                                        onClick={handleResendVerification}
                                        disabled={isResending || !resendEmail}
                                        className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-3 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isResending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Resend Verification Email'
                                        )}
                                    </button>
                                </div>

                                <Link
                                    to="/login"
                                    className="w-full bg-white/10 text-white border border-white/10 font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-white/20 transition-all text-center block"
                                >
                                    Return to Login
                                </Link>
                            </div>
                        </motion.div>
                    )}

                    {/* No Token State */}
                    {!token && !isLoading && !isSuccess && !isError && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center"
                        >
                            <XCircle className="w-16 h-16 text-zinc-600 mb-6" />
                            <h3 className="text-lg font-bold text-white uppercase tracking-widest">Invalid Link</h3>
                            <p className="mt-2 text-xs text-zinc-500 font-mono">No verification token found.</p>
                            <Link
                                to="/login"
                                className="mt-6 text-xs text-white underline underline-offset-4 hover:text-zinc-300 font-mono"
                            >
                                Return to Login
                            </Link>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
