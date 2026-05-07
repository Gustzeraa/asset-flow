import { Group, Stack, Text, ThemeIcon } from '@mantine/core'
import type { ReactNode } from 'react'

import { AppCard } from './app-card'


type MetricCardProps = {
  title: string
  value: number | string
  description: string
  icon: ReactNode
}


export function MetricCard({ description, icon, title, value }: MetricCardProps) {
  return (
    <AppCard className="h-full border-slate-200/72 bg-white/95 p-0 shadow-[0_12px_34px_rgba(15,23,42,0.04)]">
      <Stack className="h-full" gap={0}>
        <Group align="flex-start" className="px-3.5 pb-2.5 pt-3.5 md:px-4.5" justify="space-between" wrap="nowrap">
          <Text className="max-w-[16ch] text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-slate-500" span>
            {title}
          </Text>
          <ThemeIcon
            className="border border-brand-100/90 bg-[linear-gradient(180deg,rgba(241,246,255,0.95)_0%,rgba(224,235,255,0.9)_100%)] text-brand-700 shadow-none"
            radius="xl"
            size={34}
            variant="transparent"
          >
            {icon}
          </ThemeIcon>
        </Group>

        <div className="mx-3.5 border-t border-slate-100/92 md:mx-4.5" />

        <Stack className="px-3.5 pb-3.5 pt-2.5 md:px-4.5 md:pb-4" gap={6}>
          <Text className="tracking-[-0.08em] text-slate-950" fw={800} size="1.95rem">
            {value}
          </Text>
          <Text c="dimmed" className="max-w-[28ch] leading-[1.45] text-slate-500" lineClamp={2} size="xs">
            {description}
          </Text>
        </Stack>
      </Stack>
    </AppCard>
  )
}
