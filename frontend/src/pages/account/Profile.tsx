import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/lib/hooks/useUser';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    phone: z.string().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
    const { data: user } = useUser();
    const { updateProfile, changePassword, deactivateAccount } = useProfile();
    const { showConfirm } = useToast();

    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        reset,
        formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
        },
    });

    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        reset: resetPassword,
        formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
    });

    const onProfileSubmit = (data: ProfileFormData) => {
        updateProfile.mutate(data);
    };

    const onPasswordSubmit = (data: PasswordFormData) => {
        changePassword.mutate(data, {
            onSuccess: () => resetPassword(),
        });
    };

    // CRITICAL FIX: Repopulate form when user data loads
    useEffect(() => {
        if (user) {
            reset({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
            });
        }
    }, [user, reset]);

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Profile Details */}
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Profile Details</h2>

                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">First Name</label>
                            <input
                                {...registerProfile('firstName')}
                                className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                            {profileErrors.firstName && <p className="text-xs text-red-400">{profileErrors.firstName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Name</label>
                            <input
                                {...registerProfile('lastName')}
                                className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                            {profileErrors.lastName && <p className="text-xs text-red-400">{profileErrors.lastName.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                            <input
                                value={user?.email}
                                disabled
                                className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
                            <input
                                {...registerProfile('phone')}
                                className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                            {profileErrors.phone && <p className="text-xs text-red-400">{profileErrors.phone.message}</p>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isProfileSubmitting}
                        className="bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isProfileSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                    </button>
                </form>
            </div>

            {/* Change Password */}
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8">
                <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">Change Password</h2>

                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Current Password</label>
                        <input
                            type="password"
                            {...registerPassword('currentPassword')}
                            className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                        />
                        {passwordErrors.currentPassword && <p className="text-xs text-red-400">{passwordErrors.currentPassword.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">New Password</label>
                            <input
                                type="password"
                                {...registerPassword('newPassword')}
                                className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                            {passwordErrors.newPassword && <p className="text-xs text-red-400">{passwordErrors.newPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Confirm New Password</label>
                            <input
                                type="password"
                                {...registerPassword('confirmPassword')}
                                className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                            />
                            {passwordErrors.confirmPassword && <p className="text-xs text-red-400">{passwordErrors.confirmPassword.message}</p>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPasswordSubmitting}
                        className="bg-zinc-800 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPasswordSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Update Password
                    </button>
                </form>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-900/30 bg-red-900/5 rounded-lg p-8">
                <h2 className="text-lg font-bold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h2>
                <p className="text-zinc-500 text-xs mb-6">Once you delete your account, there is no going back. Please be certain.</p>

                <button
                    onClick={() => {
                        showConfirm({
                            title: 'Delete Account',
                            message: 'Are you sure you want to delete your account? This action cannot be undone.',
                            onConfirm: () => deactivateAccount.mutate(),
                            confirmText: 'Delete',
                            cancelText: 'Cancel'
                        });
                    }}
                    className="border border-red-900/50 text-red-400 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-red-900/20 transition-colors"
                >
                    Delete Account
                </button>
            </div>
        </div>
    );
}
