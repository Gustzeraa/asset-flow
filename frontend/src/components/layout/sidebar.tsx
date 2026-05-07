import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { NavLink } from 'react-router-dom'

import { brandIcons, screenIcons } from '@/lib/app-icons'
import { cn } from '@/lib/utils'


const items = [
  { label: 'Dashboard', description: 'Indicadores executivos', to: '/dashboard', icon: screenIcons.dashboard },
  { label: 'Equipamentos', description: 'Ativos e inventario', to: '/equipamentos', icon: screenIcons.equipments },
  { label: 'Categorias', description: 'Estrutura dos ativos', to: '/categorias', icon: screenIcons.categories },
  { label: 'Colaboradores', description: 'RH e responsabilidades', to: '/colaboradores', icon: screenIcons.collaborators },
  { label: 'Consumiveis', description: 'Almoxarifado e estoque', to: '/consumiveis', icon: screenIcons.consumables },
  { label: 'Historico', description: 'Movimentacoes registradas', to: '/historico', icon: screenIcons.movements },
]


type SidebarProps = {
  onNavigate?: () => void
}


export function Sidebar({ onNavigate }: SidebarProps) {
  const BrandIcon = brandIcons.mark

  return (
    <Box className="flex h-full min-h-0 flex-col text-white">
      <Group align="center" className="mb-5 shrink-0 gap-3">
        <ThemeIcon color="brand.5" radius="xl" size={36} variant="white">
          <BrandIcon size={18} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text fw={800} size="sm">
            Asset Flow
          </Text>
          <Text className="text-white/62" size="11px">
            Gestão premium de ativos
          </Text>
        </Stack>
      </Group>

      <Box className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        <Stack gap="xs">
          {items.map((item) => {
            const Icon = item.icon

            return (
              <NavLink key={item.to} className="block no-underline" onClick={onNavigate} to={item.to}>
                {({ isActive }) => (
                  <Group
                    className={cn(
                      'rounded-[22px] px-2.5 py-2 transition-[transform,background-color,color,box-shadow] duration-150 hover:translate-x-[2px]',
                      isActive ? 'bg-white text-slate-900 shadow-[0_10px_24px_rgba(255,255,255,0.12)]' : 'text-white/78 hover:bg-white/7',
                    )}
                    wrap="nowrap"
                  >
                    <ThemeIcon color={isActive ? 'brand.5' : 'dark.9'} radius="xl" size={34} variant={isActive ? 'light' : 'filled'}>
                      <Icon size={16} />
                    </ThemeIcon>
                    <Stack gap={1}>
                      <Text fw={700} size="sm">
                        {item.label}
                      </Text>
                      <Text className={cn('text-[0.71rem] leading-[1.45]', isActive ? 'text-slate-500' : 'text-white/52')}>
                        {item.description}
                      </Text>
                    </Stack>
                  </Group>
                )}
              </NavLink>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}
