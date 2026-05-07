import { Group, Stack, Text, ThemeIcon, Title, type GroupProps } from '@mantine/core'
import type { ReactNode } from 'react'


type PageHeaderProps = {
  title: string
  description: string
  icon?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
} & Omit<GroupProps, 'title'>


export function PageHeader({ actions, description, icon, meta, title, ...props }: PageHeaderProps) {
  return (
    <Group align="flex-start" justify="space-between" wrap="wrap" {...props}>
      <Stack gap={5}>
        {meta}
        <Group align="center" className="gap-3" wrap="nowrap">
          {icon ? (
            <ThemeIcon
              className="border border-brand-100/90 bg-[linear-gradient(180deg,rgba(239,245,255,0.95)_0%,rgba(224,235,255,0.92)_100%)] text-brand-700 shadow-none"
              radius="xl"
              size={36}
              variant="transparent"
            >
              {icon}
            </ThemeIcon>
          ) : null}
          <Title className="text-[1.58rem] leading-none tracking-[-0.05em] text-slate-950 md:text-[1.72rem]" order={2}>
            {title}
          </Title>
        </Group>
        <Text c="dimmed" maw={600} size="sm">
          {description}
        </Text>
      </Stack>
      {actions}
    </Group>
  )
}
