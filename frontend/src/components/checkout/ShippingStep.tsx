import { useAddresses } from '@/lib/hooks/useAddresses';
import { MapPin, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

interface ShippingStepProps {
    selectedAddressId: string | null;
    onSelectAddress: (id: string) => void;
    onNext: () => void;
}

export default function ShippingStep({ selectedAddressId, onSelectAddress, onNext }: ShippingStepProps) {
    const { addresses, isLoading } = useAddresses();
    const isMobile = useIsMobile();

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="min-h-screen bg-[#050505] pb-24">
                {/* Header */}
                <div className="px-4 pt-4 mb-6">
                    <h1 className="text-xl font-bold text-white">Shipping Address</h1>
                    <p className="text-xs text-zinc-500 mt-1">Select a delivery address</p>
                </div>

                {/* Address Cards */}
                <div className="px-4 space-y-3">
                    {addresses.map((address) => (
                        <button
                            key={address.id}
                            onClick={() => onSelectAddress(address.id)}
                            className={`w-full text-left p-4 rounded-xl transition-all ${selectedAddressId === address.id
                                    ? 'bg-white/5 ring-2 ring-white'
                                    : 'bg-zinc-900 active:bg-zinc-800'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                    <MapPin size={18} className={selectedAddressId === address.id ? 'text-white mt-0.5' : 'text-zinc-500 mt-0.5'} />
                                    <div>
                                        <h3 className="text-sm font-bold text-white">{address.name}</h3>
                                        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                                            {address.street}<br />
                                            {address.city}, {address.state}
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">{address.phone}</p>
                                    </div>
                                </div>
                                {selectedAddressId === address.id && (
                                    <CheckCircle2 size={20} className="fill-white text-black flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    ))}

                    {/* Add New Address */}
                    <Link
                        to="/account/addresses"
                        className="block w-full p-4 rounded-xl border-2 border-dashed border-zinc-700 text-center active:border-zinc-500"
                    >
                        <Plus size={20} className="mx-auto text-zinc-500 mb-2" />
                        <span className="text-xs font-bold text-zinc-500 uppercase">Add New Address</span>
                    </Link>
                </div>

                {/* Sticky Continue Button */}
                <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-zinc-800 p-4 z-50">
                    <button
                        onClick={onNext}
                        disabled={!selectedAddressId}
                        className="w-full bg-white text-black font-bold text-sm py-4 rounded-lg disabled:opacity-50"
                    >
                        Continue to Review
                    </button>
                </div>
            </div>
        );
    }

    // Desktop Layout
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
