import { Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { motion } from 'framer-motion'
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
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <AppCard className="h-full">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <Stack gap={6}>
            <Text c="dimmed" fw={600} size="sm" tt="uppercase">
              {title}
            </Text>
            <Text className="tracking-[-0.05em]" fw={800} size="2rem">
              {value}
            </Text>
            <Text c="dimmed" size="sm">
              {description}
            </Text>
          </Stack>
          <ThemeIcon className="shadow-inner" color="brand.5" radius="xl" size={52} variant="light">
            {icon}
          </ThemeIcon>
        </Group>
      </AppCard>
    </motion.div>
  )
}
