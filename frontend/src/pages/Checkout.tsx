import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheckout } from '@/lib/hooks/useCheckout';
import { useUser } from '@/lib/hooks/useUser';
import { useCart } from '@/lib/hooks/useCart';
import { useAddresses } from '@/lib/hooks/useAddresses';

import ShippingStep from '@/components/checkout/ShippingStep';
import ReviewStep from '@/components/checkout/ReviewStep';

type CheckoutStep = 'shipping' | 'review' | 'payment';

export default function Checkout() {
    const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentProvider, setPaymentProvider] = useState('mtn');


    const { data: user } = useUser();
    const { data: cart, clearCart } = useCart();
    const { addresses } = useAddresses();
    const { createOrder } = useCheckout();
    const navigate = useNavigate();

    // Auto-select default address when addresses load
    useEffect(() => {
        if (!selectedAddressId && addresses && addresses.length > 0) {
            const defaultAddress = addresses.find(a => a.isDefault);
            if (defaultAddress) {
                setSelectedAddressId(defaultAddress.id);
            }
        }
    }, [selectedAddressId, addresses]);

    const handleCreateOrder = async () => {
        if (!selectedAddressId || !user || !phoneNumber) return;

        const selectedAddress = addresses.find(a => a.id === selectedAddressId);
        if (!selectedAddress) return;

        // Note: With LocalStorage-first pattern, server cart may be empty
        // Stock validation happens during order creation on the backend

        // Create order data
        const orderData = {
            shipping_address: {
                name: selectedAddress.name,
                address: selectedAddress.street || selectedAddress.city,
                city: selectedAddress.city,
                state: selectedAddress.state,
                zip_code: selectedAddress.zipCode,
                country: selectedAddress.country,
                phone: selectedAddress.phone
            },
            customer_email: user.email,
            customer_phone: phoneNumber, // Mobile money phone
            payment_provider: paymentProvider // 'mtn', 'vod', 'tgo'
        };

        // 3. Create order
        createOrder.mutate(orderData, {
            onSuccess: (data) => {
                // Clear cart immediately after order creation
                clearCart();

                // Navigate to dedicated confirmation page
                const orderNumber = data.order.order_number;
                const email = data.order.customer_email;
                navigate(`/order-confirmation/${orderNumber}${email ? `?email=${encodeURIComponent(email)}` : ''}`);
            }
        });
    };



    if (!cart || cart.items.length === 0) {
        return (
            <div className="text-center py-24">
                <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-4">Your Cart is Empty</h2>
                <button onClick={() => navigate('/shop')} className="text-zinc-400 hover:text-white underline">
                    Continue Shopping
                </button>
            </div>
        );
    }

    return (
        <div>
            {currentStep === 'shipping' && (
                <ShippingStep
                    selectedAddressId={selectedAddressId}
                    onSelectAddress={setSelectedAddressId}
                    onNext={() => setCurrentStep('review')}
                />
            )}

            {currentStep === 'review' && (
                <ReviewStep
                    cart={cart}
                    onBack={() => setCurrentStep('shipping')}
                    onProceed={handleCreateOrder}
                    phoneNumber={phoneNumber}
                    setPhoneNumber={setPhoneNumber}
                    paymentProvider={paymentProvider}
                    setPaymentProvider={setPaymentProvider}
                    isProcessing={createOrder.isPending}
                />
            )}


        </div>
    );
}
