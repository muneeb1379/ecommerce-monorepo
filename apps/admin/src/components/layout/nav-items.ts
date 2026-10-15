import {
  IconDashboard,
  IconSettings,
  IconShoppingBag,
  IconShoppingCart,
  IconTags,
  IconUsers,
} from '@tabler/icons-react'

export const navItems = [
  { label: 'Dashboard', to: '/', icon: IconDashboard, end: true },
  { label: 'Products', to: '/products', icon: IconShoppingBag },
  { label: 'Categories', to: '/categories', icon: IconTags },
  { label: 'Orders', to: '/orders', icon: IconShoppingCart },
  { label: 'Customers', to: '/customers', icon: IconUsers },
  { label: 'Settings', to: '/settings', icon: IconSettings },
] as const
