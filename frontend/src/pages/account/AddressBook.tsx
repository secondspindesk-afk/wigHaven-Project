import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { useToast } from '@/contexts/ToastContext';
import { Plus, MapPin, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import SectionLoader from '@/components/ui/SectionLoader';
import BrandedSpinner from '@/components/ui/BrandedSpinner';
import { Address } from '@/lib/types';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const GHANA_REGIONS = [
    'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central', 'Northern',
    'Upper East', 'Upper West', 'Volta', 'Bono', 'Bono East', 'Ahafo',
    'Western North', 'Oti', 'North East', 'Savannah',
];

const addressSchema = z.object({
    name: z.string().min(2, 'Full name is required'),
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'Region is required'),
    zipCode: z.string(),
    country: z.string().min(2, 'Country is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressBook() {
    const { addresses, isLoading, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAddresses();
    const { showConfirm } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [regionPickerOpen, setRegionPickerOpen] = useState(false);
    const isMobile = useIsMobile();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting, dirtyFields },
    } = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
    });

    // OPTIMIZATION: Track original data for _changedFields
    const originalDataRef = useRef<AddressFormData | null>(null);

    const selectedRegion = watch('state');

    const openModal = (address?: Address) => {
        if (address) {
            setEditingAddress(address);
            const addressData = {
                name: address.name,
                street: address.street,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode || '',
                country: address.country,
                phone: address.phone,
                isDefault: address.isDefault,
            };
            reset(addressData);
            // Store original for dirty tracking
            originalDataRef.current = addressData;
        } else {
            setEditingAddress(null);
            originalDataRef.current = null;
            reset({
                name: '', street: '', city: '', state: '', zipCode: '',
                country: 'Ghana', phone: '', isDefault: false,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAddress(null);
        setRegionPickerOpen(false);
        reset();
    };

    // OPTIMIZATION: Send only changed fields with _changedFields directive
    const onSubmit = (data: AddressFormData) => {
        if (editingAddress) {
            const changedFieldNames = Object.keys(dirtyFields) as (keyof AddressFormData)[];

            // Skip if nothing changed
            if (changedFieldNames.length === 0) {
                showToast('No changes to save', 'info');
                closeModal();
                return;
            }

            // Build payload with only changed fields
            const payload: Partial<AddressFormData> & { _changedFields: string[] } = {
                _changedFields: changedFieldNames
            };
            changedFieldNames.forEach(field => {
                (payload as any)[field] = data[field];
            });

            console.log('[PERF] Sending only changed fields:', changedFieldNames);
            updateAddress.mutate({ id: editingAddress.id, data: payload as any }, { onSuccess: closeModal });
        } else {
            addAddress.mutate(data, { onSuccess: closeModal });
        }
    };

    const { showToast } = useToast();

    // Lock body scroll when modal is open on mobile
    useEffect(() => {
        if (isModalOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isModalOpen, isMobile]);

    if (isLoading) {
        return <SectionLoader className="min-h-[400px]" />;
    }

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-xl font-bold text-white">Addresses</h1>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2.5 text-xs font-bold rounded-lg"
                    >
                        <Plus size={16} /> Add
                    </button>
                </div>

                <div className="space-y-3">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className={`bg-zinc-900 rounded-xl p-4 ${address.isDefault ? 'ring-1 ring-zinc-600' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-zinc-500" />
                                    <h3 className="text-sm font-bold text-white">{address.name}</h3>
                                </div>
                                {address.isDefault && (
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full font-bold uppercase">
                                        Default
                                    </span>
                                )}
                            </div>

                            <div className="text-sm text-zinc-400 leading-relaxed mb-3 pl-6">
                                <p>{address.street}</p>
                                <p>{address.city}, {address.state}</p>
                                <p className="text-zinc-500 text-xs mt-1">{address.phone}</p>
                            </div>

                            <div className="flex items-center gap-4 pt-3 border-t border-zinc-800">
                                <button
                                    onClick={() => openModal(address)}
                                    className="text-xs font-bold text-zinc-400 flex items-center gap-1"
                                >
                                    <Edit2 size={12} /> Edit
                                </button>
                                <button
                                    onClick={() => {
                                        if (addresses.length === 1) return;
                                        showConfirm({
                                            title: 'Delete Address',
                                            message: 'Are you sure?',
                                            onConfirm: () => deleteAddress.mutate(address.id),
                                            confirmText: 'Delete',
                                            cancelText: 'Cancel'
                                        });
                                    }}
                                    disabled={addresses.length === 1}
                                    className="text-xs font-bold text-red-400 flex items-center gap-1 disabled:opacity-30"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                                {!address.isDefault && (
                                    <button
                                        onClick={() => setDefaultAddress.mutate(address.id)}
                                        className="text-xs font-bold text-zinc-400 flex items-center gap-1 ml-auto"
                                    >
                                        <Check size={12} /> Set Default
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile Full-Screen Modal */}
                {isModalOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-[#050505]">
                        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                            <h2 className="text-lg font-bold text-white">
                                {editingAddress ? 'Edit Address' : 'Add Address'}
                            </h2>
                            <button onClick={closeModal} className="p-2 text-zinc-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100vh - 64px - 80px)' }}>
                            <form id="address-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Full Name</label>
                                    <input
                                        {...register('name')}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                                    />
                                    {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Street Address</label>
                                    <input
                                        {...register('street')}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                                    />
                                    {errors.street && <p className="text-xs text-red-400 mt-1">{errors.street.message}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">City</label>
                                        <input
                                            {...register('city')}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">Region</label>
                                        {/* Custom Region Picker Button */}
                                        <button
                                            type="button"
                                            onClick={() => setRegionPickerOpen(true)}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between focus:outline-none focus:border-zinc-500"
                                        >
                                            <span className={selectedRegion ? 'text-white' : 'text-zinc-500'}>
                                                {selectedRegion || 'Select Region'}
                                            </span>
                                            <ChevronDown size={16} className="text-zinc-500" />
                                        </button>
                                        {errors.state && <p className="text-xs text-red-400 mt-1">{errors.state.message}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">Phone</label>
                                    <input
                                        {...register('phone')}
                                        placeholder="+233 XX XXX XXXX"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500"
                                    />
                                    {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone.message}</p>}
                                </div>

                                <input type="hidden" {...register('country')} value="Ghana" />

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        {...register('isDefault')}
                                        className="rounded border-zinc-700 bg-zinc-800"
                                    />
                                    <label htmlFor="isDefault" className="text-xs text-zinc-400">Set as default</label>
                                </div>
                            </form>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-[#050505]">
                            <button
                                type="submit"
                                form="address-form"
                                disabled={isSubmitting}
                                className="w-full bg-white text-black py-4 text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                            >
                                {isSubmitting && <BrandedSpinner size="xs" />}
                                {editingAddress ? 'Update Address' : 'Save Address'}
                            </button>
                        </div>

                        {/* Region Picker Bottom Sheet */}
                        {regionPickerOpen && (
                            <div
                                className="fixed inset-0 bg-black/60 z-[10000]"
                                onClick={() => setRegionPickerOpen(false)}
                            >
                                <div
                                    className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-2xl max-h-[70vh] overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="sticky top-0 bg-[#0A0A0A] p-4 border-b border-zinc-800">
                                        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-white text-center">Select Region</h3>
                                    </div>
                                    <div className="overflow-y-auto max-h-[calc(70vh-80px)] p-2">
                                        {GHANA_REGIONS.map((region) => (
                                            <button
                                                key={region}
                                                onClick={() => {
                                                    setValue('state', region);
                                                    setRegionPickerOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-4 rounded-xl transition-colors flex items-center justify-between ${selectedRegion === region
                                                    ? 'bg-white text-black'
                                                    : 'text-zinc-300 active:bg-zinc-800'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium">{region}</span>
                                                {selectedRegion === region && <Check size={18} />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="h-8" />
                                </div>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>
        );
    }

    // Desktop Layout (unchanged)
    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-white uppercase tracking-wider">Address Book</h1>
                <button
                    onClick={() => openModal()}
                    className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} /> Add New Address
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((address) => (
                    <div
                        key={address.id}
                        className={`bg-[#0A0A0A] border rounded-lg p-6 relative group ${address.isDefault ? 'border-zinc-500' : 'border-[#27272a]'}`}
                    >
                        {address.isDefault && (
                            <span className="absolute top-4 right-4 bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                                Default
                            </span>
                        )}

                        <div className="flex items-start gap-3 mb-4">
                            <MapPin className="text-zinc-500 mt-1" size={20} />
                            <div>
                                <h3 className="text-white font-bold text-sm">{address.name}</h3>
                                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                                    {address.street}<br />
                                    {address.city}, {address.state}<br />
                                    {address.country}
                                </p>
                                <p className="text-zinc-500 text-xs mt-2 font-mono">{address.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#27272a]">
                            <button onClick={() => openModal(address)} className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                <Edit2 size={12} /> Edit
                            </button>
                            <div className="w-px h-3 bg-[#27272a]" />
                            <button
                                onClick={() => {
                                    if (addresses.length === 1) return;
                                    showConfirm({ title: 'Delete Address', message: 'Are you sure?', onConfirm: () => deleteAddress.mutate(address.id), confirmText: 'Delete', cancelText: 'Cancel' });
                                }}
                                disabled={addresses.length === 1}
                                className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                            >
                                <Trash2 size={12} /> Delete
                            </button>
                            {!address.isDefault && (
                                <>
                                    <div className="w-px h-3 bg-[#27272a]" />
                                    <button onClick={() => setDefaultAddress.mutate(address.id)} className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                                        <Check size={12} /> Set Default
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg w-full max-w-lg p-8 relative">
                        <button onClick={closeModal} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                                <input {...register('name')} className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Street Address</label>
                                <input {...register('street')} className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                                {errors.street && <p className="text-xs text-red-400">{errors.street.message}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">City</label>
                                    <input {...register('city')} className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Region</label>
                                    <select {...register('state')} className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500">
                                        <option value="">Select Region</option>
                                        {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Country</label>
                                <input {...register('country')} defaultValue="Ghana" readOnly className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-zinc-400 cursor-not-allowed" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
                                <input {...register('phone')} placeholder="+233 XX XXX XXXX" className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500" />
                                {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="isDefault" {...register('isDefault')} className="rounded border-zinc-700 bg-zinc-900" />
                                <label htmlFor="isDefault" className="text-xs text-zinc-400">Set as default address</label>
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors mt-6 flex items-center justify-center gap-2">
                                {isSubmitting && <BrandedSpinner size="xs" />}
                                {editingAddress ? 'Update Address' : 'Save Address'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
