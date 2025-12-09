import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegister } from '@/lib/hooks/useRegister';
import { useUser } from '@/lib/hooks/useUser';
import { registerSchema, RegisterFormData } from '@/lib/validators';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import AuthHeader from '@/components/ui/AuthHeader';
import PasswordStrengthMeter from '@/components/ui/PasswordStrengthMeter';
import { motion } from 'framer-motion';

export default function Register() {
    const registerMutation = useRegister();
    const { data: user, isLoading: isAuthLoading } = useUser();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user && !isAuthLoading) {
            navigate('/shop', { replace: true });
        }
    }, [user, isAuthLoading, navigate]);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = (data: RegisterFormData) => {
        registerMutation.mutate(data);
    };

    const isLoading = registerMutation.isPending;

    // Prevent flicker
    if (isAuthLoading || user) return null;

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-[#050505]">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            {/* REGISTER CONTAINER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[400px] backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl"
            >
                <AuthHeader title="Join the Elite" subtitle="CREATE YOUR ACCOUNT" />

                {/* FORM */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-8">

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="firstName" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                First Name
                            </label>
                            <input
                                type="text"
                                id="firstName"
                                {...register('firstName')}
                                className={`w-full bg-black/40 border ${errors.firstName ? 'border-red-500/50' : 'border-white/10'
                                    } text-sm text-white rounded-lg px-4 py-3.5 outline-none focus:border-white/30 focus:bg-black/60 transition-all font-mono`}
                            />
                            {errors.firstName && <p className="text-xs text-red-400 ml-1">{errors.firstName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="lastName" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                                Last Name
                            </label>
                            <input
                                type="text"
                                id="lastName"
                                {...register('lastName')}
                                className={`w-full bg-black/40 border ${errors.lastName ? 'border-red-500/50' : 'border-white/10'
                                    } text-sm text-white rounded-lg px-4 py-3.5 outline-none focus:border-white/30 focus:bg-black/60 transition-all font-mono`}
                            />
                            {errors.lastName && <p className="text-xs text-red-400 ml-1">{errors.lastName.message}</p>}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                            Identity
                        </label>
                        <input
                            type="email"
                            id="email"
                            {...register('email')}
                            placeholder="user@wighaven.com"
                            className={`w-full bg-black/40 border ${errors.email ? 'border-red-500/50' : 'border-white/10'
                                } text-sm text-white rounded-lg px-4 py-3.5 outline-none focus:border-white/30 focus:bg-black/60 transition-all placeholder:text-zinc-700 font-mono`}
                        />
                        {errors.email && <p className="text-xs text-red-400 ml-1">{errors.email.message}</p>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label htmlFor="phone" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                            Contact (Optional)
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            {...register('phone')}
                            className={`w-full bg-black/40 border ${errors.phone ? 'border-red-500/50' : 'border-white/10'
                                } text-sm text-white rounded-lg px-4 py-3.5 outline-none focus:border-white/30 focus:bg-black/60 transition-all font-mono`}
                        />
                        {errors.phone && <p className="text-xs text-red-400 ml-1">{errors.phone.message}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label htmlFor="password" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                            Key
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

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">
                            Confirm Key
                        </label>
                        <input
                            type={showPassword ? "text" : "password"}
                            id="confirmPassword"
                            {...register('confirmPassword')}
                            className={`w-full bg-black/40 border ${errors.confirmPassword ? 'border-red-500/50' : 'border-white/10'
                                } text-sm text-white rounded-lg px-4 py-3.5 outline-none focus:border-white/30 focus:bg-black/60 transition-all font-mono`}
                        />
                        {errors.confirmPassword && <p className="text-xs text-red-400 ml-1">{errors.confirmPassword.message}</p>}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-zinc-200 transition-all mt-6 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Creating Account...</span>
                            </>
                        ) : (
                            <>
                                <span>Create Account</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-zinc-500 font-mono">
                        Already have access?{' '}
                        <Link
                            to="/login"
                            className="text-white hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-white transition-all ml-1"
                        >
                            LOGIN
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
