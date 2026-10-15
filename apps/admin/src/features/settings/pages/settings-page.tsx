import { Avatar, Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { PageHeader } from '@/components/page-header'
import { useAuth } from '@/features/auth/hooks/use-auth'

export function SettingsPage() {
  const { profile, signOut } = useAuth()

  return (
    <>
      <PageHeader title="Settings" description="Your account details" />
      <Paper withBorder radius="md" p="lg" maw={480}>
        <Group mb="md">
          <Avatar size={48} radius="xl" color="blue">
            {profile?.fullName?.[0]?.toUpperCase() ?? '?'}
          </Avatar>
          <Stack gap={0}>
            <Title order={5}>{profile?.fullName ?? '—'}</Title>
            <Text size="sm" c="dimmed">
              {profile?.email}
            </Text>
          </Stack>
        </Group>
        <Group justify="space-between" mb="lg">
          <Text size="sm" c="dimmed">
            Role
          </Text>
          <Badge variant="light" tt="capitalize">
            {profile?.role}
          </Badge>
        </Group>
        <Button color="red" variant="light" onClick={() => void signOut()}>
          Sign out
        </Button>
      </Paper>
    </>
  )
}
