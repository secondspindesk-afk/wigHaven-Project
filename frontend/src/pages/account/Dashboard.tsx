import { Link } from 'react-router-dom';
import { useUser } from '@/lib/hooks/useUser';
import { useOrders } from '@/lib/hooks/useOrders';
import { useWishlist } from '@/lib/hooks/useWishlist';
import { useAddresses } from '@/lib/hooks/useAddresses';
import { ShoppingBag, Heart, MapPin, ArrowRight, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function AccountDashboard() {
    const { data: user } = useUser();
    const { data: ordersData } = useOrders({ page: 1 });
    const { wishlist } = useWishlist();
    const { addresses } = useAddresses();
    const recentOrders = ordersData?.data?.orders?.slice(0, 3) || [];
    const isMobile = useIsMobile();

    // Mobile Layout
    if (isMobile) {
        return (
            <div className="space-y-6">
                {/* Welcome */}
                <div>
                    <h1 className="text-xl font-bold text-white mb-1">
                        Hello, {user?.firstName} 👋
                    </h1>
                    <p className="text-sm text-zinc-500">
                        Manage your account and orders
                    </p>
                </div>

                {/* Quick Stats - Horizontal Scroll */}
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
                    <Link to="/account/orders" className="flex-shrink-0 w-28 bg-zinc-900 rounded-xl p-4 active:bg-zinc-800">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 mb-3">
                            <ShoppingBag size={18} />
                        </div>
                        <p className="text-2xl font-bold text-white">{ordersData?.data?.pagination?.total || 0}</p>
                        <p className="text-xs text-zinc-500">Orders</p>
                    </Link>

                    <Link to="/account/wishlist" className="flex-shrink-0 w-28 bg-zinc-900 rounded-xl p-4 active:bg-zinc-800">
                        <div className="w-10 h-10 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-400 mb-3">
                            <Heart size={18} />
                        </div>
                        <p className="text-2xl font-bold text-white">{wishlist?.length || 0}</p>
                        <p className="text-xs text-zinc-500">Wishlist</p>
                    </Link>

                    <Link to="/account/addresses" className="flex-shrink-0 w-28 bg-zinc-900 rounded-xl p-4 active:bg-zinc-800">
                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-400 mb-3">
                            <MapPin size={18} />
                        </div>
                        <p className="text-2xl font-bold text-white">{addresses?.length || 0}</p>
                        <p className="text-xs text-zinc-500">Addresses</p>
                    </Link>
                </div>

                {/* Recent Orders */}
                <div className="bg-zinc-900 rounded-xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                        <h2 className="text-sm font-bold text-white">Recent Orders</h2>
                        <Link to="/account/orders" className="text-xs text-zinc-500 flex items-center gap-1">
                            View All <ChevronRight size={14} />
                        </Link>
                    </div>

                    {recentOrders.length > 0 ? (
                        <div className="divide-y divide-zinc-800">
                            {recentOrders.map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/account/orders/${order.order_number}`}
                                    className="flex items-center justify-between p-4 active:bg-zinc-800"
                                >
                                    <div>
                                        <p className="text-sm text-white font-medium">#{order.order_number}</p>
                                        <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                                                order.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                        <ChevronRight size={16} className="text-zinc-600" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <p className="text-zinc-500 text-sm mb-4">No orders yet</p>
                            <Link to="/shop" className="inline-block bg-white text-black px-6 py-3 text-xs font-bold rounded-lg">
                                Start Shopping
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Link to="/account/profile" className="bg-zinc-900 rounded-xl p-4 active:bg-zinc-800">
                        <p className="text-sm font-medium text-white mb-1">Edit Profile</p>
                        <p className="text-xs text-zinc-500">Update your info</p>
                    </Link>
                    <Link to="/account/addresses" className="bg-zinc-900 rounded-xl p-4 active:bg-zinc-800">
                        <p className="text-sm font-medium text-white mb-1">Add Address</p>
                        <p className="text-xs text-zinc-500">Manage delivery</p>
                    </Link>
                </div>
            </div>
        );
    }

    // Desktop Layout
    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg p-8">
                <h1 className="text-2xl font-bold text-white uppercase tracking-wider mb-2">
                    Hello, {user?.firstName}
                </h1>
                <p className="text-zinc-400 text-sm font-mono">
                    From your account dashboard you can view your recent orders, manage your shipping and billing addresses, and edit your password and account details.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/account/orders" className="bg-[#0A0A0A] border border-[#27272a] p-6 rounded-lg hover:border-zinc-600 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                            <ShoppingBag size={20} />
                        </div>
                        <span className="text-2xl font-bold text-white">{ordersData?.data?.pagination?.total || 0}</span>
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Orders</h3>
                </Link>

                <Link to="/account/wishlist" className="bg-[#0A0A0A] border border-[#27272a] p-6 rounded-lg hover:border-zinc-600 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-pink-500/10 rounded-full text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                            <Heart size={20} />
                        </div>
                        <span className="text-2xl font-bold text-white">{wishlist?.length || 0}</span>
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Wishlist Items</h3>
                </Link>

                <Link to="/account/addresses" className="bg-[#0A0A0A] border border-[#27272a] p-6 rounded-lg hover:border-zinc-600 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors">
                            <MapPin size={20} />
                        </div>
                        <span className="text-2xl font-bold text-white">{addresses?.length || 0}</span>
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Saved Addresses</h3>
                </Link>
            </div>

            {/* Recent Orders */}
            <div className="bg-[#0A0A0A] border border-[#27272a] rounded-lg overflow-hidden">
                <div className="p-6 border-b border-[#27272a] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white uppercase tracking-widest">Recent Orders</h2>
                    <Link to="/account/orders" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
                        View All <ArrowRight size={12} />
                    </Link>
                </div>

                {recentOrders.length > 0 ? (
                    <div className="divide-y divide-[#27272a]">
                        {recentOrders.map((order) => (
                            <div key={order.id} className="p-6 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                                <div>
                                    <p className="text-white font-bold text-sm mb-1">#{order.order_number}</p>
                                    <p className="text-zinc-500 text-xs font-mono">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.status === 'delivered' ? 'bg-green-500/10 text-green-400' :
                                        order.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                                            'bg-zinc-800 text-zinc-400'
                                        }`}>
                                        {order.status}
                                    </span>
                                    <Link to={`/account/orders/${order.order_number}`} className="text-xs font-bold text-white underline underline-offset-4 hover:text-zinc-300">
                                        View
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <p className="text-zinc-500 text-sm mb-4">You haven't placed any orders yet.</p>
                        <Link to="/shop" className="inline-block bg-white text-black px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors">
                            Start Shopping
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
