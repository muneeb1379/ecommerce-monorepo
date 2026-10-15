import type { ReactNode } from 'react'
import { Group, Paper, Skeleton, Text, ThemeIcon } from '@mantine/core'
import type { MantineColor } from '@mantine/core'

interface StatCardProps {
  label: string
  value: string
  icon: ReactNode
  color?: MantineColor
  trend?: string
  trendPositive?: boolean
  /** Small secondary line, e.g. "32 published · 3 low stock". */
  hint?: string
  loading?: boolean
}

export function StatCard({
  label,
  value,
  icon,
  color = 'blue',
  trend,
  trendPositive,
  hint,
  loading,
}: StatCardProps) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" fw={500} tt="uppercase">
            {label}
          </Text>
          {loading ? (
            <Skeleton height={28} width={100} mt={6} />
          ) : (
            <Text size="xl" fw={700} mt={2}>
              {value}
            </Text>
          )}
          {trend && !loading && (
            <Text size="xs" c={trendPositive ? 'teal' : 'red'} fw={600} mt={4}>
              {trend}
            </Text>
          )}
          {hint && !loading && (
            <Text size="xs" c="dimmed" mt={4}>
              {hint}
            </Text>
          )}
        </div>
        <ThemeIcon size={38} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  )
}
