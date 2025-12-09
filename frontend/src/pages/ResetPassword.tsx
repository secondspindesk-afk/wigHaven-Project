import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import AuthHeader from '@/components/ui/AuthHeader';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { authService } from '@/lib/api/auth';
import { useToast } from '@/contexts/ToastContext';
import { motion } from 'framer-motion';

const resetPasswordSchema = z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const { showToast } = useToast();

    const token = searchParams.get('token');

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) return;

        setIsLoading(true);
        try {
            await authService.confirmPasswordReset(token, data.password);
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error: any) {
            console.error('Reset password failed:', error);
            // Ideally show error to user
            showToast(error.response?.data?.message || 'Failed to reset password', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-[#050505]">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 w-full max-w-[360px] backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl text-center"
                >
                    <AuthHeader title="Error" subtitle="SYSTEM ERROR" />
                    <div className="mt-8 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                        <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                        <p className="text-red-200 text-sm font-mono">Invalid or missing reset token</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-6 text-xs text-white/60 hover:text-white transition-colors font-mono flex items-center justify-center gap-2 mx-auto group"
                        >
                            <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
                            RETURN TO LOGIN
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

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
                <AuthHeader title="Security" subtitle="RESET SECURITY KEY" />

                {!isSuccess ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8"
                    >
                        <p className="text-zinc-400 text-xs mb-8 leading-relaxed font-mono text-center">
                            Enter your new security key below.
                        </p>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                    New Security Key
                                </label>
                                <div className="relative group">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        {...register('password')}
                                        className={`w-full bg-black/40 border ${errors.password ? 'border-red-500/50' : 'border-white/10'
                                            } text-sm text-white rounded-lg px-4 py-3.5 pr-12 outline-none focus:border-white/30 focus:bg-black/60 transition-all font-mono`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-zinc-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <PasswordStrengthMeter password={watch('password')} />
                                {errors.password && <p className="text-xs text-red-400 ml-1">{errors.password.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                    Confirm New Key
                                </label>
                                <div className="relative group">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        {...register('confirmPassword')}
                                        className={`w-full bg-black/40 border ${errors.confirmPassword ? 'border-red-500/50' : 'border-white/10'
                                            } text-sm text-white rounded-lg px-4 py-3.5 pr-12 outline-none focus:border-white/30 focus:bg-black/60 transition-all font-mono`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-zinc-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && <p className="text-xs text-red-400 ml-1">{errors.confirmPassword.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-zinc-200 transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Resetting...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Reset Security Key</span>
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
                        <h3 className="text-white font-bold text-lg mb-3 uppercase tracking-widest">Key Reset Successful</h3>
                        <p className="text-zinc-400 text-xs leading-relaxed font-mono mb-6">
                            Redirecting to login system...
                        </p>
                        <Loader2 className="w-5 h-5 text-white/40 animate-spin mx-auto" />
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
