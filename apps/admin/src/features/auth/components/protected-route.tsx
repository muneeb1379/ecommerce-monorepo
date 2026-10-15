import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useAuth } from '@/features/auth/hooks/use-auth'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'initializing') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
