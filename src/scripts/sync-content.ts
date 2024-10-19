import { CONTENT_FOLDER, RESOURCES_FOLDER } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import prisma from '@/lib/prisma'
import {
  upsertCourse,
  upsertLesson,
  upsertProblem,
  upsertSection,
} from '@/services/lesson'
import { upsertResource } from '@/services/resource'
import { createStripeCoupon, getActiveProducts } from '@/services/stripe'
import { BannerType } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

const ACTIVE_DISCOUNT = {
  name: 'Memoized Launch',
  percent_off: 50,
  amount_off: undefined, // Set a value if using a fixed amount discount
  currency: undefined, // Required if amount_off is set
  duration: 'once' as const,
  duration_in_months: undefined, // Set if duration is 'repeating'
  max_redemptions: undefined, // Set to restrict the number of times the coupon can be redeemed before it’s no longer valid
  redeem_by: new Date('2025-01-15T00:00:00Z'),
  applies_to: {
    products: ['Annual', 'Monthly'], // Product names to which this discount applies
  },
  metadata: {
    // Add any custom metadata here
  },
  promotion_code: undefined,
  // {
  //   // Set to null if you don't want to create a promotion code
  //   code: 'MEMOIZED50',
  //   max_redemptions: null, // Set if different from the coupon's max_redemptions
  //   expires_at: null, // Set if different from the coupon's redeem_by
  // },
  banner: {
    title: 'Memoized Launch',
    message: 'Recurring subscriptions 50% off',
    type: BannerType.INFO,
    linkText: 'Check it out',
    linkUrl: '/premium',
  },
}

export const syncContent = async () => {
  const contentDir = path.join(process.cwd(), `src/${CONTENT_FOLDER}`)

  for (const [courseOrder, course] of completeCurriculum.entries()) {
    const { title: courseTitle, description: courseDescription } = course
    const courseSlug = slugify(courseTitle, { lower: true })

    const courseRecord = await upsertCourse(
      courseSlug,
      courseTitle,
      courseDescription,
      courseOrder,
    )

    for (const [sectionOrder, section] of course.sections.entries()) {
      const {
        title: sectionTitle,
        description: sectionDescription,
        id: sectionId,
        href: sectionHref,
        lessons: courseLessons,
      } = section
      const sectionSlug = slugify(sectionTitle, { lower: true })

      const sectionPath = path.join(contentDir, sectionId, 'page.mdx')
      if (!fs.existsSync(sectionPath)) {
        console.error(`File not found: ${sectionPath}`)
        continue
      }

      const sectionContent = fs.readFileSync(sectionPath, 'utf-8')

      const sectionRecord = await upsertSection(
        sectionSlug,
        sectionTitle,
        sectionDescription,
        sectionContent,
        sectionOrder,
        sectionHref,
        courseRecord.id,
      )

      for (const [lessonOrder, lesson] of courseLessons.entries()) {
        const {
          title: lessonTitle,
          description: lessonDescription,
          id: lessonId,
          access: lessonAccess,
          href: lessonHref,
        } = lesson
        const lessonSlug = slugify(lessonTitle, { lower: true })

        const lessonPath = path.join(contentDir, lessonId, 'page.mdx')
        if (!fs.existsSync(lessonPath)) {
          console.error(`File not found: ${lessonPath}`)
          continue
        }

        const lessonContent = fs.readFileSync(lessonPath, 'utf-8')

        const lessonRecord = await upsertLesson(
          lessonSlug,
          lessonTitle,
          lessonDescription,
          lessonContent,
          lessonOrder,
          lessonAccess,
          lessonHref,
          sectionRecord.id,
        )

        if (lesson.problems) {
          for (const problem of lesson.problems) {
            await upsertProblem(
              problem.href,
              problem.title,
              lessonRecord.id,
              problem.difficulty,
            )
          }
        }

        if (lesson.resources) {
          const resourcesDir = path.join(
            process.cwd(),
            `src/${RESOURCES_FOLDER}`,
          )

          for (const [resourceOrder, resource] of lesson.resources.entries()) {
            const {
              title: resourceTitle,
              description: resourceDescription,
              id: resourceId,
              href: resourceHref,
            } = resource
            const resourceSlug = slugify(resourceTitle, { lower: true })

            const resourcePath = path.join(resourcesDir, resourceId, 'page.mdx')
            if (!fs.existsSync(resourcePath)) {
              console.error(`File not found: ${resourcePath}`)
              continue
            }

            const resourceContent = fs.readFileSync(resourcePath, 'utf-8')

            await upsertResource(
              resourceSlug,
              resourceTitle,
              resourceDescription,
              resourceContent,
              resourceOrder,
              resourceHref,
              lessonAccess,
              lessonRecord.id,
            )
          }
        }

        console.log(`Synced: ${lessonTitle}`)
      }
    }
  }

  // Fetch active products
  const activeProducts = await getActiveProducts()

  // Filter for products specified in the discount configuration
  const relevantProducts = activeProducts.filter((product) =>
    ACTIVE_DISCOUNT.applies_to.products.some((name) =>
      product.name.includes(name),
    ),
  )

  if (relevantProducts.length !== ACTIVE_DISCOUNT.applies_to.products.length) {
    console.warn(
      `Expected to find ${ACTIVE_DISCOUNT.applies_to.products.length} products, but found: ${relevantProducts.length}`,
    )
  }

  const productIds = relevantProducts.map((product) => product.id)

  // Create the specific discount
  const couponConfig = {
    ...ACTIVE_DISCOUNT,
    applies_to: {
      products: productIds,
    },
  }

  // Remove null values and unnecessary fields
  Object.keys(couponConfig).forEach(
    (key) =>
      (couponConfig[key as keyof typeof couponConfig] === undefined ||
        ['promotion_code', 'banner'].includes(key)) &&
      delete couponConfig[key as keyof typeof couponConfig],
  )

  try {
    const { coupon, promotionCode } = await createStripeCoupon(
      couponConfig,
      ACTIVE_DISCOUNT.promotion_code,
    )
    console.log(`Created Memoized Launch discount: ${coupon.id}`)
    console.log(`Discount applies to products:`, productIds)

    if (promotionCode) {
      console.log(`Promotion code created: ${promotionCode.code}`)
    }

    // Create banner only if discount creation was successful
    if (ACTIVE_DISCOUNT.banner) {
      const bannerData = {
        ...ACTIVE_DISCOUNT.banner,
        isActive: true,
        startDate: new Date(),
        endDate: ACTIVE_DISCOUNT.redeem_by,
        priority: 1,
      }

      const existingBanner = await prisma.banner.findUnique({
        where: { title: bannerData.title },
      })

      if (!existingBanner) {
        await prisma.banner.create({
          data: bannerData,
        })
        console.log(`Created new Banner: ${bannerData.title}`)
      } else {
        await prisma.banner.update({
          where: { title: bannerData.title },
          data: bannerData,
        })
        console.log(`Updated existing Banner: ${bannerData.title}`)
      }
    }
  } catch (error) {
    console.error('Failed to create Memoized Launch discount:', error)
  }

  await prisma.$disconnect()
}

if (require.main === module) {
  syncContent()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
