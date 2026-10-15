import { Avatar, ColorSwatch, Group, Paper, Table, Text, Title } from '@mantine/core'
import { IconPhoto } from '@tabler/icons-react'
import { formatCurrency } from '@/lib/format'
import type { OrderLineItem } from '@/types/api'

interface OrderLineItemsProps {
  items: OrderLineItem[]
  currency: string
}

export function OrderLineItems({ items, currency }: OrderLineItemsProps) {
  return (
    <Paper withBorder radius="md" p="lg">
      <Title order={5} mb="md">
        Items
      </Title>
      <Text size="xs" c="dimmed" mb="sm">
        Product details are a snapshot from the time of purchase.
      </Text>
      <Table verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th>Color</Table.Th>
            <Table.Th>SKU</Table.Th>
            <Table.Th>Qty</Table.Th>
            <Table.Th>Unit price</Table.Th>
            <Table.Th>Subtotal</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((item) => (
            <Table.Tr key={item.id}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Avatar src={item.imageUrl} radius="sm" size={36}>
                    <IconPhoto size={16} />
                  </Avatar>
                  <Text size="sm">{item.productName}</Text>
                </Group>
              </Table.Td>
              <Table.Td>
                {item.colorName ? (
                  <Group gap={6} wrap="nowrap">
                    {item.colorHex && <ColorSwatch color={item.colorHex} size={14} />}
                    <Text size="sm">{item.colorName}</Text>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {item.sku}
                </Text>
              </Table.Td>
              <Table.Td>{item.quantity}</Table.Td>
              <Table.Td>{formatCurrency(item.unitPrice, currency)}</Table.Td>
              <Table.Td>{formatCurrency(item.subtotal, currency)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  )
}
