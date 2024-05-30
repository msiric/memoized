'use client'

import { useSession } from 'next-auth/react'

export const PricingTable = () => {
  const { data: session } = useSession()

  return (
    <div style={{ colorScheme: 'normal' }}>
      <stripe-pricing-table
        client-reference-id={session?.userId}
        pricing-table-id="prctbl_1PK2cXBOG7dj7GmqJoLiYhdc"
        publishable-key="pk_test_51PK2N0BOG7dj7GmqXFf7oVMmR9TyqnHEeOgnSckPaGKNGnIrQQy3yk80XpjkOk8wyhhx0JG2YxCwdfPyBXGOzxCd00JOY2d9cr"
      ></stripe-pricing-table>
    </div>
  )
}
