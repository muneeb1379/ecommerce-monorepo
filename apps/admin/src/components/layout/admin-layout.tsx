import { Outlet, NavLink as RouterNavLink } from 'react-router-dom'
import {
  AppShell,
  Avatar,
  Burger,
  Group,
  Menu,
  NavLink,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { IconChevronDown, IconLogout } from '@tabler/icons-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useUiStore } from '@/stores/ui.store'
import { navItems } from './nav-items'

export function AdminLayout() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const { profile, signOut } = useAuth()

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: sidebarCollapsed, desktop: false } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={!sidebarCollapsed} onClick={toggleSidebar} hiddenFrom="sm" size="sm" />
            <Title order={4} fw={700}>
              Admin
            </Title>
          </Group>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar size={32} radius="xl" color="blue">
                    {profile?.fullName?.[0]?.toUpperCase() ?? '?'}
                  </Avatar>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                    <Text size="sm" fw={500}>
                      {profile?.fullName ?? 'Loading…'}
                    </Text>
                    <Text size="xs" c="dimmed" tt="capitalize">
                      {profile?.role}
                    </Text>
                  </div>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                leftSection={<IconLogout size={16} />}
                color="red"
                onClick={() => void signOut()}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            component={RouterNavLink}
            to={item.to}
            end={'end' in item ? item.end : false}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.75} />}
            variant="filled"
            mb={2}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
