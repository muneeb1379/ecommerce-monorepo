import { Link } from 'react-router-dom'
import { Button } from '@mantine/core'
import { IconSearchOff } from '@tabler/icons-react'
import { EmptyState } from '@/components/feedback/empty-state'

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<IconSearchOff size={24} />}
      title="Page not found"
      description="The page you're looking for doesn't exist."
      action={
        <Button component={Link} to="/" size="xs" mt="xs">
          Back to dashboard
        </Button>
      }
    />
  )
}
