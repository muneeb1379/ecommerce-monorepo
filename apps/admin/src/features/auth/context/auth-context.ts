import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AdminProfile } from '@/types/api'

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  profile: AdminProfile | null
  profileError: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
