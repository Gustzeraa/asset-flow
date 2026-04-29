import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import {
  IconArchive,
  IconBuildingWarehouse,
  IconChartDonut4,
  IconFolders,
  IconHistory,
  IconUsersGroup,
} from '@tabler/icons-react'
import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'


const items = [
  { label: 'Dashboard', description: 'Indicadores executivos', to: '/dashboard', icon: IconChartDonut4 },
  { label: 'Equipamentos', description: 'Ativos e inventario', to: '/equipamentos', icon: IconArchive },
  { label: 'Categorias', description: 'Estrutura dos ativos', to: '/categorias', icon: IconFolders },
  { label: 'Colaboradores', description: 'RH e responsabilidades', to: '/colaboradores', icon: IconUsersGroup },
  { label: 'Consumiveis', description: 'Almoxarifado e estoque', to: '/consumiveis', icon: IconBuildingWarehouse },
  { label: 'Historico', description: 'Movimentacoes registradas', to: '/historico', icon: IconHistory },
]


export function Sidebar() {
  return (
    <Box className="flex h-full flex-col rounded-[28px] bg-[linear-gradient(180deg,#081224_0%,#0e2240_44%,#102b54_100%)] p-5 text-white shadow-[0_28px_80px_rgba(8,18,41,0.34)]">
      <Group align="center" className="mb-8 gap-3">
        <ThemeIcon color="brand.5" radius="xl" size={44} variant="white">
          <IconChartDonut4 size={22} />
        </ThemeIcon>
        <Stack gap={2}>
          <Text fw={800} size="lg">
            Asset Flow
          </Text>
          <Text className="text-white/65" size="sm">
            Gestão premium de ativos
          </Text>
        </Stack>
      </Group>

      <Stack gap="xs">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <NavLink key={item.to} className="block no-underline" to={item.to}>
              {({ isActive }) => (
                <motion.div whileHover={{ x: 3 }}>
                  <Group
                    className={cn(
                      'rounded-3xl px-3 py-3 transition-all duration-200',
                      isActive ? 'bg-white text-slate-900 shadow-[0_18px_34px_rgba(255,255,255,0.16)]' : 'text-white/78 hover:bg-white/8',
                    )}
                    wrap="nowrap"
                  >
                    <ThemeIcon color={isActive ? 'brand.5' : 'dark.9'} radius="xl" size={42} variant={isActive ? 'light' : 'filled'}>
                      <Icon size={18} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text fw={700}>{item.label}</Text>
                      <Text className={cn('text-[0.78rem]', isActive ? 'text-slate-500' : 'text-white/55')}>{item.description}</Text>
                    </Stack>
                  </Group>
                </motion.div>
              )}
            </NavLink>
          )
        })}
      </Stack>
    </Box>
  )
}
