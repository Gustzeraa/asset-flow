import type { ReactNode } from 'react'

import { notifications } from '@mantine/notifications'
import { IconAlertCircleFilled, IconAlertTriangleFilled, IconCircleCheckFilled, IconInfoCircleFilled } from '@tabler/icons-react'


type FeedbackOptions = {
  title: string
  message: ReactNode
  autoClose?: number | false
  id?: string
}


function showFeedback(
  variant: 'success' | 'error' | 'warning' | 'info' | 'loading',
  { autoClose, id, message, title }: FeedbackOptions,
) {
  if (variant === 'loading') {
    return notifications.show({
      id,
      autoClose: autoClose ?? false,
      color: 'brand',
      loading: true,
      message,
      title,
      withCloseButton: false,
    })
  }

  const iconByVariant = {
    success: <IconCircleCheckFilled size={18} />,
    error: <IconAlertCircleFilled size={18} />,
    warning: <IconAlertTriangleFilled size={18} />,
    info: <IconInfoCircleFilled size={18} />,
  }

  const colorByVariant = {
    success: 'brand',
    error: 'red',
    warning: 'orange',
    info: 'brand',
  }

  return notifications.show({
    id,
    autoClose: autoClose ?? 4200,
    color: colorByVariant[variant],
    icon: iconByVariant[variant],
    message,
    title,
  })
}


export const appFeedback = {
  success: (options: FeedbackOptions) => showFeedback('success', options),
  error: (options: FeedbackOptions) => showFeedback('error', options),
  warning: (options: FeedbackOptions) => showFeedback('warning', options),
  info: (options: FeedbackOptions) => showFeedback('info', options),
  loading: (options: FeedbackOptions) => showFeedback('loading', options),
  hide: notifications.hide,
  update: notifications.update,
}
