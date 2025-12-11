import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/lib/hooks/useUser';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToast } from '@/contexts/ToastContext';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

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
    const isMobile = useIsMobile();

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

    useEffect(() => {
        if (user) {
            reset({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
            });
        }
    }, [user, reset]);

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="space-y-6">
                <h1 className="text-xl font-bold text-white">Profile Settings</h1>

                {/* Profile Details */}
                <div className="bg-zinc-900 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-white mb-4">Personal Info</h2>

                    <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">First Name</label>
                            <input
                                {...registerProfile('firstName')}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                            {profileErrors.firstName && <p className="text-xs text-red-400 mt-1">{profileErrors.firstName.message}</p>}
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Last Name</label>
                            <input
                                {...registerProfile('lastName')}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                            {profileErrors.lastName && <p className="text-xs text-red-400 mt-1">{profileErrors.lastName.message}</p>}
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Email</label>
                            <input
                                value={user?.email}
                                disabled
                                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-zinc-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Phone</label>
                            <input
                                {...registerProfile('phone')}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isProfileSubmitting}
                            className="w-full bg-white text-black py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isProfileSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </button>
                    </form>
                </div>

                {/* Change Password */}
                <div className="bg-zinc-900 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-white mb-4">Change Password</h2>

                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Current Password</label>
                            <input
                                type="password"
                                {...registerPassword('currentPassword')}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                            {passwordErrors.currentPassword && <p className="text-xs text-red-400 mt-1">{passwordErrors.currentPassword.message}</p>}
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">New Password</label>
                            <input
                                type="password"
                                {...registerPassword('newPassword')}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                            {passwordErrors.newPassword && <p className="text-xs text-red-400 mt-1">{passwordErrors.newPassword.message}</p>}
                        </div>

                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Confirm Password</label>
                            <input
                                type="password"
                                {...registerPassword('confirmPassword')}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                            />
                            {passwordErrors.confirmPassword && <p className="text-xs text-red-400 mt-1">{passwordErrors.confirmPassword.message}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isPasswordSubmitting}
                            className="w-full bg-zinc-800 text-white py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isPasswordSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Update Password
                        </button>
                    </form>
                </div>

                {/* Danger Zone */}
                <div className="bg-red-900/10 border border-red-900/30 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h2>
                    <p className="text-xs text-zinc-500 mb-4">Once you delete your account, there is no going back.</p>

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
                        className="w-full border border-red-900/50 text-red-400 py-3 text-sm font-bold rounded-lg active:bg-red-900/20"
                    >
                        Delete Account
                    </button>
                </div>
            </div>
        );
    }

    // Desktop Layout
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
