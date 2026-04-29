import { Center, Loader, Stack, Text } from '@mantine/core'


type LoadingPanelProps = {
  label?: string
}


export function LoadingPanel({ label = 'Carregando informacoes...' }: LoadingPanelProps) {
  return (
    <Center className="min-h-[320px] rounded-[28px] border border-white/60 bg-white/90 shadow-[0_24px_80px_rgba(8,18,41,0.08)] backdrop-blur-sm">
      <Stack align="center" gap="sm">
        <Loader color="brand.5" size="md" />
        <Text c="dimmed" fw={600}>
          {label}
        </Text>
      </Stack>
    </Center>
  )
}
