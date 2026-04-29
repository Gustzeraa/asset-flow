import type { PropsWithChildren } from 'react'

import { Paper, type PaperProps } from '@mantine/core'

import { cn } from '@/lib/utils'


type AppCardProps = PropsWithChildren<PaperProps>


export function AppCard({ children, className, ...props }: AppCardProps) {
  return (
    <Paper
      className={cn(
        'border border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(8,18,41,0.08)] backdrop-blur-sm',
        className,
      )}
      p="lg"
      radius="xl"
      {...props}
    >
      {children}
    </Paper>
  )
}
