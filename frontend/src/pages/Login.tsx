import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '@/lib/hooks/useLogin';
import { useUser } from '@/lib/hooks/useUser';
import { loginSchema, LoginFormData } from '@/lib/validators';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import AuthHeader from '@/components/ui/AuthHeader';
import { motion } from 'framer-motion';

export default function Login() {
    const loginMutation = useLogin();
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
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = (data: LoginFormData) => {
        loginMutation.mutate(data);
    };

    const isLoading = loginMutation.isPending;

    // Prevent flicker while checking auth
    if (isAuthLoading || user) return null;

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden bg-[#050505]">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            {/* LOGIN CONTAINER */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-[400px] backdrop-blur-xl bg-white/5 border border-white/10 p-8 rounded-2xl shadow-2xl"
            >
                <AuthHeader title="Welcome Back" subtitle="ACCESS YOUR PREMIUM ACCOUNT" />

                {/* FORM */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-8">

                    {/* Email */}
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

                    {/* Password */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label htmlFor="password" className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                Key
                            </label>
                            <Link to="/forgot-password" className="text-[10px] text-zinc-500 hover:text-white transition-colors font-mono">
                                FORGOT KEY?
                            </Link>
                        </div>
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
                        {errors.password && <p className="text-xs text-red-400 ml-1">{errors.password.message}</p>}
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center gap-2 ml-1">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            {...register('rememberMe')}
                            className="w-3 h-3 rounded border border-zinc-600 bg-transparent checked:bg-white checked:border-white transition-all cursor-pointer"
                        />
                        <label htmlFor="rememberMe" className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider cursor-pointer select-none">
                            Remember Me
                        </label>
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
                                <span>Authenticating...</span>
                            </>
                        ) : (
                            <>
                                <span>Authenticate</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-xs text-zinc-500 font-mono">
                        Need system access?{' '}
                        <Link
                            to="/register"
                            className="text-white hover:text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-white transition-all ml-1"
                        >
                            REGISTER
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
