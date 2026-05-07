import type { ReactNode } from 'react'

import { Button } from '@mantine/core'

import { cn } from '@/lib/utils'


type AppButtonProps = {
  children?: ReactNode
  className?: string
  motionDisabled?: boolean
} & Record<string, unknown>


export function AppButton({ children, className, motionDisabled, ...props }: AppButtonProps) {
  void motionDisabled

  return (
    <Button
      className={cn('shadow-[0_10px_24px_rgba(37,99,235,0.13)] transition-colors duration-150', className)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Button>
  )
}
