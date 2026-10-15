import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/admin-layout'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { PublicOnlyRoute } from '@/features/auth/components/public-only-route'
import { LoginPage } from '@/features/auth/pages/login-page'
import { NotFoundPage } from '@/app/not-found-page'
import { lazyRoute } from '@/app/route-loader'

const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
)
const ProductsListPage = lazy(() =>
  import('@/features/products/pages/products-list-page').then((m) => ({
    default: m.ProductsListPage,
  })),
)
const ProductEditPage = lazy(() =>
  import('@/features/products/pages/product-edit-page').then((m) => ({
    default: m.ProductEditPage,
  })),
)
const CategoriesListPage = lazy(() =>
  import('@/features/categories/pages/categories-list-page').then((m) => ({
    default: m.CategoriesListPage,
  })),
)
const CategoryEditPage = lazy(() =>
  import('@/features/categories/pages/category-edit-page').then((m) => ({
    default: m.CategoryEditPage,
  })),
)
const OrdersListPage = lazy(() =>
  import('@/features/orders/pages/orders-list-page').then((m) => ({ default: m.OrdersListPage })),
)
const OrderDetailPage = lazy(() =>
  import('@/features/orders/pages/order-detail-page').then((m) => ({
    default: m.OrderDetailPage,
  })),
)
const CustomersListPage = lazy(() =>
  import('@/features/customers/pages/customers-list-page').then((m) => ({
    default: m.CustomersListPage,
  })),
)
const CustomerDetailPage = lazy(() =>
  import('@/features/customers/pages/customer-detail-page').then((m) => ({
    default: m.CustomerDetailPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/settings-page').then((m) => ({ default: m.SettingsPage })),
)

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: lazyRoute(DashboardPage) },
          { path: '/products', element: lazyRoute(ProductsListPage) },
          { path: '/products/:id', element: lazyRoute(ProductEditPage) },
          { path: '/categories', element: lazyRoute(CategoriesListPage) },
          { path: '/categories/:id', element: lazyRoute(CategoryEditPage) },
          { path: '/orders', element: lazyRoute(OrdersListPage) },
          { path: '/orders/:id', element: lazyRoute(OrderDetailPage) },
          { path: '/customers', element: lazyRoute(CustomersListPage) },
          { path: '/customers/:id', element: lazyRoute(CustomerDetailPage) },
          { path: '/settings', element: lazyRoute(SettingsPage) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
