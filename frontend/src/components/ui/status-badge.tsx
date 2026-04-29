import { Badge, type BadgeProps } from '@mantine/core'


const tones: Record<string, BadgeProps['color']> = {
  disponivel: 'teal',
  em_uso: 'blue',
  manutencao: 'yellow',
  descarte: 'red',
  entrada: 'teal',
  saida: 'orange',
  equipamento: 'blue',
  consumivel: 'grape',
  colaborador: 'cyan',
}


type StatusBadgeProps = {
  value: string
  label?: string
}


export function StatusBadge({ label, value }: StatusBadgeProps) {
  return (
    <Badge color={tones[value] ?? 'gray'} radius="xl" size="lg" variant="light">
      {label ?? value}
    </Badge>
  )
}
