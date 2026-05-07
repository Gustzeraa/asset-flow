import { Checkbox, ScrollArea, Table, Text } from '@mantine/core'
import type { ReactNode } from 'react'

import { EmptyState } from '@/components/feedback/empty-state'
import { cn } from '@/lib/utils'


export type DataTableColumn<T> = {
  key: string
  label: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  render: (item: T) => ReactNode
}

type DataTableProps<T> = {
  items: T[]
  columns: DataTableColumn<T>[]
  keyExtractor: (item: T) => React.Key
  emptyTitle: string
  emptyDescription: string
  emptyIcon: ReactNode
  selectedIds?: Set<number>
  onToggleAll?: (checked: boolean) => void
  onToggleRow?: (id: number, checked: boolean) => void
  rowId?: (item: T) => number
  minWidth?: number
}


export function DataTable<T>({
  columns,
  emptyDescription,
  emptyIcon,
  emptyTitle,
  items,
  keyExtractor,
  minWidth = 900,
  onToggleAll,
  onToggleRow,
  rowId,
  selectedIds,
}: DataTableProps<T>) {
  const withSelection = Boolean(rowId && onToggleAll && onToggleRow && selectedIds)
  const allSelected = withSelection && items.length > 0 && items.every((item) => selectedIds!.has(rowId!(item)))

  return (
    <ScrollArea>
      <Table.ScrollContainer minWidth={minWidth}>
        <Table className="overflow-hidden" highlightOnHover={false} horizontalSpacing="md" verticalSpacing={8}>
          <Table.Thead>
            <Table.Tr className="border-y border-slate-100/90 bg-slate-50/75">
              {withSelection ? (
                <Table.Th className="py-2.5" w={42}>
                  <Checkbox checked={Boolean(allSelected)} onChange={(event) => onToggleAll!(event.currentTarget.checked)} />
                </Table.Th>
              ) : null}
              {columns.map((column) => (
                <Table.Th
                  key={column.key}
                  className="whitespace-nowrap py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500"
                  style={{
                    textAlign: column.align,
                    width: column.width,
                  }}
                >
                  {column.label}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.length === 0 ? (
              <Table.Tr>
                <Table.Td className="py-4" colSpan={columns.length + (withSelection ? 1 : 0)}>
                  <EmptyState description={emptyDescription} icon={emptyIcon} title={emptyTitle} />
                </Table.Td>
              </Table.Tr>
            ) : (
              items.map((item) => {
                const rowKey = keyExtractor(item)
                const currentId = rowId?.(item)
                const checked = currentId !== undefined && selectedIds ? selectedIds.has(currentId) : false

                return (
                  <Table.Tr
                    key={rowKey}
                    className={cn(
                      'border-b border-slate-100/80 transition-colors last:border-none hover:bg-slate-50/60',
                      checked && 'bg-brand-0/60 hover:bg-brand-0/70',
                    )}
                  >
                    {withSelection && currentId !== undefined ? (
                      <Table.Td className="py-2.5">
                        <Checkbox checked={checked} onChange={(event) => onToggleRow!(currentId, event.currentTarget.checked)} />
                      </Table.Td>
                    ) : null}
                    {columns.map((column) => (
                      <Table.Td key={column.key} className="py-2.5 align-top">
                        <Text c="dark.8" className="leading-5" size="sm">
                          {column.render(item)}
                        </Text>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                )
              })
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </ScrollArea>
  )
}
