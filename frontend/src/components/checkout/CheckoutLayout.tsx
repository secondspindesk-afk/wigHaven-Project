import { Outlet, useLocation, Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import { Check } from 'lucide-react';

const steps = [
    { id: 'shipping', label: 'Shipping' },
    { id: 'review', label: 'Review' },
    { id: 'payment', label: 'Payment' },
];

export default function CheckoutLayout() {
    const location = useLocation();
    const currentStepIndex = steps.findIndex(step => location.pathname.includes(step.id));

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans">
            {/* Header */}
            <header className="border-b border-[#27272a] bg-[#050505] sticky top-0 z-50">
                <div className="container px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <Logo size="sm" className="w-8 h-8" />
                        <span className="font-semibold text-lg tracking-[0.2em] uppercase hidden md:block">WigHaven</span>
                    </Link>

                    <div className="flex items-center gap-2 md:gap-4">
                        {steps.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step.id} className="flex items-center">
                                    <div className={`flex items-center gap-2 ${isCurrent ? 'text-white' : isCompleted ? 'text-green-400' : 'text-zinc-600'}`}>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${isCompleted ? 'bg-green-500/10 border-green-500/50' :
                                                isCurrent ? 'bg-white text-black border-white' :
                                                    'border-zinc-700 bg-zinc-900'
                                            }`}>
                                            {isCompleted ? <Check size={12} /> : index + 1}
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider hidden md:block">{step.label}</span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className={`w-8 md:w-16 h-px mx-2 md:mx-4 ${isCompleted ? 'bg-green-500/30' : 'bg-zinc-800'}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Link to="/cart" className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest">
                        Back to Cart
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="container px-4 py-8 md:py-12">
                <Outlet />
            </main>
        </div>
    );
}
