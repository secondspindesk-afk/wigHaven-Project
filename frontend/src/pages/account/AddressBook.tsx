import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { useToast } from '@/contexts/ToastContext';
import { Plus, MapPin, Trash2, Edit2, Check, Loader2, X } from 'lucide-react';
import { Address } from '@/lib/types';

// Ghana regions
const GHANA_REGIONS = [
    'Greater Accra',
    'Ashanti',
    'Western',
    'Eastern',
    'Central',
    'Northern',
    'Upper East',
    'Upper West',
    'Volta',
    'Bono',
    'Bono East',
    'Ahafo',
    'Western North',
    'Oti',
    'North East',
    'Savannah',
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

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
    });

    const openModal = (address?: Address) => {
        if (address) {
            setEditingAddress(address);
            reset({
                name: address.name,
                street: address.street,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode || '',
                country: address.country,
                phone: address.phone,
                isDefault: address.isDefault,
            });
        } else {
            setEditingAddress(null);
            reset({
                name: '',
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: 'Ghana',
                phone: '',
                isDefault: false,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAddress(null);
        reset();
    };

    const onSubmit = (data: AddressFormData) => {
        if (editingAddress) {
            updateAddress.mutate(
                { id: editingAddress.id, data },
                { onSuccess: closeModal }
            );
        } else {
            addAddress.mutate(data, { onSuccess: closeModal });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-xl font-bold text-white uppercase tracking-wider">Address Book</h1>
                <button
                    onClick={() => openModal()}
                    className="bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                    <Plus size={16} />
                    Add New Address
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((address) => (
                    <div
                        key={address.id}
                        className={`bg-[#0A0A0A] border rounded-lg p-6 relative group ${address.isDefault ? 'border-zinc-500' : 'border-[#27272a]'
                            }`}
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
                            <button
                                onClick={() => openModal(address)}
                                className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1"
                            >
                                <Edit2 size={12} /> Edit
                            </button>
                            <div className="w-px h-3 bg-[#27272a]" />
                            <button
                                onClick={() => {
                                    if (addresses.length === 1) {
                                        return;
                                    }
                                    showConfirm({
                                        title: 'Delete Address',
                                        message: 'Are you sure you want to delete this address?',
                                        onConfirm: () => deleteAddress.mutate(address.id),
                                        confirmText: 'Delete',
                                        cancelText: 'Cancel'
                                    });
                                }}
                                disabled={addresses.length === 1}
                                className="text-xs font-bold text-red-400 hover:text-red-300 uppercase tracking-wider flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title={addresses.length === 1 ? 'Cannot delete: You must have at least one address' : 'Delete address'}
                            >
                                <Trash2 size={12} /> Delete
                            </button>
                            {!address.isDefault && (
                                <>
                                    <div className="w-px h-3 bg-[#27272a]" />
                                    <button
                                        onClick={() => setDefaultAddress.mutate(address.id)}
                                        className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1"
                                    >
                                        <Check size={12} /> Set Default
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg w-full max-w-lg p-8 relative">
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-lg font-bold text-white uppercase tracking-wider mb-6">
                            {editingAddress ? 'Edit Address' : 'Add New Address'}
                        </h2>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                                <input
                                    {...register('name')}
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                />
                                {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Street Address</label>
                                <input
                                    {...register('street')}
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                />
                                {errors.street && <p className="text-xs text-red-400">{errors.street.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">City</label>
                                    <input
                                        {...register('city')}
                                        className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                    />
                                    {errors.city && <p className="text-xs text-red-400">{errors.city.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Region</label>
                                    <select
                                        {...register('state')}
                                        className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                    >
                                        <option value="">Select Region</option>
                                        {GHANA_REGIONS.map((region) => (
                                            <option key={region} value={region}>
                                                {region}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.state && <p className="text-xs text-red-400">{errors.state.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Country</label>
                                <input
                                    {...register('country')}
                                    defaultValue="Ghana"
                                    readOnly
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-zinc-400 focus:outline-none cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
                                <input
                                    {...register('phone')}
                                    placeholder="+233 XX XXX XXXX"
                                    className="w-full bg-[#050505] border border-[#27272a] rounded-sm px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors"
                                />
                                {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    {...register('isDefault')}
                                    className="rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0"
                                />
                                <label htmlFor="isDefault" className="text-xs text-zinc-400">Set as default address</label>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-sm hover:bg-zinc-200 transition-colors mt-6 flex items-center justify-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingAddress ? 'Update Address' : 'Save Address'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
