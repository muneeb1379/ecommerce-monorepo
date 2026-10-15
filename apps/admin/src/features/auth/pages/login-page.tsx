import { useState } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router-dom'
import { zod4Resolver } from 'mantine-form-zod-resolver'
import {
  Alert,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import { loginSchema, type LoginFormValues } from '@/schemas/auth.schema'
import { useLogin } from '@/features/auth/hooks/use-login'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as Location & { state?: { from?: Location } }
  const login = useLogin()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: zod4Resolver(loginSchema),
  })

  const handleSubmit = form.onSubmit((values) => {
    setErrorMessage(null)
    login.mutate(values, {
      onSuccess: () => {
        const redirectTo = location.state?.from?.pathname ?? '/'
        navigate(redirectTo, { replace: true })
      },
      onError: (error) => {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in.')
      },
    })
  })

  return (
    <Center h="100vh" bg="var(--mantine-color-gray-0)">
      <Paper withBorder shadow="sm" radius="md" p="xl" w={380}>
        <Stack gap={4} mb="lg" align="center">
          <IconLock size={28} stroke={1.5} />
          <Title order={2} size="h3">
            Admin sign in
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            Access is restricted to existing admin accounts.
          </Text>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {errorMessage && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
                data-testid="login-error"
              >
                {errorMessage}
              </Alert>
            )}

            <TextInput
              label="Email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              autoComplete="current-password"
              required
              {...form.getInputProps('password')}
            />

            <Button type="submit" fullWidth loading={login.isPending} mt="sm">
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
