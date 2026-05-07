import { Modal, type ModalProps } from '@mantine/core'


export function AppModal(props: ModalProps) {
  return <Modal centered overlayProps={{ blur: 2, opacity: 0.36 }} padding="lg" radius="xl" {...props} />
}
