import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LoginFormValues } from '@/schemas/auth.schema'

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: LoginFormValues) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw new Error(
          error.status === 400 ? 'Incorrect email or password.' : error.message,
        )
      }
      return data
    },
  })
}
