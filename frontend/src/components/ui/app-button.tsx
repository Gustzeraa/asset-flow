import type { ReactNode } from 'react'

import { Button } from '@mantine/core'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'


type AppButtonProps = {
  children?: ReactNode
  className?: string
  motionDisabled?: boolean
} & Record<string, unknown>


export function AppButton({ children, className, motionDisabled, ...props }: AppButtonProps) {
  const button = (
    <Button
      className={cn(
        'shadow-[0_14px_34px_rgba(37,99,235,0.18)] transition-all duration-200',
        className,
      )}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Button>
  )

  if (motionDisabled) {
    return button
  }

  return (
    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }}>
      {button}
    </motion.div>
  )
}
