import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AuthGuard, RequireGuest } from '@/components/layout/AuthGuard';
import AccountLayout from '@/components/layout/AccountLayout';
import ErrorBoundary from '@/components/ErrorBoundary';

// Public Pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyEmail from '@/pages/VerifyEmail';
import PleaseVerifyEmail from '@/pages/PleaseVerifyEmail';
import Cart from '@/pages/Cart';
import Shop from '@/pages/Shop';
import Search from '@/pages/Search';
import ProductDetails from '@/pages/ProductDetails';
import About from '@/pages/About';
import Contact from '@/pages/Contact';

// Account Pages
import AccountDashboard from '@/pages/account/Dashboard';
import Profile from '@/pages/account/Profile';
import AddressBook from '@/pages/account/AddressBook';
import Orders from '@/pages/account/Orders';
import OrderDetails from '@/pages/account/OrderDetails';
import Wishlist from '@/pages/account/Wishlist';
import Support from '@/pages/account/Support';
import SupportTicket from '@/pages/account/SupportTicket';
import EmailPreferences from '@/pages/account/EmailPreferences';

// Checkout Pages
import CheckoutLayout from '@/components/checkout/CheckoutLayout';
import Checkout from '@/pages/Checkout';
import OrderConfirmation from '@/pages/OrderConfirmation';


// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import Analytics from '@/pages/admin/Analytics';
import ProductList from '@/pages/admin/products/ProductList';
import ProductForm from '@/pages/admin/products/ProductForm';
import CategoryList from '@/pages/admin/categories/CategoryList';
import OrderList from '@/pages/admin/orders/OrderList';
import AdminOrderDetails from '@/pages/admin/orders/OrderDetails';
import UserList from '@/pages/admin/users/UserList';
import UserDetails from '@/pages/admin/users/UserDetails';
import ReviewList from '@/pages/admin/reviews/ReviewList';
import InventoryList from '@/pages/admin/inventory/InventoryList';
import DiscountList from '@/pages/admin/discounts/DiscountList';
import DiscountForm from '@/pages/admin/discounts/DiscountForm';
import BannerList from '@/pages/admin/banners/BannerList';
import BannerForm from '@/pages/admin/banners/BannerForm';
import Settings from '@/pages/admin/settings/Settings';
import MediaLibrary from '@/pages/admin/media/MediaLibrary';
import EmailList from '@/pages/admin/emails/EmailList';
import ImageKitManager from '@/pages/admin/imagekit/ImageKitManager';
import SupportTicketList from '@/pages/admin/support/TicketList';

import ScrollToTop from '@/components/common/ScrollToTop';
import BackToTop from '@/components/common/BackToTop';
import RouteProgress from '@/components/common/RouteProgress';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <RouteProgress />
        <ScrollToTop />
        <BackToTop />
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/search" element={<Search />} />
            <Route path="/products/:id" element={<ProductDetails />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/cart" element={<Cart />} />

            {/* Guest Only Routes */}
            <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
            <Route path="/register" element={<RequireGuest><Register /></RequireGuest>} />
            <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
            <Route path="/reset-password" element={<RequireGuest><ResetPassword /></RequireGuest>} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/please-verify-email" element={<PleaseVerifyEmail />} />
          </Route>

          {/* Protected Account Routes */}
          <Route path="/account" element={
            <AuthGuard>
              <PublicLayout />
            </AuthGuard>
          }>
            <Route element={<AccountLayout />}>
              <Route index element={<AccountDashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="addresses" element={<AddressBook />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderNumber" element={<OrderDetails />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="support" element={<Support />} />
              <Route path="support/:id" element={<SupportTicket />} />
              <Route path="email-preferences" element={<EmailPreferences />} />
            </Route>
          </Route>

          {/* Checkout Routes */}
          <Route element={
            <AuthGuard>
              <CheckoutLayout />
            </AuthGuard>
          }>
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/shipping" element={<Checkout />} />
            <Route path="/checkout/review" element={<Checkout />} />
            <Route path="/checkout/payment" element={<Checkout />} />
          </Route>

          {/* Order Confirmation (Public - accessible without login) */}
          <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />



          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="categories" element={<CategoryList />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:orderNumber" element={<AdminOrderDetails />} />
            <Route path="users" element={<UserList />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="reviews" element={<ReviewList />} />
            <Route path="inventory" element={<InventoryList />} />
            <Route path="discounts" element={<DiscountList />} />
            <Route path="discounts/new" element={<DiscountForm />} />
            <Route path="discounts/:id/edit" element={<DiscountForm />} />
            <Route path="banners" element={<BannerList />} />
            <Route path="banners/new" element={<BannerForm />} />
            <Route path="banners/:id" element={<BannerForm />} />
            <Route path="settings" element={<Settings />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="emails" element={<EmailList />} />
            <Route path="support" element={<SupportTicketList />} />
            <Route path="imagekit" element={<ImageKitManager />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

