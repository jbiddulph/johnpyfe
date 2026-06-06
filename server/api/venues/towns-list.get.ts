import { prisma } from '../../utils/prisma'
import { listUkTownOptions } from '../../utils/uk-towns'

export type TownFilterOption = {
  label: string
  value: string
}

/** UK City-backed town filter options (live venues only). */
export default defineEventHandler(async (): Promise<TownFilterOption[]> => {
  const towns = await listUkTownOptions(prisma)
  return towns.map((town) => ({
    label: town.label,
    value: town.venueTown,
  }))
})
