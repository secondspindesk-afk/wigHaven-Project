import { useState, useEffect } from 'react';
import { Save, Globe, CreditCard, Truck, Shield, Loader2, Server, Ban, Database, RefreshCw, Activity, Trash2, Crown, X, Building2, Mail, Phone, MapPin, Star, Package, MessageSquare, AlertTriangle, Check } from 'lucide-react';
import { useAdminSettings, useUpdateSettings } from '@/lib/hooks/useSettings';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { SystemSettings } from '@/lib/api/settings';
import { tokenManager } from '@/lib/utils/tokenManager';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

// Toggle Switch
function Toggle({ checked, onChange, disabled = false, variant = 'default' }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; variant?: 'default' | 'danger' | 'success' }) {
    const colors = { default: 'peer-checked:bg-[#00C3F7]', danger: 'peer-checked:bg-red-500', success: 'peer-checked:bg-emerald-500' };
    return (
        <label className={`relative inline-flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} className="sr-only peer" />
            <div className={`w-12 h-6 bg-zinc-700/50 rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-lg after:transition-all ${colors[variant]}`} />
        </label>
    );
}

// Input Component
function SettingsInput({ label, value, onChange, type = 'text', placeholder = '', helper = '', icon: Icon }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; helper?: string; icon?: any }) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] text-zinc-400 uppercase font-bold tracking-wider">{Icon && <Icon size={12} className="text-zinc-500" />}{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-zinc-900/80 border border-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#00C3F7]/50 rounded-xl" />
            {helper && <p className="text-[10px] text-zinc-500">{helper}</p>}
        </div>
    );
}

// Card Component
function SettingsCard({ title, icon: Icon, children, superAdmin = false, isMobile = false }: { title: string; icon: any; children: React.ReactNode; gradient?: boolean; superAdmin?: boolean; isMobile?: boolean }) {
    return (
        <div className={`relative overflow-hidden border backdrop-blur-sm ${isMobile ? 'rounded-xl' : 'rounded-xl'} ${superAdmin ? 'bg-gradient-to-br from-amber-500/5 to-amber-900/10 border-amber-500/20' : 'bg-zinc-900/50 border-zinc-800/50'}`}>
            <div className={isMobile ? 'p-4' : 'p-6'}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${superAdmin ? 'bg-amber-500/10' : 'bg-[#00C3F7]/10'}`}><Icon size={16} className={superAdmin ? 'text-amber-500' : 'text-[#00C3F7]'} /></div>
                    <h2 className={`text-xs font-bold uppercase tracking-widest ${superAdmin ? 'text-amber-500' : 'text-white'}`}>{title}</h2>
                </div>
                {children}
            </div>
        </div>
    );
}

// Option Row
function OptionRow({ title, description, checked, onChange, variant = 'default', icon: Icon, isMobile = false }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void; variant?: 'default' | 'danger' | 'success'; icon?: any; isMobile?: boolean }) {
    return (
        <div className={`flex items-center justify-between bg-zinc-900/50 border border-zinc-800/50 rounded-xl ${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
                {Icon && <Icon size={16} className="text-zinc-400 mt-0.5 shrink-0" />}
                <div className="min-w-0">
                    <h3 className={`font-medium text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>{title}</h3>
                    <p className={`text-zinc-500 mt-0.5 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{description}</p>
                </div>
            </div>
            <Toggle checked={checked} onChange={onChange} variant={variant} />
        </div>
    );
}

// Super Admin Modal
function SuperAdminAuthModal({ isOpen, onClose, onAuthenticate, isMobile = false }: { isOpen: boolean; onClose: () => void; onAuthenticate: (e: string, s: string) => void; isMobile?: boolean }) {
    const [email, setEmail] = useState('');
    const [secret, setSecret] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className={`bg-zinc-900 border border-amber-500/30 w-full max-w-md shadow-2xl ${isMobile ? 'rounded-t-2xl p-5 pb-8' : 'rounded-xl p-6'}`}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2"><div className="p-2 bg-amber-500/10 rounded-lg"><Crown className="text-amber-500" size={18} /></div><h2 className="text-xs font-bold text-amber-500 uppercase">Super Admin Auth</h2></div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <SettingsInput label="Email" value={email} onChange={setEmail} type="email" placeholder="superadmin@wighaven.com" icon={Mail} />
                    <div className="space-y-2">
                        <label className="text-[11px] text-zinc-400 uppercase font-bold">Secret Key</label>
                        <input type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="wh_super_admin_dev_..." className="w-full bg-zinc-900/80 border border-zinc-800 p-3 text-sm text-white font-mono placeholder-zinc-600 rounded-xl" />
                    </div>
                    <button onClick={() => onAuthenticate(email, secret)} className="w-full mt-3 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold uppercase rounded-xl">Authenticate</button>
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
    const isMobile = useIsMobile();
    const isSuperAdmin = user?.role === 'super_admin';

    type TabId = 'store' | 'payment' | 'shipping' | 'orders' | 'reviews' | 'security' | 'system' | 'blocked-ips' | 'database';
    const [activeTab, setActiveTab] = useState<TabId>('store');
    const [formData, setFormData] = useState<SystemSettings | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [superAdminAuth, setSuperAdminAuth] = useState<{ email: string; secret: string } | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [blockedIPs, setBlockedIPs] = useState<{ id: string; ip: string; reason: string; createdAt: string }[]>([]);
    const [newIP, setNewIP] = useState('');
    const [newIPReason, setNewIPReason] = useState('');
    const [systemStats, setSystemStats] = useState<{ users: number; orders: number; products: number; orderItems: number; addresses: number; settings: number; blockedIps: number; dbStatus: string; node_env?: string; uptime?: number } | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isLoadingIPs, setIsLoadingIPs] = useState(false);

    useEffect(() => { if (settings) setFormData(settings); }, [settings]);
    useEffect(() => { const stored = sessionStorage.getItem('superAdminAuth'); if (stored) try { setSuperAdminAuth(JSON.parse(stored)); } catch { sessionStorage.removeItem('superAdminAuth'); } }, []);
    useEffect(() => { if (superAdminAuth && isSuperAdmin) fetchSuperAdminData(); }, [superAdminAuth, isSuperAdmin]);

    const handleSuperAdminAuth = (email: string, secret: string) => { sessionStorage.setItem('superAdminAuth', JSON.stringify({ email, secret })); setSuperAdminAuth({ email, secret }); setShowAuthModal(false); showToast('Super admin authenticated', 'success'); };

    const fetchSuperAdminData = async () => {
        if (!superAdminAuth) return;
        setIsLoadingIPs(true);
        try {
            const res = await fetch('/api/super-admin/ip/blocked', { headers: { 'Authorization': `Bearer ${tokenManager.getAccessToken()}`, 'x-super-admin-email': superAdminAuth.email, 'x-super-admin-secret': superAdminAuth.secret } });
            if (res.ok) { const d = await res.json(); setBlockedIPs(d.ips || []); }
            else if (res.status === 404) { sessionStorage.removeItem('superAdminAuth'); setSuperAdminAuth(null); showToast('Auth failed', 'error'); setShowAuthModal(true); return; }
        } catch { }
        setIsLoadingIPs(false);
        setIsLoadingStats(true);
        try { const res = await fetch('/api/super-admin/stats', { headers: { 'Authorization': `Bearer ${tokenManager.getAccessToken()}`, 'x-super-admin-email': superAdminAuth.email, 'x-super-admin-secret': superAdminAuth.secret } }); if (res.ok) { const d = await res.json(); setSystemStats(d.stats); } } catch { }
        setIsLoadingStats(false);
    };

    const handleBlockIP = async () => {
        if (!superAdminAuth || !newIP) return;
        try { const res = await fetch('/api/super-admin/ip/block', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-super-admin-email': superAdminAuth.email, 'x-super-admin-secret': superAdminAuth.secret }, body: JSON.stringify({ ip: newIP, reason: newIPReason }) }); if (res.ok) { showToast(`IP ${newIP} blocked`, 'success'); setNewIP(''); setNewIPReason(''); fetchSuperAdminData(); } else { const d = await res.json(); showToast(d.error || 'Failed', 'error'); } } catch { showToast('Failed', 'error'); }
    };

    const handleUnblockIP = async (ip: string) => {
        if (!superAdminAuth) return;
        try { const res = await fetch(`/api/super-admin/ip/unblock/${encodeURIComponent(ip)}`, { method: 'DELETE', headers: { 'x-super-admin-email': superAdminAuth.email, 'x-super-admin-secret': superAdminAuth.secret } }); if (res.ok) { showToast(`IP ${ip} unblocked`, 'success'); fetchSuperAdminData(); } } catch { showToast('Failed', 'error'); }
    };

    const handleSave = async () => {
        if (!formData) return;
        try { await updateMutation.mutateAsync(formData); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 2000); showToast('Saved', 'success'); } catch (e: any) { showToast(e.message || 'Failed', 'error'); }
    };

    const handleUpdateMaintenanceMode = async (enabled: boolean) => {
        if (!superAdminAuth) { setShowAuthModal(true); return; }
        try { const res = await fetch('/api/super-admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenManager.getAccessToken()}`, 'x-super-admin-email': superAdminAuth.email, 'x-super-admin-secret': superAdminAuth.secret }, body: JSON.stringify({ key: 'maintenanceMode', value: String(enabled) }) }); if (res.ok) { setFormData(p => p ? { ...p, maintenanceMode: enabled } : null); queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }); showToast(`Maintenance ${enabled ? 'enabled' : 'disabled'}`, 'success'); } else { const d = await res.json(); showToast(d.message || 'Failed', 'error'); } } catch { showToast('Failed', 'error'); }
    };

    if (isLoading || !formData) return <div className="flex items-center justify-center h-96"><Loader2 size={32} className="text-white animate-spin" /></div>;

    const baseTabs: { id: TabId; label: string; icon: any }[] = [{ id: 'store', label: 'Store', icon: Building2 }, { id: 'payment', label: 'Payment', icon: CreditCard }, { id: 'shipping', label: 'Shipping', icon: Truck }, { id: 'orders', label: 'Orders', icon: Package }, { id: 'reviews', label: 'Reviews', icon: Star }, { id: 'security', label: 'Security', icon: Shield }];
    const superAdminTabs: { id: TabId; label: string; icon: any }[] = [{ id: 'system', label: 'System', icon: Server }, { id: 'blocked-ips', label: 'IPs', icon: Ban }, { id: 'database', label: 'Database', icon: Database }];
    const tabs = isSuperAdmin ? [...baseTabs, ...superAdminTabs] : baseTabs;

    const renderContent = () => {
        switch (activeTab) {
            case 'store': return (
                <div className="space-y-4">
                    <SettingsCard title="Business Info" icon={Building2} isMobile={isMobile}>
                        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <SettingsInput label="Store Name" value={formData.siteName} onChange={v => setFormData({ ...formData, siteName: v })} icon={Building2} />
                            <SettingsInput label="Email" value={formData.supportEmail} onChange={v => setFormData({ ...formData, supportEmail: v })} type="email" icon={Mail} />
                            <SettingsInput label="Phone" value={formData.supportPhone} onChange={v => setFormData({ ...formData, supportPhone: v })} icon={Phone} />
                            <SettingsInput label="Address" value={formData.businessAddress} onChange={v => setFormData({ ...formData, businessAddress: v })} icon={MapPin} />
                        </div>
                    </SettingsCard>
                    <SettingsCard title="Social Media" icon={Globe} isMobile={isMobile}>
                        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <SettingsInput label="Instagram" value={formData.socialLinks.instagram} onChange={v => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, instagram: v } })} />
                            <SettingsInput label="Facebook" value={formData.socialLinks.facebook} onChange={v => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, facebook: v } })} />
                            <SettingsInput label="Twitter" value={formData.socialLinks.twitter} onChange={v => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, twitter: v } })} />
                            <SettingsInput label="WhatsApp" value={formData.socialLinks.whatsapp} onChange={v => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, whatsapp: v } })} />
                        </div>
                    </SettingsCard>
                </div>
            );
            case 'payment': return (
                <div className="space-y-4">
                    <SettingsCard title="Payment Methods" icon={CreditCard} isMobile={isMobile}>
                        <div className="space-y-3">
                            <OptionRow title="Card / Mobile (Paystack)" description="Cards, mobile money, bank transfers" checked={formData.paymentMethods.card} onChange={v => setFormData({ ...formData, paymentMethods: { ...formData.paymentMethods, card: v } })} icon={CreditCard} isMobile={isMobile} />
                            <OptionRow title="Cash on Delivery" description="Pay when order is delivered" checked={formData.paymentMethods.cash} onChange={v => setFormData({ ...formData, paymentMethods: { ...formData.paymentMethods, cash: v } })} isMobile={isMobile} />
                            <OptionRow title="Bank Transfer" description="Direct bank transfers" checked={formData.paymentMethods.transfer} onChange={v => setFormData({ ...formData, paymentMethods: { ...formData.paymentMethods, transfer: v } })} isMobile={isMobile} />
                        </div>
                    </SettingsCard>
                    {formData.paymentMethods.transfer && (
                        <SettingsCard title="Bank Details" icon={Building2} isMobile={isMobile}>
                            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                                <SettingsInput label="Bank Name" value={formData.bankDetails.bankName} onChange={v => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, bankName: v } })} />
                                <SettingsInput label="Account #" value={formData.bankDetails.accountNumber} onChange={v => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountNumber: v } })} />
                                <SettingsInput label="Account Name" value={formData.bankDetails.accountName} onChange={v => setFormData({ ...formData, bankDetails: { ...formData.bankDetails, accountName: v } })} />
                            </div>
                        </SettingsCard>
                    )}
                </div>
            );
            case 'shipping': return (
                <SettingsCard title="Shipping Rates" icon={Truck} isMobile={isMobile}>
                    <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        <SettingsInput label="Flat Rate (GHS)" value={formData.shippingFlatRate} onChange={v => setFormData({ ...formData, shippingFlatRate: Number(v) })} type="number" helper="Standard shipping cost" />
                        <SettingsInput label="Free Threshold (GHS)" value={formData.freeShippingThreshold} onChange={v => setFormData({ ...formData, freeShippingThreshold: Number(v) })} type="number" helper="Free shipping above this amount" />
                    </div>
                </SettingsCard>
            );
            case 'orders': return (
                <div className="space-y-4">
                    <SettingsCard title="Order Limits" icon={Package} isMobile={isMobile}>
                        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            <SettingsInput label="Min Order (GHS)" value={formData.minOrderAmount} onChange={v => setFormData({ ...formData, minOrderAmount: Number(v) })} type="number" />
                            <SettingsInput label="Max Order (GHS)" value={formData.maxOrderAmount} onChange={v => setFormData({ ...formData, maxOrderAmount: Number(v) })} type="number" />
                        </div>
                    </SettingsCard>
                    <SettingsCard title="Notifications" icon={Mail} isMobile={isMobile}>
                        <OptionRow title="Order Confirmation Email" description="Send confirmation to customers" checked={formData.orderConfirmationEmail} onChange={v => setFormData({ ...formData, orderConfirmationEmail: v })} variant="success" isMobile={isMobile} />
                    </SettingsCard>
                    <SettingsCard title="Inventory" icon={Package} isMobile={isMobile}>
                        <SettingsInput label="Low Stock Threshold" value={formData.lowStockThreshold} onChange={v => setFormData({ ...formData, lowStockThreshold: Number(v) })} type="number" />
                    </SettingsCard>
                </div>
            );
            case 'reviews': return (
                <div className="space-y-4">
                    <SettingsCard title="Review Settings" icon={MessageSquare} isMobile={isMobile}>
                        <div className="space-y-3">
                            <OptionRow title="Auto-Approve" description="Approve reviews without moderation" checked={formData.review_auto_approve} onChange={v => setFormData({ ...formData, review_auto_approve: v })} isMobile={isMobile} />
                            <OptionRow title="Anonymous Reviews" description="Allow anonymous submissions" checked={formData.allowAnonymousReviews} onChange={v => setFormData({ ...formData, allowAnonymousReviews: v })} isMobile={isMobile} />
                        </div>
                    </SettingsCard>
                    <SettingsCard title="Requirements" icon={Star} isMobile={isMobile}>
                        <SettingsInput label="Min Review Length" value={formData.minReviewLength} onChange={v => setFormData({ ...formData, minReviewLength: Number(v) })} type="number" />
                    </SettingsCard>
                </div>
            );
            case 'security': return (
                <div className="space-y-4">
                    <SettingsCard title="Account Security" icon={Shield} isMobile={isMobile}>
                        <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl flex items-start gap-3">
                            <Shield size={16} className="text-zinc-400 mt-0.5" />
                            <div><h3 className="text-sm text-white font-medium">Password</h3><p className="text-xs text-zinc-400">Go to Profile to change password</p></div>
                        </div>
                    </SettingsCard>
                    {isSuperAdmin && (
                        <SettingsCard title="Maintenance Mode" icon={AlertTriangle} superAdmin isMobile={isMobile}>
                            <div className="space-y-3">
                                <OptionRow title="Enable Maintenance" description="Disable storefront for customers" checked={formData.maintenanceMode} onChange={handleUpdateMaintenanceMode} variant="danger" icon={AlertTriangle} isMobile={isMobile} />
                                {formData.maintenanceMode && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /><span className="text-xs text-red-400">Maintenance ON</span></div>}
                            </div>
                        </SettingsCard>
                    )}
                </div>
            );
            case 'system': return superAdminAuth ? (
                <SettingsCard title="System Health" icon={Activity} superAdmin isMobile={isMobile}>
                    <div className="flex justify-end mb-4"><button onClick={fetchSuperAdminData} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"><RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} /></button></div>
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
                        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Activity size={14} className="text-emerald-500" /><span className="text-[10px] text-zinc-500 uppercase font-bold">Server</span></div><span className="text-lg font-mono text-emerald-500">Operational</span><p className="text-[10px] text-zinc-500 mt-1">Uptime: {systemStats?.uptime ? Math.floor(systemStats.uptime / 60) + 'm' : '--'}</p></div>
                        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Database size={14} className={systemStats?.dbStatus === 'connected' ? 'text-blue-500' : 'text-red-500'} /><span className="text-[10px] text-zinc-500 uppercase font-bold">Database</span></div><span className={`text-lg font-mono ${systemStats?.dbStatus === 'connected' ? 'text-blue-500' : 'text-red-500'}`}>{systemStats?.dbStatus === 'connected' ? 'Connected' : 'Disconnected'}</span></div>
                        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Server size={14} className="text-purple-500" /><span className="text-[10px] text-zinc-500 uppercase font-bold">Environment</span></div><span className="text-lg font-mono text-purple-500">{systemStats?.node_env || 'dev'}</span></div>
                    </div>
                </SettingsCard>
            ) : <AuthRequired onAuth={() => setShowAuthModal(true)} />;
            case 'blocked-ips': return superAdminAuth ? (
                <SettingsCard title="IP Blocking" icon={Ban} superAdmin isMobile={isMobile}>
                    <div className="mb-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl">
                        <p className="text-xs text-white font-bold uppercase mb-3">Block New IP</p>
                        <div className={`flex gap-3 ${isMobile ? 'flex-col' : ''}`}>
                            <input type="text" placeholder="IP Address" value={newIP} onChange={e => setNewIP(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 p-3 text-sm text-white rounded-xl" />
                            <input type="text" placeholder="Reason" value={newIPReason} onChange={e => setNewIPReason(e.target.value)} className="flex-1 bg-zinc-800 border border-zinc-700 p-3 text-sm text-white rounded-xl" />
                            <button onClick={handleBlockIP} className={`px-6 py-3 bg-red-500 text-white text-xs font-bold uppercase rounded-xl ${isMobile ? 'w-full' : ''}`}>Block</button>
                        </div>
                    </div>
                    <div className="border border-zinc-800/50 rounded-xl overflow-hidden">
                        <div className="bg-zinc-900/50 px-4 py-3 border-b border-zinc-800/50"><span className="text-[10px] text-zinc-500 font-bold uppercase">Blocked ({blockedIPs.length})</span></div>
                        {isLoadingIPs ? <div className="p-8 text-center"><Loader2 className="animate-spin text-amber-500 mx-auto" size={24} /></div> : blockedIPs.length === 0 ? <div className="p-6 text-center text-zinc-500 text-sm">No blocked IPs</div> : (
                            <div className="divide-y divide-zinc-800/50">{blockedIPs.map(item => (<div key={item.id} className="flex items-center justify-between px-4 py-3"><div><span className="text-sm text-white font-mono">{item.ip}</span>{item.reason && <span className="text-xs text-zinc-500 ml-3">{item.reason}</span>}</div><button onClick={() => handleUnblockIP(item.ip)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={14} /></button></div>))}</div>
                        )}
                    </div>
                </SettingsCard>
            ) : <AuthRequired onAuth={() => setShowAuthModal(true)} />;
            case 'database': return superAdminAuth ? (
                <SettingsCard title="Database Stats" icon={Database} superAdmin isMobile={isMobile}>
                    <div className="flex justify-end mb-4"><button onClick={fetchSuperAdminData} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-lg"><RefreshCw size={16} className={isLoadingStats ? 'animate-spin' : ''} /></button></div>
                    <div className={`grid gap-3 mb-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                        {[{ l: 'Users', v: systemStats?.users }, { l: 'Orders', v: systemStats?.orders }, { l: 'Products', v: systemStats?.products }, { l: 'Items', v: systemStats?.orderItems }, { l: 'Addresses', v: systemStats?.addresses }, { l: 'Settings', v: systemStats?.settings }, { l: 'Blocked', v: systemStats?.blockedIps }].map((s, i) => (<div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3"><span className="text-[9px] text-zinc-500 uppercase font-bold">{s.l}</span><p className="text-xl font-mono text-white mt-1">{isLoadingStats ? '--' : (s.v ?? 0)}</p></div>))}
                    </div>
                    <div className={`p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                        <div><h3 className="text-sm font-bold text-white uppercase">Cloud Backup</h3><p className="text-xs text-zinc-400 mt-1">Backup to R2 storage</p></div>
                        <button onClick={async () => { if (!superAdminAuth) return; try { showToast('Backing up...', 'info'); const res = await fetch('/api/super-admin/backup', { headers: { 'Authorization': `Bearer ${tokenManager.getAccessToken()}`, 'x-super-admin-email': superAdminAuth.email, 'x-super-admin-secret': superAdminAuth.secret } }); const d = await res.json(); if (res.ok && d.success) showToast(`✅ ${d.message}`, 'success'); else showToast(d.error || 'Failed', 'error'); } catch { showToast('Failed', 'error'); } }} className={`px-4 py-2 bg-zinc-900 border border-zinc-700 text-white text-xs font-bold uppercase rounded-xl flex items-center gap-2 ${isMobile ? 'justify-center' : ''}`}><Database size={14} />Backup</button>
                    </div>
                </SettingsCard>
            ) : <AuthRequired onAuth={() => setShowAuthModal(true)} />;
            default: return null;
        }
    };

    // ==================== MOBILE LAYOUT ====================
    if (isMobile) {
        return (
            <div className="space-y-4 pb-24">
                <SuperAdminAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthenticate={handleSuperAdminAuth} isMobile />

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg text-white font-semibold">Settings</h1>
                        {isSuperAdmin && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-[9px] font-bold uppercase rounded-full flex items-center gap-1"><Crown size={10} />Super</span>}
                    </div>
                    <button onClick={handleSave} disabled={updateMutation.isPending} className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-black'} disabled:opacity-50`}>
                        {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
                        {saveSuccess ? 'Saved!' : 'Save'}
                    </button>
                </div>

                {/* Horizontal Scrollable Tabs */}
                <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab, i) => (
                            <button key={tab.id} onClick={() => { if (i >= baseTabs.length && !superAdminAuth) setShowAuthModal(true); else setActiveTab(tab.id); }} className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? (i >= baseTabs.length ? 'bg-amber-500/20 text-amber-500' : 'bg-white text-black') : (i >= baseTabs.length ? 'bg-amber-500/10 text-amber-500/60' : 'bg-zinc-800 text-zinc-400')}`}>
                                <tab.icon size={14} />{tab.label}{i >= baseTabs.length && !superAdminAuth && <span>🔒</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-zinc-800/50 -mx-4" />

                {/* Content */}
                {renderContent()}
            </div>
        );
    }

    // ==================== DESKTOP LAYOUT ====================
    return (
        <div className="min-h-screen p-6 lg:p-8 pb-20">
            <SuperAdminAuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuthenticate={handleSuperAdminAuth} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3"><h1 className="text-2xl text-white font-semibold">Settings</h1>{isSuperAdmin && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-500 text-[10px] font-bold uppercase rounded-full border border-amber-500/20"><Crown size={11} />Super Admin</span>}</div>
                    <p className="text-sm text-zinc-500 mt-1">Manage your store configuration</p>
                </div>
                <div className="flex gap-3">
                    {isSuperAdmin && !superAdminAuth && <button onClick={() => setShowAuthModal(true)} className="px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold uppercase rounded-lg flex items-center gap-2"><Crown size={14} />Unlock Super</button>}
                    <button onClick={handleSave} disabled={updateMutation.isPending} className={`px-6 py-2.5 text-xs font-bold uppercase rounded-lg flex items-center gap-2 shadow-lg ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-[#00C3F7] to-[#00A8D6] text-black'} disabled:opacity-50`}>
                        {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}{saveSuccess ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar */}
                <div className="w-full lg:w-56 flex-shrink-0">
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-2 space-y-1 sticky top-4">
                        {tabs.map((tab, i) => (
                            <div key={tab.id}>
                                {isSuperAdmin && i === baseTabs.length && <div className="my-3 px-3"><div className="border-t border-amber-500/20" /><span className="block text-[9px] text-amber-500/60 font-bold uppercase mt-2">Developer Only</span></div>}
                                <button onClick={() => { if (i >= baseTabs.length && !superAdminAuth) setShowAuthModal(true); else setActiveTab(tab.id); }} className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide rounded-lg ${activeTab === tab.id ? (i >= baseTabs.length ? 'bg-amber-500/10 text-amber-500' : 'bg-[#00C3F7]/10 text-[#00C3F7]') : (i >= baseTabs.length ? 'text-amber-500/50 hover:text-amber-500' : 'text-zinc-500 hover:text-white')}`}>
                                    <tab.icon size={16} />{tab.label}{i >= baseTabs.length && !superAdminAuth && <span className="ml-auto text-[10px]">🔒</span>}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">{renderContent()}</div>
            </div>
        </div>
    );
}

function AuthRequired({ onAuth }: { onAuth: () => void }) {
    return (
        <div className="bg-zinc-900/30 border border-amber-500/20 rounded-xl p-8 text-center">
            <div className="p-4 bg-amber-500/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center"><Crown className="text-amber-500" size={28} /></div>
            <h3 className="text-sm font-bold text-amber-500 uppercase mb-2">Authentication Required</h3>
            <p className="text-sm text-zinc-400 mb-6">Enter your credentials to access this section</p>
            <button onClick={onAuth} className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-xs font-bold uppercase rounded-xl">Authenticate</button>
        </div>
    );
}
