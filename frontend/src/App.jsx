import { Routes, Route } from 'react-router-dom';

import StoreLayout from './components/store/StoreLayout.jsx';
import Home from './pages/store/Home.jsx';
import Category from './pages/store/Category.jsx';
import Product from './pages/store/Product.jsx';
import Cart from './pages/store/Cart.jsx';
import Checkout from './pages/store/Checkout.jsx';
import OrderTrack from './pages/store/OrderTrack.jsx';
import Blog from './pages/store/Blog.jsx';
import Faqs from './pages/store/Faqs.jsx';
import Privacy from './pages/store/Privacy.jsx';
import NotFound from './pages/store/NotFound.jsx';

import RequireAdmin from './components/admin/RequireAdmin.jsx';
import RequireRole from './components/admin/RequireRole.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import { AdminSocketProvider } from './context/AdminSocketContext.jsx';
import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/Products.jsx';
import ProductForm from './pages/admin/ProductForm.jsx';
import AdminCategories from './pages/admin/Categories.jsx';
import AdminAreas from './pages/admin/Areas.jsx';
import AdminBranches from './pages/admin/Branches.jsx';
import AdminOrders from './pages/admin/Orders.jsx';
import OrderDetail from './pages/admin/OrderDetail.jsx';
import AdminOffers from './pages/admin/Offers.jsx';
import AdminReports from './pages/admin/Reports.jsx';
import AdminUsers from './pages/admin/Users.jsx';

// Wrap an admin page in its role guard.
const guard = (area, element) => <RequireRole area={area}>{element}</RequireRole>;

export default function App() {
  return (
    <Routes>
      {/* Storefront */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/category/:slug" element={<Category />} />
        <Route path="/product/:slug" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/track" element={<OrderTrack />} />
        <Route path="/track/:orderNumber" element={<OrderTrack />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/faqs" element={<Faqs />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin portal — RequireAdmin checks login, AdminSocketProvider
          gives every admin page a single shared realtime connection
          (so toasts + audio pings fire site-wide). */}
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminSocketProvider>
              <AdminLayout />
            </AdminSocketProvider>
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={guard('orders', <AdminOrders />)} />
        <Route path="orders/:id" element={guard('orders', <OrderDetail />)} />
        <Route path="products" element={guard('products', <AdminProducts />)} />
        <Route path="products/new" element={guard('productEdit', <ProductForm />)} />
        <Route path="products/:id/edit" element={guard('productEdit', <ProductForm />)} />
        <Route path="categories" element={guard('categories', <AdminCategories />)} />
        <Route path="areas" element={guard('areas', <AdminAreas />)} />
        <Route path="branches" element={guard('branches', <AdminBranches />)} />
        <Route path="offers" element={guard('offers', <AdminOffers />)} />
        <Route path="reports" element={guard('reports', <AdminReports />)} />
        <Route path="users" element={guard('users', <AdminUsers />)} />
      </Route>
    </Routes>
  );
}
