import type { ReactNode } from 'react'
import { Stack, Text, ThemeIcon } from '@mantine/core'
import { IconInbox } from '@tabler/icons-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Stack align="center" gap="xs" py={64}>
      <ThemeIcon size={48} radius="xl" variant="light" color="gray">
        {icon ?? <IconInbox size={24} />}
      </ThemeIcon>
      <Text fw={600}>{title}</Text>
      {description && (
        <Text c="dimmed" size="sm" maw={360} ta="center">
          {description}
        </Text>
      )}
      {action}
    </Stack>
  )
}
