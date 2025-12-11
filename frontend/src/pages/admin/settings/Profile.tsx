import { useState, FormEvent, useEffect } from 'react';
import { User, Lock, Save, AlertCircle, Check, Eye, EyeOff, ArrowLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';
import { useProfile } from '@/lib/hooks/useProfile';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api/axios';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function AdminProfile() {
    const { data: user, isLoading: userLoading } = useUser();
    const { updateProfile, changePassword } = useProfile();
    const { showToast } = useToast();
    const isMobile = useIsMobile();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    const [showReauthModal, setShowReauthModal] = useState(false);
    const [reauthPassword, setReauthPassword] = useState('');
    const [reauthLoading, setReauthLoading] = useState(false);
    const [isReauthenticated, setIsReauthenticated] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
        }
    }, [user]);

    const handleProfileSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setProfileSaving(true);
        try {
            await updateProfile.mutateAsync({ firstName, lastName });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleReauthenticate = async (e: FormEvent) => {
        e.preventDefault();
        setReauthLoading(true);
        try {
            await api.post('/auth/verify-password', { password: reauthPassword });
            setIsReauthenticated(true);
            setShowReauthModal(false);
            setReauthPassword('');
            showToast('Identity verified', 'success');
        } catch (error: any) {
            showToast(error.response?.data?.error || 'Invalid password', 'error');
        } finally {
            setReauthLoading(false);
        }
    };

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isReauthenticated) { setShowReauthModal(true); return; }
        if (newPassword !== confirmPassword) { showToast('Passwords do not match', 'error'); return; }
        if (newPassword.length < 8) { showToast('Minimum 8 characters', 'error'); return; }
        setPasswordSaving(true);
        try {
            await changePassword.mutateAsync({ currentPassword, newPassword });
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            setIsReauthenticated(false);
        } finally { setPasswordSaving(false); }
    };

    if (userLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>;

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link to="/admin/settings" className="p-2.5 bg-zinc-800 rounded-xl text-zinc-400">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-lg text-white font-semibold">Profile</h1>
                        <p className="text-[10px] text-zinc-500 font-mono">PERSONAL INFORMATION</p>
                    </div>
                </div>

                {/* Profile Card */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <User size={16} className="text-zinc-400" />
                        <span className="text-xs font-bold text-white uppercase">Profile Info</span>
                    </div>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase block mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder={user?.firstName || 'First name'}
                                    className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder={user?.lastName || 'Last name'}
                                    className="w-full h-11 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase block mb-1">Email</label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-500"
                            />
                            <p className="text-[9px] text-zinc-600 mt-1">Cannot be changed</p>
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase block mb-1">Role</label>
                            <input
                                type="text"
                                value={user?.role?.toUpperCase() || ''}
                                disabled
                                className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={profileSaving}
                            className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {profileSaving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                            Save Profile
                        </button>
                    </form>
                </div>

                {/* Password Card */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Lock size={16} className="text-zinc-400" />
                            <span className="text-xs font-bold text-white uppercase">Change Password</span>
                        </div>
                        {isReauthenticated && (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
                                <Check size={10} /> VERIFIED
                            </span>
                        )}
                    </div>

                    {!isReauthenticated && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4 flex items-start gap-3">
                            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-amber-400 font-medium">Verification Required</p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Verify identity before changing password</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="relative">
                            <label className="text-[10px] text-zinc-500 uppercase block mb-1">Current Password</label>
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                disabled={!isReauthenticated}
                                placeholder="Current password"
                                className="w-full h-11 px-4 pr-10 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white disabled:opacity-50"
                            />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-8 text-zinc-500">
                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div className="relative">
                            <label className="text-[10px] text-zinc-500 uppercase block mb-1">New Password</label>
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={!isReauthenticated}
                                placeholder="New password (min 8 chars)"
                                className="w-full h-11 px-4 pr-10 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white disabled:opacity-50"
                            />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-8 text-zinc-500">
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div className="relative">
                            <label className="text-[10px] text-zinc-500 uppercase block mb-1">Confirm Password</label>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={!isReauthenticated}
                                placeholder="Confirm new password"
                                className="w-full h-11 px-4 pr-10 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white disabled:opacity-50"
                            />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-8 text-zinc-500">
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>

                        {!isReauthenticated ? (
                            <button
                                type="button"
                                onClick={() => setShowReauthModal(true)}
                                className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Lock size={16} /> Verify Identity
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                                className="w-full py-3 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {passwordSaving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
                                Change Password
                            </button>
                        )}
                    </form>
                </div>

                {/* Re-auth Modal (Bottom Sheet) */}
                {showReauthModal && (
                    <>
                        <div className="fixed inset-0 bg-black/80 z-50" onClick={() => setShowReauthModal(false)} />
                        <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl p-5 safe-area-pb">
                            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />
                            <div className="flex items-center gap-3 mb-4">
                                <Lock size={20} className="text-white" />
                                <h3 className="text-base font-semibold text-white">Verify Identity</h3>
                            </div>
                            <p className="text-sm text-zinc-400 mb-4">Enter your current password to continue.</p>
                            <form onSubmit={handleReauthenticate} className="space-y-4">
                                <input
                                    type="password"
                                    value={reauthPassword}
                                    onChange={(e) => setReauthPassword(e.target.value)}
                                    autoFocus
                                    placeholder="Current password"
                                    className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
                                />
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setShowReauthModal(false); setReauthPassword(''); }} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-medium">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={!reauthPassword || reauthLoading} className="flex-1 py-3 bg-white text-black rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                                        {reauthLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Verify'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/admin/settings" className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors">
                    <ArrowLeft size={16} className="text-zinc-400" />
                </Link>
                <div>
                    <h1 className="text-xl text-white font-medium uppercase tracking-tight">Admin Profile</h1>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">MANAGE YOUR PERSONAL INFORMATION</p>
                </div>
            </div>

            {/* Profile Information Section */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="px-6 py-4 border-b border-[#27272a] flex items-center gap-3">
                    <User size={16} className="text-zinc-400" />
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest">Profile Information</h2>
                </div>
                <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">First Name</label>
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none" placeholder={user?.firstName || 'Enter first name'} />
                        </div>
                        <div>
                            <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Last Name</label>
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none" placeholder={user?.lastName || 'Enter last name'} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Email Address</label>
                        <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-500 text-sm cursor-not-allowed" />
                        <p className="text-[10px] text-zinc-600 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                        <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Role</label>
                        <input type="text" value={user?.role?.toUpperCase() || ''} disabled className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-500 text-sm cursor-not-allowed" />
                    </div>
                    <button type="submit" disabled={profileSaving} className="px-6 py-3 bg-white text-black text-[10px] font-bold font-mono uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50">
                        {profileSaving ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Saving...</> : <><Save size={14} />Save Changes</>}
                    </button>
                </form>
            </div>

            {/* Change Password Section */}
            <div className="border border-[#27272a] bg-[#0A0A0A]">
                <div className="px-6 py-4 border-b border-[#27272a] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Lock size={16} className="text-zinc-400" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-widest">Change Password</h2>
                    </div>
                    {isReauthenticated ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 border border-emerald-500/20 flex items-center gap-1"><Check size={12} />VERIFIED</span>
                    ) : (
                        <span className="text-[10px] font-mono text-zinc-500">Requires re-authentication</span>
                    )}
                </div>
                <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                    {!isReauthenticated && (
                        <div className="p-4 bg-amber-500/5 border border-amber-500/20 mb-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm text-amber-400 font-medium">Re-authentication Required</p>
                                    <p className="text-xs text-zinc-400 mt-1">For security, verify identity before changing password.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="relative">
                        <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Current Password</label>
                        <div className="relative">
                            <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={!isReauthenticated} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Enter current password" />
                            <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">{showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">New Password</label>
                        <div className="relative">
                            <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={!isReauthenticated} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Enter new password" />
                            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">{showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">Minimum 8 characters</p>
                    </div>
                    <div className="relative">
                        <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Confirm New Password</label>
                        <div className="relative">
                            <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={!isReauthenticated} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none pr-10 disabled:opacity-50 disabled:cursor-not-allowed" placeholder="Confirm new password" />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {!isReauthenticated ? (
                            <button type="button" onClick={() => setShowReauthModal(true)} className="px-6 py-3 bg-white text-black text-[10px] font-bold font-mono uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2"><Lock size={14} />Verify Identity</button>
                        ) : (
                            <button type="submit" disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="px-6 py-3 bg-white text-black text-[10px] font-bold font-mono uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {passwordSaving ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Changing...</> : <><Save size={14} />Change Password</>}
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Re-authentication Modal */}
            {showReauthModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0A0A0A] border border-[#27272a] p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Lock size={20} className="text-white" />
                                <h2 className="text-lg text-white font-bold">Verify Your Identity</h2>
                            </div>
                            <button onClick={() => { setShowReauthModal(false); setReauthPassword(''); }} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <p className="text-sm text-zinc-400 mb-4">Enter your current password to verify your identity before changing your password.</p>
                        <form onSubmit={handleReauthenticate}>
                            <div className="mb-4">
                                <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2">Current Password</label>
                                <input type="password" value={reauthPassword} onChange={(e) => setReauthPassword(e.target.value)} autoFocus className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-zinc-600 focus:outline-none" placeholder="Enter your password" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowReauthModal(false); setReauthPassword(''); }} className="flex-1 px-4 py-3 bg-zinc-800 text-white text-sm font-bold uppercase hover:bg-zinc-700">Cancel</button>
                                <button type="submit" disabled={!reauthPassword || reauthLoading} className="flex-1 px-4 py-3 bg-white text-black text-sm font-bold uppercase hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                    {reauthLoading ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Verifying...</> : 'Verify'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
