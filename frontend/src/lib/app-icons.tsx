import {
  IconAlertTriangleFilled,
  IconArchiveFilled,
  IconArrowAutofitRightFilled,
  IconArrowLeftCircleFilled,
  IconArrowRightCircleFilled,
  IconBoxMultipleFilled,
  IconCategoryFilled,
  IconChartDonutFilled,
  IconChevronDownFilled,
  IconClipboardDataFilled,
  IconClockHour4Filled,
  IconDownloadFilled,
  IconEditFilled,
  IconFileDescriptionFilled,
  IconFileUploadFilled,
  IconFolderFilled,
  IconFoldersFilled,
  IconLayoutDashboardFilled,
  IconMailFilled,
  IconPlusFilled,
  IconSearchFilled,
  IconShieldLockFilled,
  IconShoppingCartFilled,
  IconTableFilled,
  IconTimelineEventFilled,
  IconToolsKitchen2Filled,
  IconTrashFilled,
  IconTrashXFilled,
  IconUserFilled,
} from '@tabler/icons-react'


export const brandIcons = {
  mark: IconChartDonutFilled,
} as const

export const screenIcons = {
  dashboard: IconLayoutDashboardFilled,
  equipments: IconArchiveFilled,
  categories: IconFoldersFilled,
  collaborators: IconUserFilled,
  consumables: IconShoppingCartFilled,
  movements: IconTimelineEventFilled,
  trash: IconTrashFilled,
} as const

export const screenIconsByPath = {
  '/dashboard': screenIcons.dashboard,
  '/equipamentos': screenIcons.equipments,
  '/categorias': screenIcons.categories,
  '/colaboradores': screenIcons.collaborators,
  '/consumiveis': screenIcons.consumables,
  '/historico': screenIcons.movements,
  '/lixeira': screenIcons.trash,
} as const

export const actionIcons = {
  add: IconPlusFilled,
  chevronDown: IconChevronDownFilled,
  delete: IconTrashFilled,
  destroy: IconTrashXFilled,
  document: IconFileDescriptionFilled,
  download: IconDownloadFilled,
  edit: IconEditFilled,
  email: IconMailFilled,
  logout: IconArrowLeftCircleFilled,
  restore: IconArrowRightCircleFilled,
  search: IconSearchFilled,
  session: IconShieldLockFilled,
  transfer: IconArrowAutofitRightFilled,
  upload: IconFileUploadFilled,
} as const

export const sectionIcons = {
  active: IconArchiveFilled,
  alerts: IconAlertTriangleFilled,
  available: IconBoxMultipleFilled,
  categories: IconFolderFilled,
  clock: IconClockHour4Filled,
  collaborators: IconUserFilled,
  inUse: IconArrowAutofitRightFilled,
  maintenance: IconToolsKitchen2Filled,
  stock: IconShoppingCartFilled,
  summary: IconClipboardDataFilled,
  table: IconTableFilled,
  taxonomy: IconCategoryFilled,
  timeline: IconTimelineEventFilled,
} as const
