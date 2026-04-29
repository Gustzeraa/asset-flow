import { Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import type { ReactNode } from 'react'


type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}


export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Paper className="border border-dashed border-slate-200/90 bg-slate-50/80 p-8 shadow-none">
      <Stack align="center" gap="md">
        <ThemeIcon color="brand.5" radius="xl" size={58} variant="light">
          {icon}
        </ThemeIcon>
        <Stack align="center" gap={4}>
          <Text fw={700} size="lg">
            {title}
          </Text>
          <Text c="dimmed" maw={420} ta="center">
            {description}
          </Text>
        </Stack>
        {action}
      </Stack>
    </Paper>
  )
}
