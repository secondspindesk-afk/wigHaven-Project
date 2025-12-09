import { useState, useEffect } from 'react';
import {
    Save, Globe, CreditCard, Truck, Shield, Loader2, Server, Ban, Database, RefreshCw,
    Activity, Trash2, Crown, X, Building2, Mail, Phone, MapPin, Star, Package,
    MessageSquare, AlertTriangle, Check
} from 'lucide-react';
import { useAdminSettings, useUpdateSettings } from '@/lib/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { SystemSettings } from '@/lib/api/settings';
import { tokenManager } from '@/lib/utils/tokenManager';

// Reusable Toggle Switch Component
function Toggle({
    checked,
    onChange,
    disabled = false,
    variant = 'default'
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    variant?: 'default' | 'danger' | 'success';
}) {
    const colorClasses = {
        default: 'peer-checked:bg-[#00C3F7]',
        danger: 'peer-checked:bg-red-500',
        success: 'peer-checked:bg-emerald-500'
    };

    return (
        <label className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => !disabled && onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
            />
            <div className={`w-12 h-6 bg-zinc-700/50 rounded-full peer transition-all duration-300
                peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-lg after:transition-all
                ${colorClasses[variant]}`}
            />
        </label>
    );
}

// Reusable Input Component
function SettingsInput({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    helper = '',
    icon: Icon
}: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
    helper?: string;
    icon?: any;
}) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                {Icon && <Icon size={12} className="text-zinc-500" />}
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600
                    focus:outline-none focus:border-[#00C3F7]/50 focus:ring-1 focus:ring-[#00C3F7]/20 transition-all duration-200 rounded-lg"
            />
            {helper && <p className="text-[10px] text-zinc-500">{helper}</p>}
        </div>
    );
}

// Section Card Component
function SettingsCard({
    title,
    icon: Icon,
    children,
    gradient = false,
    superAdmin = false
}: {
    title: string;
    icon: any;
    children: React.ReactNode;
    gradient?: boolean;
    superAdmin?: boolean;
}) {
    return (
        <div className={`
            relative overflow-hidden rounded-xl border backdrop-blur-sm
            ${superAdmin
                ? 'bg-gradient-to-br from-amber-500/5 to-amber-900/10 border-amber-500/20'
                : gradient
                    ? 'bg-gradient-to-br from-zinc-900/90 to-zinc-900/50 border-zinc-800/50'
                    : 'bg-zinc-900/50 border-zinc-800/50'
            }
        `}>
            {gradient && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#00C3F7]/5 to-transparent rounded-full blur-3xl" />
            )}
            <div className="relative p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2 rounded-lg ${superAdmin ? 'bg-amber-500/10' : 'bg-[#00C3F7]/10'}`}>
                        <Icon size={18} className={superAdmin ? 'text-amber-500' : 'text-[#00C3F7]'} />
                    </div>
                    <h2 className={`text-sm font-bold uppercase tracking-widest ${superAdmin ? 'text-amber-500' : 'text-white'}`}>
                        {title}
                    </h2>
                </div>
                {children}
            </div>
        </div>
    );
}

// Option Row Component for toggles
function OptionRow({
    title,
    description,
    checked,
    onChange,
    variant = 'default',
    icon: Icon
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    variant?: 'default' | 'danger' | 'success';
    icon?: any;
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700/50 transition-colors">
            <div className="flex items-start gap-3">
                {Icon && <Icon size={18} className="text-zinc-400 mt-0.5" />}
                <div>
                    <h3 className="text-sm font-medium text-white">{title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
                </div>
            </div>
            <Toggle checked={checked} onChange={onChange} variant={variant} />
        </div>
    );
}

// Super admin credentials modal
function SuperAdminAuthModal({
    isOpen,
    onClose,
    onAuthenticate
}: {
    isOpen: boolean;
    onClose: () => void;
    onAuthenticate: (email: string, secret: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [secret, setSecret] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Crown className="text-amber-500" size={20} />
                        </div>
                        <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Super Admin Auth</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-4">
                    <SettingsInput
                        label="Super Admin Email"
                        value={email}
                        onChange={setEmail}
                        type="email"
                        placeholder="superadmin@wighaven.com"
                        icon={Mail}
                    />
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[11px] text-zinc-400 uppercase font-bold tracking-wider">
                            Super Admin Secret Key
                        </label>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="wh_super_admin_dev_..."
                            className="w-full bg-zinc-900/80 border border-zinc-800 p-3 text-sm text-white font-mono placeholder-zinc-600 
                                focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all rounded-lg"
                        />
                        <p className="text-[9px] text-amber-500/70 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            Check your .env file for SUPER_ADMIN_SECRET
                        </p>
                    </div>
                    <button
                        onClick={() => onAuthenticate(email, secret)}
                        className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold uppercase 
                            hover:from-amber-400 hover:to-amber-500 transition-all rounded-lg shadow-lg shadow-amber-500/20"
                    >
                        Authenticate
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Settings() {
    const { showToast } = useToast();
    const { data: user } = useUser();
    const { data: settings, isLoading } = useAdminSettings();
    const updateMutation = useUpdateSettings();
    const queryClient = useQueryClient();

    const isSuperAdmin = user?.role === 'super_admin';

    type TabId = 'store' | 'payment' | 'shipping' | 'orders' | 'reviews' | 'security' | 'system' | 'blocked-ips' | 'database';
    const [activeTab, setActiveTab] = useState<TabId>('store');
    const [formData, setFormData] = useState<SystemSettings | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Super admin specific states
    const [superAdminAuth, setSuperAdminAuth] = useState<{ email: string; secret: string } | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [blockedIPs, setBlockedIPs] = useState<{ id: string; ip: string; reason: string; createdAt: string }[]>([]);
    const [newIP, setNewIP] = useState('');
    const [newIPReason, setNewIPReason] = useState('');
    const [systemStats, setSystemStats] = useState<{
        users: number;
        orders: number;
        products: number;
        orderItems: number;
        addresses: number;
        settings: number;
        blockedIps: number;
        dbStatus: string;
        node_env?: string;
        uptime?: number;
    } | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isLoadingIPs, setIsLoadingIPs] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData(settings);
        }
    }, [settings]);

    useEffect(() => {
        const stored = sessionStorage.getItem('superAdminAuth');
        if (stored) {
            try {
                setSuperAdminAuth(JSON.parse(stored));
            } catch {
                sessionStorage.removeItem('superAdminAuth');
            }
        }
    }, []);

    useEffect(() => {
        if (superAdminAuth && isSuperAdmin) {
            fetchSuperAdminData();
        }
    }, [superAdminAuth, isSuperAdmin]);

    const handleSuperAdminAuth = (email: string, secret: string) => {
        const auth = { email, secret };
        sessionStorage.setItem('superAdminAuth', JSON.stringify(auth));
        setSuperAdminAuth(auth);
        setShowAuthModal(false);
        showToast('Super admin authenticated', 'success');
    };

    const fetchSuperAdminData = async () => {
        if (!superAdminAuth) return;

        setIsLoadingIPs(true);
        try {
            const response = await fetch('/api/super-admin/ip/blocked', {
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'x-super-admin-email': superAdminAuth.email,
                    'x-super-admin-secret': superAdminAuth.secret
                }
            });
            if (response.ok) {
                const data = await response.json();
                setBlockedIPs(data.ips || []);
            } else if (response.status === 404) {
                sessionStorage.removeItem('superAdminAuth');
                setSuperAdminAuth(null);
                showToast('Super admin authentication failed', 'error');
                setShowAuthModal(true);
                return;
            }
        } catch (error) {
            console.error('Failed to fetch blocked IPs:', error);
        }
        setIsLoadingIPs(false);

        setIsLoadingStats(true);
        try {
            const response = await fetch('/api/super-admin/stats', {
                headers: {
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'x-super-admin-email': superAdminAuth.email,
                    'x-super-admin-secret': superAdminAuth.secret
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSystemStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
        setIsLoadingStats(false);
    };

    const handleBlockIP = async () => {
        if (!superAdminAuth || !newIP) return;
        try {
            const response = await fetch('/api/super-admin/ip/block', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-super-admin-email': superAdminAuth.email,
                    'x-super-admin-secret': superAdminAuth.secret
                },
                body: JSON.stringify({ ip: newIP, reason: newIPReason })
            });
            if (response.ok) {
                showToast(`IP ${newIP} blocked`, 'success');
                setNewIP('');
                setNewIPReason('');
                fetchSuperAdminData();
            } else {
                const data = await response.json();
                showToast(data.error || 'Failed to block IP', 'error');
            }
        } catch (error) {
            showToast('Failed to block IP', 'error');
        }
    };

    const handleUnblockIP = async (ip: string) => {
        if (!superAdminAuth) return;
        try {
            const response = await fetch(`/api/super-admin/ip/unblock/${encodeURIComponent(ip)}`, {
                method: 'DELETE',
                headers: {
                    'x-super-admin-email': superAdminAuth.email,
                    'x-super-admin-secret': superAdminAuth.secret
                }
            });
            if (response.ok) {
                showToast(`IP ${ip} unblocked`, 'success');
                fetchSuperAdminData();
            }
        } catch (error) {
            showToast('Failed to unblock IP', 'error');
        }
    };

    const handleSave = async () => {
        if (!formData) return;
        try {
            await updateMutation.mutateAsync(formData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
            showToast('Settings saved successfully', 'success');
        } catch (error: any) {
            showToast(error.message || 'Failed to save settings', 'error');
        }
    };

    const handleUpdateMaintenanceMode = async (enabled: boolean) => {
        if (!superAdminAuth) {
            setShowAuthModal(true);
            return;
        }
        try {
            const response = await fetch('/api/super-admin/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                    'x-super-admin-email': superAdminAuth.email,
                    'x-super-admin-secret': superAdminAuth.secret
                },
                body: JSON.stringify({ key: 'maintenanceMode', value: String(enabled) })
            });
            if (response.ok) {
                setFormData(prev => prev ? { ...prev, maintenanceMode: enabled } : null);
                queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
                showToast(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
            } else {
                const errorData = await response.json();
                showToast(errorData.message || 'Failed to update maintenance mode', 'error');
            }
        } catch (error) {
            showToast('Failed to update maintenance mode', 'error');
        }
    };

    if (isLoading || !formData) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-2 border-[#00C3F7]/20 rounded-full" />
                        <div className="absolute inset-0 w-12 h-12 border-2 border-[#00C3F7] border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Loading settings...</p>
                </div>
            </div>
        );
    }

    // Tabs configuration
    const baseTabs: { id: TabId; label: string; icon: any }[] = [
        { id: 'store', label: 'Store', icon: Building2 },
        { id: 'payment', label: 'Payment', icon: CreditCard },
        { id: 'shipping', label: 'Shipping', icon: Truck },
        { id: 'orders', label: 'Orders', icon: Package },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const superAdminTabs: { id: TabId; label: string; icon: any }[] = [
        { id: 'system', label: 'System', icon: Server },
        { id: 'blocked-ips', label: 'Blocked IPs', icon: Ban },
        { id: 'database', label: 'Database', icon: Database },
    ];

    const tabs = isSuperAdmin ? [...baseTabs, ...superAdminTabs] : baseTabs;

    return (
        <div className="min-h-screen bg-[#030303] p-6 lg:p-8 pb-20">
            {/* Auth Modal */}
            <SuperAdminAuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAuthenticate={handleSuperAdminAuth}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl text-white font-semibold tracking-tight">Settings</h1>
                        {isSuperAdmin && (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-500 text-[10px] font-bold uppercase rounded-full border border-amber-500/20">
                                <Crown size={11} />
                                Super Admin
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-zinc-500 mt-1">
                        Manage your store configuration and preferences
                    </p>
                </div>
                <div className="flex gap-3">
                    {isSuperAdmin && !superAdminAuth && (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase 
                                hover:bg-amber-500/20 transition-all rounded-lg flex items-center gap-2"
                        >
                            <Crown size={14} />
                            Unlock Super Features
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className={`px-6 py-2.5 text-xs font-bold uppercase transition-all rounded-lg flex items-center gap-2 shadow-lg
                            ${saveSuccess
                                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-gradient-to-r from-[#00C3F7] to-[#00A8D6] text-black hover:shadow-[#00C3F7]/30 shadow-[#00C3F7]/20'
                            } disabled:opacity-50`}
                    >
                        {updateMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : saveSuccess ? (
                            <Check size={14} />
                        ) : (
                            <Save size={14} />
                        )}
                        {saveSuccess ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-56 flex-shrink-0">
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-2 space-y-1 sticky top-4">
                        {tabs.map((tab, index) => (
                            <div key={tab.id}>
                                {isSuperAdmin && index === baseTabs.length && (
                                    <div className="my-3 px-3">
                                        <div className="border-t border-amber-500/20" />
                                        <span className="block text-[9px] text-amber-500/60 font-bold uppercase mt-2">Developer Only</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => {
                                        if (index >= baseTabs.length && !superAdminAuth) {
                                            setShowAuthModal(true);
                                        } else {
                                            setActiveTab(tab.id);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-all rounded-lg ${activeTab === tab.id
                                            ? index >= baseTabs.length
                                                ? 'bg-amber-500/10 text-amber-500'
                                                : 'bg-[#00C3F7]/10 text-[#00C3F7]'
                                            : index >= baseTabs.length
                                                ? 'text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/5'
                                                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                    {index >= baseTabs.length && !superAdminAuth && (
                                        <span className="ml-auto text-[10px]">🔒</span>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    {/* Store Settings */}
                    {activeTab === 'store' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Business Information" icon={Building2} gradient>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <SettingsInput
                                        label="Store Name"
                                        value={formData.siteName}
                                        onChange={(v) => setFormData({ ...formData, siteName: v })}
                                        placeholder="WigHaven"
                                        icon={Building2}
                                    />
                                    <SettingsInput
                                        label="Support Email"
                                        value={formData.supportEmail}
                                        onChange={(v) => setFormData({ ...formData, supportEmail: v })}
                                        type="email"
                                        placeholder="support@wighaven.com"
                                        icon={Mail}
                                    />
                                    <SettingsInput
                                        label="Support Phone"
                                        value={formData.supportPhone}
                                        onChange={(v) => setFormData({ ...formData, supportPhone: v })}
                                        type="tel"
                                        placeholder="+233 XX XXX XXXX"
                                        icon={Phone}
                                    />
                                    <SettingsInput
                                        label="Business Address"
                                        value={formData.businessAddress}
                                        onChange={(v) => setFormData({ ...formData, businessAddress: v })}
                                        placeholder="123 Main Street, Accra"
                                        icon={MapPin}
                                    />
                                </div>
                            </SettingsCard>

                            <SettingsCard title="Social Media" icon={Globe}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <SettingsInput
                                        label="Instagram"
                                        value={formData.socialLinks.instagram}
                                        onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: v } })}
                                        placeholder="https://instagram.com/wighaven"
                                    />
                                    <SettingsInput
                                        label="Facebook"
                                        value={formData.socialLinks.facebook}
                                        onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: v } })}
                                        placeholder="https://facebook.com/wighaven"
                                    />
                                    <SettingsInput
                                        label="Twitter / X"
                                        value={formData.socialLinks.twitter}
                                        onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, twitter: v } })}
                                        placeholder="https://twitter.com/wighaven"
                                    />
                                    <SettingsInput
                                        label="WhatsApp"
                                        value={formData.socialLinks.whatsapp}
                                        onChange={(v) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, whatsapp: v } })}
                                        placeholder="https://wa.me/233XXXXXXXXX"
                                    />
                                </div>
                            </SettingsCard>
                        </div>
                    )}

                    {/* Payment Settings */}
                    {activeTab === 'payment' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Payment Methods" icon={CreditCard} gradient>
                                <div className="space-y-4">
                                    <OptionRow
                                        title="Card / Mobile Money (Paystack)"
                                        description="Accept payments via Paystack including cards, mobile money, and bank transfers"
                                        checked={formData.paymentMethods.card}
                                        onChange={(v) => setFormData({ ...formData, paymentMethods: { ...formData.paymentMethods, card: v } })}
                                        icon={CreditCard}
                                    />
                                    <OptionRow
                                        title="Cash on Delivery"
                                        description="Allow customers to pay cash when their order is delivered"
                                        checked={formData.paymentMethods.cash}
                                        onChange={(v) => setFormData({ ...formData, paymentMethods: { ...formData.paymentMethods, cash: v } })}
                                    />
                                    <OptionRow
                                        title="Bank Transfer"
                                        description="Allow customers to pay via direct bank transfer"
                                        checked={formData.paymentMethods.transfer}
                                        onChange={(v) => setFormData({ ...formData, paymentMethods: { ...formData.paymentMethods, transfer: v } })}
                                    />
                                </div>
                            </SettingsCard>

                            {formData.paymentMethods.transfer && (
                                <SettingsCard title="Bank Account Details" icon={Building2}>
                                    <p className="text-xs text-zinc-500 mb-5">These details will be shown to customers who choose bank transfer</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <SettingsInput
                                            label="Bank Name"
                                            value={formData.bankDetails.bankName}
                                            onChange={(v) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: v } })}
                                            placeholder="Ghana Commercial Bank"
                                        />
                                        <SettingsInput
                                            label="Account Number"
                                            value={formData.bankDetails.accountNumber}
                                            onChange={(v) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: v } })}
                                            placeholder="1234567890"
                                        />
                                        <SettingsInput
                                            label="Account Name"
                                            value={formData.bankDetails.accountName}
                                            onChange={(v) => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountName: v } })}
                                            placeholder="WigHaven Ltd"
                                        />
                                    </div>
                                </SettingsCard>
                            )}
                        </div>
                    )}

                    {/* Shipping Settings */}
                    {activeTab === 'shipping' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Shipping Rates" icon={Truck} gradient>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <SettingsInput
                                        label="Flat Rate Shipping (GHS)"
                                        value={formData.shippingFlatRate}
                                        onChange={(v) => setFormData({ ...formData, shippingFlatRate: Number(v) })}
                                        type="number"
                                        helper="Standard shipping cost for all orders"
                                    />
                                    <SettingsInput
                                        label="Free Shipping Threshold (GHS)"
                                        value={formData.freeShippingThreshold}
                                        onChange={(v) => setFormData({ ...formData, freeShippingThreshold: Number(v) })}
                                        type="number"
                                        helper="Orders above this amount get free shipping. Set to 0 to disable."
                                    />
                                </div>
                            </SettingsCard>
                        </div>
                    )}

                    {/* Order Settings */}
                    {activeTab === 'orders' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Order Limits" icon={Package} gradient>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <SettingsInput
                                        label="Minimum Order Amount (GHS)"
                                        value={formData.minOrderAmount}
                                        onChange={(v) => setFormData({ ...formData, minOrderAmount: Number(v) })}
                                        type="number"
                                        helper="Minimum cart value required to checkout. Set to 0 to disable."
                                    />
                                    <SettingsInput
                                        label="Maximum Order Amount (GHS)"
                                        value={formData.maxOrderAmount}
                                        onChange={(v) => setFormData({ ...formData, maxOrderAmount: Number(v) })}
                                        type="number"
                                        helper="Maximum cart value allowed. Set to 0 for unlimited."
                                    />
                                </div>
                            </SettingsCard>

                            <SettingsCard title="Order Notifications" icon={Mail}>
                                <OptionRow
                                    title="Order Confirmation Email"
                                    description="Send customers an email confirmation when they place an order"
                                    checked={formData.orderConfirmationEmail}
                                    onChange={(v) => setFormData({ ...formData, orderConfirmationEmail: v })}
                                    icon={Mail}
                                    variant="success"
                                />
                            </SettingsCard>

                            <SettingsCard title="Inventory" icon={Package}>
                                <SettingsInput
                                    label="Low Stock Threshold"
                                    value={formData.lowStockThreshold}
                                    onChange={(v) => setFormData({ ...formData, lowStockThreshold: Number(v) })}
                                    type="number"
                                    helper="Get notified when product stock falls below this number"
                                />
                            </SettingsCard>
                        </div>
                    )}

                    {/* Review Settings */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Review Moderation" icon={MessageSquare} gradient>
                                <div className="space-y-4">
                                    <OptionRow
                                        title="Auto-Approve Reviews"
                                        description="Automatically approve all customer reviews without moderation"
                                        checked={formData.review_auto_approve}
                                        onChange={(v) => setFormData({ ...formData, review_auto_approve: v })}
                                        icon={Check}
                                    />
                                    <OptionRow
                                        title="Allow Anonymous Reviews"
                                        description="Let customers submit reviews without showing their name publicly"
                                        checked={formData.allowAnonymousReviews}
                                        onChange={(v) => setFormData({ ...formData, allowAnonymousReviews: v })}
                                    />
                                </div>
                            </SettingsCard>

                            <SettingsCard title="Review Requirements" icon={Star}>
                                <SettingsInput
                                    label="Minimum Review Length"
                                    value={formData.minReviewLength}
                                    onChange={(v) => setFormData({ ...formData, minReviewLength: Number(v) })}
                                    type="number"
                                    helper="Minimum characters required for a review. Set to 0 to disable."
                                />
                            </SettingsCard>
                        </div>
                    )}

                    {/* Security Settings */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Account Security" icon={Shield} gradient>
                                <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg flex items-start gap-3">
                                    <Shield size={18} className="text-zinc-400 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-medium text-white">Password Management</h3>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            To change your password, go to your Profile page in Account Settings.
                                        </p>
                                    </div>
                                </div>
                            </SettingsCard>

                            {isSuperAdmin && (
                                <SettingsCard title="Maintenance Mode" icon={AlertTriangle} superAdmin>
                                    <div className="space-y-4">
                                        <OptionRow
                                            title="Enable Maintenance Mode"
                                            description="Disable the storefront for all customers. Only super admins will have access."
                                            checked={formData.maintenanceMode}
                                            onChange={handleUpdateMaintenanceMode}
                                            variant="danger"
                                            icon={AlertTriangle}
                                        />
                                        {formData.maintenanceMode && (
                                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                                                <AlertTriangle size={18} className="text-red-500" />
                                                <span className="text-sm text-red-400">
                                                    Maintenance mode is ON - customers cannot access the store!
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </SettingsCard>
                            )}
                        </div>
                    )}

                    {/* SUPER ADMIN: System */}
                    {activeTab === 'system' && isSuperAdmin && superAdminAuth && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="System Health" icon={Activity} superAdmin>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={fetchSuperAdminData}
                                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                    >
                                        <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity size={14} className="text-emerald-500" />
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Server</span>
                                        </div>
                                        <span className="text-lg font-mono text-emerald-500">Operational</span>
                                        <p className="text-[10px] text-zinc-500 mt-1">
                                            Uptime: {systemStats?.uptime ? Math.floor(systemStats.uptime / 60) + 'm' : '--'}
                                        </p>
                                    </div>
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Database size={14} className={systemStats?.dbStatus === 'connected' ? 'text-blue-500' : 'text-red-500'} />
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Database</span>
                                        </div>
                                        <span className={`text-lg font-mono ${systemStats?.dbStatus === 'connected' ? 'text-blue-500' : 'text-red-500'}`}>
                                            {systemStats?.dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Server size={14} className="text-purple-500" />
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Environment</span>
                                        </div>
                                        <span className="text-lg font-mono text-purple-500">
                                            {systemStats?.node_env || 'development'}
                                        </span>
                                    </div>
                                </div>
                            </SettingsCard>
                        </div>
                    )}

                    {/* SUPER ADMIN: Blocked IPs */}
                    {activeTab === 'blocked-ips' && isSuperAdmin && superAdminAuth && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="IP Blocking" icon={Ban} superAdmin>
                                <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg">
                                    <h3 className="text-xs text-white font-bold uppercase mb-4">Block New IP</h3>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <input
                                            type="text"
                                            placeholder="IP Address (e.g., 192.168.1.1)"
                                            value={newIP}
                                            onChange={(e) => setNewIP(e.target.value)}
                                            className="flex-1 bg-zinc-800 border border-zinc-700 p-3 text-sm text-white rounded-lg focus:outline-none focus:border-amber-500/50"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Reason"
                                            value={newIPReason}
                                            onChange={(e) => setNewIPReason(e.target.value)}
                                            className="flex-1 bg-zinc-800 border border-zinc-700 p-3 text-sm text-white rounded-lg focus:outline-none focus:border-amber-500/50"
                                        />
                                        <button
                                            onClick={handleBlockIP}
                                            className="px-6 py-2 bg-red-500 text-white text-xs font-bold uppercase rounded-lg hover:bg-red-600 transition-colors"
                                        >
                                            Block
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-zinc-800/50 rounded-lg overflow-hidden">
                                    <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800/50">
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase">
                                            Blocked IPs ({blockedIPs.length})
                                        </span>
                                    </div>
                                    {isLoadingIPs ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />
                                        </div>
                                    ) : blockedIPs.length === 0 ? (
                                        <div className="p-6 text-center text-zinc-500 text-sm">
                                            No blocked IPs
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-zinc-800/50">
                                            {blockedIPs.map((item) => (
                                                <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/20">
                                                    <div>
                                                        <span className="text-sm text-white font-mono">{item.ip}</span>
                                                        {item.reason && (
                                                            <span className="text-xs text-zinc-500 ml-3">{item.reason}</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnblockIP(item.ip)}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SettingsCard>
                        </div>
                    )}

                    {/* SUPER ADMIN: Database */}
                    {activeTab === 'database' && isSuperAdmin && superAdminAuth && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <SettingsCard title="Database Statistics" icon={Database} superAdmin>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={fetchSuperAdminData}
                                        className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors"
                                    >
                                        <RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {[
                                        { label: 'Users', value: systemStats?.users },
                                        { label: 'Orders', value: systemStats?.orders },
                                        { label: 'Products', value: systemStats?.products },
                                        { label: 'Order Items', value: systemStats?.orderItems },
                                        { label: 'Addresses', value: systemStats?.addresses },
                                        { label: 'Settings', value: systemStats?.settings },
                                        { label: 'Blocked IPs', value: systemStats?.blockedIps },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
                                            <span className="text-[10px] text-zinc-500 uppercase font-bold">{stat.label}</span>
                                            <p className="text-2xl font-mono text-white mt-1">
                                                {isLoadingStats ? '--' : (stat.value ?? 0)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase">Database Backup</h3>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Download a full JSON dump. Contains sensitive data.
                                        </p>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            if (!superAdminAuth) return;
                                            try {
                                                const response = await fetch('/api/super-admin/backup', {
                                                    headers: {
                                                        'Authorization': `Bearer ${tokenManager.getAccessToken()}`,
                                                        'x-super-admin-email': superAdminAuth.email,
                                                        'x-super-admin-secret': superAdminAuth.secret
                                                    }
                                                });
                                                if (response.ok) {
                                                    const blob = await response.blob();
                                                    const url = window.URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
                                                    document.body.appendChild(a);
                                                    a.click();
                                                    window.URL.revokeObjectURL(url);
                                                    document.body.removeChild(a);
                                                    showToast('Backup downloaded', 'success');
                                                } else {
                                                    showToast('Failed to download backup', 'error');
                                                }
                                            } catch (error) {
                                                showToast('Failed to download backup', 'error');
                                            }
                                        }}
                                        className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-white text-xs font-bold uppercase rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2"
                                    >
                                        <Database size={14} />
                                        Download Backup
                                    </button>
                                </div>
                            </SettingsCard>
                        </div>
                    )}

                    {/* Auth required for super admin tabs */}
                    {['system', 'blocked-ips', 'database'].includes(activeTab) && isSuperAdmin && !superAdminAuth && (
                        <div className="bg-zinc-900/30 border border-amber-500/20 rounded-xl p-8 text-center">
                            <div className="p-4 bg-amber-500/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <Crown className="text-amber-500" size={28} />
                            </div>
                            <h3 className="text-sm font-bold text-amber-500 uppercase mb-2">Authentication Required</h3>
                            <p className="text-sm text-zinc-400 mb-6 max-w-md mx-auto">
                                This section requires super admin authentication. Enter your credentials to proceed.
                            </p>
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold uppercase rounded-lg hover:from-amber-400 hover:to-amber-500 transition-all"
                            >
                                Authenticate Now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
