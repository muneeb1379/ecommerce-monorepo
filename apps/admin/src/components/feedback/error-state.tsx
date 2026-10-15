import { Button, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { ApiError } from '@/lib/api/client'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred.'

  return (
    <Stack align="center" gap="xs" py={64}>
      <ThemeIcon size={48} radius="xl" variant="light" color="red">
        <IconAlertTriangle size={24} />
      </ThemeIcon>
      <Text fw={600}>{title}</Text>
      <Text c="dimmed" size="sm" maw={360} ta="center">
        {message}
      </Text>
      {onRetry && (
        <Button variant="light" size="xs" onClick={onRetry} mt="xs">
          Try again
        </Button>
      )}
    </Stack>
  )
}
