import { useAddresses } from '@/lib/hooks/useAddresses';
import { MapPin, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ShippingStepProps {
    selectedAddressId: string | null;
    onSelectAddress: (id: string) => void;
    onNext: () => void;
}

export default function ShippingStep({ selectedAddressId, onSelectAddress, onNext }: ShippingStepProps) {
    const { addresses, isLoading } = useAddresses();

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-bold text-white uppercase tracking-wider mb-8">Select Shipping Address</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {addresses.map((address) => (
                    <div
                        key={address.id}
                        onClick={() => onSelectAddress(address.id)}
                        className={`cursor-pointer border rounded-lg p-6 relative transition-all ${selectedAddressId === address.id
                            ? 'bg-white/5 border-white'
                            : 'bg-[#0A0A0A] border-[#27272a] hover:border-zinc-600'
                            }`}
                    >
                        {selectedAddressId === address.id && (
                            <div className="absolute top-4 right-4 text-white">
                                <CheckCircle2 size={20} className="fill-white text-black" />
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <MapPin className={`mt-1 ${selectedAddressId === address.id ? 'text-white' : 'text-zinc-500'}`} size={20} />
                            <div>
                                <h3 className="text-white font-bold text-sm">{address.name}</h3>
                                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                                    {address.street}<br />
                                    {address.city}, {address.state} {address.zipCode}<br />
                                    {address.country}
                                </p>
                                <p className="text-zinc-500 text-xs mt-2 font-mono">{address.phone}</p>
                            </div>
                        </div>
                    </div>
                ))}

                <Link
                    to="/account/addresses"
                    className="border border-dashed border-[#27272a] rounded-lg p-6 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors min-h-[160px]"
                >
                    <Plus size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">Add New Address</span>
                </Link>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={onNext}
                    disabled={!selectedAddressId}
                    className="bg-white text-black px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue to Review
                </button>
            </div>
        </div>
    );
}
