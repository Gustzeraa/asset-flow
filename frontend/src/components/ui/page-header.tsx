import { Group, Stack, Text, Title, type GroupProps } from '@mantine/core'
import type { ReactNode } from 'react'


type PageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
  meta?: ReactNode
} & Omit<GroupProps, 'title'>


export function PageHeader({ actions, description, meta, title, ...props }: PageHeaderProps) {
  return (
    <Group align="flex-start" justify="space-between" wrap="wrap" {...props}>
      <Stack gap={6}>
        {meta}
        <Title className="tracking-[-0.04em]" order={2}>
          {title}
        </Title>
        <Text c="dimmed" maw={720}>
          {description}
        </Text>
      </Stack>
      {actions}
    </Group>
  )
}
