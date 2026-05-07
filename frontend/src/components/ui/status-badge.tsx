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
    <Badge className="border border-black/5 px-2.5 py-[0.32rem] text-[0.72rem] font-semibold tracking-[0.02em]" color={tones[value] ?? 'gray'} radius="xl" size="sm" variant="light">
      {label ?? value}
    </Badge>
  )
}
