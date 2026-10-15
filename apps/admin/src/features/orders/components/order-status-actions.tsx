import { useState } from 'react'
import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { OrderStatusBadge } from '@/components/status-badge'
import { useUpdateOrderStatus } from '@/features/orders/hooks/use-order-mutations'
import type { Order, OrderStatus } from '@/types/api'

const actionLabels: Record<OrderStatus, string> = {
  pending: 'Mark as pending',
  processing: 'Start processing',
  shipped: 'Mark as shipped',
  delivered: 'Mark as delivered',
  cancelled: 'Cancel order',
}

/**
 * Only the transitions the API reports as allowed (`allowedTransitions`) are
 * offered, so the lifecycle rules live in one place: the server.
 */
export function OrderStatusActions({ order }: { order: Order }) {
  const updateStatus = useUpdateOrderStatus(order.id)
  const [target, setTarget] = useState<OrderStatus | null>(null)
  const [note, setNote] = useState('')

  const close = () => {
    setTarget(null)
    setNote('')
  }

  const confirm = () => {
    if (!target) return
    updateStatus.mutate({ status: target, note: note.trim() || undefined }, { onSuccess: close })
  }

  if (order.allowedTransitions.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        This order is {order.status}; no further status changes are possible.
      </Text>
    )
  }

  return (
    <>
      <Stack gap="xs">
        {order.allowedTransitions.map((status) => (
          <Button
            key={status}
            variant={status === 'cancelled' ? 'light' : 'filled'}
            color={status === 'cancelled' ? 'red' : 'blue'}
            onClick={() => setTarget(status)}
            fullWidth
          >
            {actionLabels[status]}
          </Button>
        ))}
      </Stack>

      <Modal
        opened={target !== null}
        onClose={close}
        title={target ? actionLabels[target] : ''}
        centered
        size="sm"
      >
        <Stack gap="sm">
          <Group gap="xs">
            <OrderStatusBadge status={order.status} />
            <Text size="sm" c="dimmed">
              →
            </Text>
            {target && <OrderStatusBadge status={target} />}
          </Group>

          {target === 'cancelled' && (
            <Alert icon={<IconInfoCircle size={16} />} color="red" variant="light">
              Cancelling returns every item to stock and cannot be undone.
            </Alert>
          )}

          <Textarea
            label="Note (optional)"
            description="Saved in the order history"
            maxLength={500}
            minRows={2}
            autosize
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={close} disabled={updateStatus.isPending}>
              Back
            </Button>
            <Button
              color={target === 'cancelled' ? 'red' : 'blue'}
              onClick={confirm}
              loading={updateStatus.isPending}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
