import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { AccessOptions } from '@prisma/client'

export const useAccess = (
  user: UserWithSubscriptionsAndProgress | null | undefined,
  access: AccessOptions | undefined,
) => {
  return userHasAccess(user, access)
}
