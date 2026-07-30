import { Box, Collapse, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { brandIcons, screenIcons } from '@/lib/app-icons'
import { cn } from '@/lib/utils'

// NOVO: Importando os ícones para a folha de pagamento
import { IconReceipt, IconFileInvoice } from '@tabler/icons-react'

type MenuItem = {
  label: string
  description?: string
  to?: string
  icon?: any
  children?: { label: string; to: string }[]
}

const items: MenuItem[] = [
  { label: 'Dashboard', description: 'Indicadores executivos', to: '/dashboard', icon: screenIcons.dashboard },
  
  // NOVO: Menu do colaborador (Aparece para todos)
  { 
    label: 'Meus Recibos', 
    description: 'Acesse seus contracheques', 
    to: '/meus-contracheques', 
    icon: IconReceipt 
  },
  
  { 
    label: 'Equipamentos', 
    description: 'Ativos e inventário', 
    icon: screenIcons.equipments,
    children: [
      { label: 'Lista de Equipamentos', to: '/equipamentos' },
      { label: 'Categorias', to: '/categorias' }
    ]
  },
  { 
    label: 'Colaboradores', 
    description: 'RH e responsabilidades', 
    icon: screenIcons.collaborators,
    children: [
      { label: 'Lista de Colaboradores', to: '/colaboradores' },
      { label: 'Departamentos', to: '/departamentos' }
    ]
  },
  { 
    label: 'Consumíveis', 
    description: 'Almoxarifado e estoque', 
    icon: screenIcons.consumables,
    children: [
      { label: 'Estoque Atual', to: '/consumiveis' },
      { label: 'Movimentações', to: '/historico' }
    ]
  },
]

function SingleNavItem({ item, onNavigate }: { item: MenuItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink className="block no-underline" onClick={onNavigate} to={item.to!}>
      {({ isActive }) => (
        <div
          className={cn(
            'flex items-center w-full rounded-[22px] px-2.5 py-2 transition-[transform,background-color,color,box-shadow] duration-150 hover:translate-x-[2px]',
            isActive ? 'bg-white text-slate-900 shadow-[0_10px_24px_rgba(255,255,255,0.12)]' : 'text-white/78 hover:bg-white/7',
          )}
        >
          <ThemeIcon className="shrink-0" color={isActive ? 'brand.5' : 'dark.9'} radius="xl" size={34} variant={isActive ? 'light' : 'filled'}>
            <Icon size={16} />
          </ThemeIcon>

          <Stack gap={1} className="flex-1 min-w-0 ml-3">
            <Text fw={700} size="sm" className="truncate">
              {item.label}
            </Text>
            <Text className={cn('text-[0.71rem] leading-[1.45] truncate', isActive ? 'text-slate-500' : 'text-white/52')}>
              {item.description}
            </Text>
          </Stack>
        </div>
      )}
    </NavLink>
  )
}

function NavGroup({ item, onNavigate }: { item: MenuItem; onNavigate?: () => void }) {
  const location = useLocation()
  const Icon = item.icon
  
  const hasActiveChild = item.children!.some((child) => location.pathname.startsWith(child.to))
  const [opened, { toggle }] = useDisclosure(hasActiveChild)

  return (
    <Box>
      <UnstyledButton onClick={toggle} className="block w-full text-left">
        <div
          className={cn(
            'flex items-center w-full rounded-[22px] px-2.5 py-2 transition-[transform,background-color] duration-150',
            opened || hasActiveChild ? 'bg-white/10' : 'hover:bg-white/7'
          )}
        >
          <ThemeIcon className="shrink-0" color={hasActiveChild ? 'brand.5' : 'dark.9'} radius="xl" size={34} variant={hasActiveChild ? 'light' : 'filled'}>
            <Icon size={16} />
          </ThemeIcon>

          <Stack gap={1} className="flex-1 min-w-0 ml-3">
            <Text fw={700} size="sm" className="text-white truncate">
              {item.label}
            </Text>
            <Text className={cn("text-[0.71rem] leading-[1.45] truncate", hasActiveChild ? "text-white/80" : "text-white/52")}>
              {item.description}
            </Text>
          </Stack>

          <Box className={cn("shrink-0 transition-transform duration-200 text-white/50 ml-2", opened ? "rotate-180" : "")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Box>
        </div>
      </UnstyledButton>

      <Collapse expanded={opened}>
        <Stack gap={4} className="mt-2 pl-[3.25rem] pr-2 pb-2">
          {item.children!.map((child) => (
            <NavLink key={child.to} to={child.to} onClick={onNavigate} className="block no-underline">
              {({ isActive }) => (
                <Text
                  size="sm"
                  fw={isActive ? 700 : 500}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all duration-150",
                    isActive 
                      ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(255,255,255,0.1)] translate-x-1" 
                      : "text-white/60 hover:text-white hover:bg-white/10 hover:translate-x-1"
                  )}
                >
                  {child.label}
                </Text>
              )}
            </NavLink>
          ))}
        </Stack>
      </Collapse>
    </Box>
  )
}

type SidebarProps = {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const BrandIcon = brandIcons.mark
  const { user } = useAuth()

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
            if (item.children) {
              return <NavGroup key={item.label} item={item} onNavigate={onNavigate} />
            }
            return <SingleNavItem key={item.to!} item={item} onNavigate={onNavigate} />
          })}

          {/* ÁREA RESTRITA DOS ADMINISTRADORES */}
          {user?.is_superuser && (
            <>
              <div className="my-2 border-t border-white/10 mx-4" />
              
              {/* NOVO: Menu restrito ao RH para envio de holerites em lote */}
              <SingleNavItem 
                item={{ 
                  label: 'Folha de Pagamento', 
                  description: 'Upload de contracheques', 
                  to: '/rh/contracheques/upload', 
                  icon: IconFileInvoice 
                }} 
                onNavigate={onNavigate} 
              />

              <SingleNavItem 
                item={{ 
                  label: 'Usuários', 
                  description: 'Gestão de acessos', 
                  to: '/usuarios', 
                  icon: screenIcons.collaborators 
                }} 
                onNavigate={onNavigate} 
              />
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}