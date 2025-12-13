import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authService } from '@/lib/api/auth';
import { ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react';
import BrandedSpinner from '@/components/ui/BrandedSpinner';
import AuthHeader from '@/components/ui/AuthHeader';
import { motion } from 'framer-motion';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setIsLoading(true);
        try {
            await authService.requestPasswordReset(data.email);
            setIsSubmitted(true);
        } catch (error: any) {
            console.error('Password reset request failed:', error);
            // UX-First: Show the actual error message
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to send reset link';

            setError('email', { type: 'manual', message: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-[#050505]">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            {/* CONTAINER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[400px] backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl"
            >
                <AuthHeader title="Recovery" subtitle="RESET SECURITY KEY" />

                {!isSubmitted ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8"
                    >
                        <p className="text-zinc-400 text-xs mb-8 leading-relaxed font-mono text-center">
                            Enter your identity and we'll send you instructions to reset your security key.
                        </p>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                    Identity
                                </label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        id="email"
                                        {...register('email')}
                                        placeholder="user@wighaven.com"
                                        className={`w-full bg-black/40 border ${errors.email ? 'border-red-500/50' : 'border-white/10'
                                            } text-sm text-white rounded-lg px-4 py-3.5 outline-none focus:border-white/30 focus:bg-black/60 transition-all placeholder:text-zinc-700 font-mono`}
                                    />
                                </div>
                                {errors.email && <p className="text-xs text-red-400 ml-1">{errors.email.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-zinc-200 transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? (
                                    <>
                                        <BrandedSpinner size="xs" />
                                        <span>Sending Link...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send Reset Link</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-8 bg-white/5 border border-white/10 rounded-xl p-8 text-center"
                    >
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                            <CheckCircle2 className="w-8 h-8 text-green-400 relative z-10" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-3 uppercase tracking-widest">Link Sent</h3>
                        <p className="text-zinc-400 text-xs leading-relaxed font-mono">
                            Check your inbox for instructions to reset your security key.
                        </p>
                    </motion.div>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors font-mono group"
                    >
                        <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                        BACK TO LOGIN
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
