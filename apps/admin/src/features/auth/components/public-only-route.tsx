import { Navigate, Outlet } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useAuth } from '@/features/auth/hooks/use-auth'

/** Keeps already-authenticated admins off /login. */
export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'initializing') {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
