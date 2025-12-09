import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/lib/hooks/useCart';

export default function CartButton() {
    const { data: cart } = useCart();
    const itemCount = cart?.items_count || 0;

    return (
        <Link to="/cart" className="relative p-2 text-zinc-500 hover:text-white transition-colors group">
            <ShoppingBag size={20} />
            {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center font-mono">
                    {itemCount}
                </span>
            )}
        </Link>
    );
}
