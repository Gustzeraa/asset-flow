import { Center, Loader, Stack, Text } from '@mantine/core'


type LoadingPanelProps = {
  label?: string
}


export function LoadingPanel({ label = 'Carregando informacoes...' }: LoadingPanelProps) {
  return (
    <Center className="min-h-[260px] rounded-[24px] border border-white/64 bg-white/90 shadow-[0_18px_52px_rgba(8,18,41,0.06)] backdrop-blur-sm">
      <Stack align="center" gap="xs">
        <Loader color="brand.5" size="md" />
        <Text c="dimmed" fw={600} size="sm">
          {label}
        </Text>
      </Stack>
    </Center>
  )
}
