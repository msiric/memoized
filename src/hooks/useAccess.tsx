'use client'

import { UserWithSubscriptionsAndProgress } from '@/types'
import { userHasAccess } from '@/utils/helpers'
import { AccessOptions } from '@/lib/prisma-enums'

export const useAccess = (
  user: UserWithSubscriptionsAndProgress | null | undefined,
  access: AccessOptions | undefined,
) => {
  return userHasAccess(user, access)
}
