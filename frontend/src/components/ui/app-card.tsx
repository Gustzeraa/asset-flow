import type { PropsWithChildren } from 'react'

import { Paper, type PaperProps } from '@mantine/core'

import { cn } from '@/lib/utils'


type AppCardProps = PropsWithChildren<PaperProps>


export function AppCard({ children, className, ...props }: AppCardProps) {
  return (
    <Paper
      className={cn(
        'border border-white/72 bg-white/92 shadow-[0_18px_54px_rgba(8,18,41,0.06)] backdrop-blur-sm',
        className,
      )}
      p="md"
      radius="xl"
      {...props}
    >
      {children}
    </Paper>
  )
}
