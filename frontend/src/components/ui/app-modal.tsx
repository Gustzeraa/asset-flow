import { Modal, type ModalProps } from '@mantine/core'


export function AppModal(props: ModalProps) {
  return <Modal overlayProps={{ blur: 14, opacity: 0.45 }} radius="xl" {...props} />
}
