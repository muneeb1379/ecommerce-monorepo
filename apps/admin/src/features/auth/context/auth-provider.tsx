import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { onUnauthorized } from '@/lib/api/client'
import { fetchAdminProfile } from '@/lib/api/auth'
import { queryKeys } from '@/lib/query-client'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    queryClient.clear()
    setSession(null)
  }, [queryClient])

  useEffect(() => onUnauthorized(() => void signOut()), [signOut])

  const profileQuery = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: ({ signal }) => fetchAdminProfile(signal),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const status: AuthStatus = !sessionLoaded
    ? 'initializing'
    : session
      ? 'authenticated'
      : 'unauthenticated'

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile: profileQuery.data ?? null,
      profileError: profileQuery.isError,
      signOut,
    }),
    [status, session, profileQuery.data, profileQuery.isError, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
