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
import { isPast } from 'date-fns'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

slugify.extend({ '/': '-' })

const ACTIVE_DISCOUNT = {
  name: 'Memoized Beta Launch',
  percent_off: 50,
  amount_off: undefined, // Set a value if using a fixed amount discount
  currency: undefined, // Required if amount_off is set
  duration: 'once' as const,
  duration_in_months: undefined, // Set if duration is 'repeating'
  max_redemptions: undefined, // Set to restrict the number of times the coupon can be redeemed before it’s no longer valid
  redeem_by: new Date('2025-06-01T00:00:00Z'),
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
    title: 'Memoized Beta Launch',
    message: 'Recurring subscriptions 50% off',
    type: BannerType.INFO,
    linkText: 'Check it out',
    linkUrl: '/premium',
  },
}

export const syncContent = async () => {
  const contentDir = path.join(process.cwd(), 'src', CONTENT_FOLDER)

  let courseOrder = 0
  let sectionOrder = 0
  let lessonOrder = 0
  let resourceOrder = 0

  for (const course of completeCurriculum.values()) {
    const {
      id: courseId,
      title: courseTitle,
      description: courseDescription,
      href: courseHref,
    } = course
    const courseSlug = slugify(courseTitle, {
      replacement: '-', // replace spaces with -
      lower: true, // convert to lower case
      strict: true, // strip special characters except replacement
      trim: true, // trim leading and trailing replacement chars
      // No need to use charmap since the forward slash will be replaced by default
    })

    const courseRecord = await upsertCourse(
      courseSlug,
      courseTitle,
      courseDescription,
      courseHref,
      courseOrder++,
    )

    console.log(`Synced course: ${courseTitle}`)

    for (const section of course.sections.values()) {
      const {
        title: sectionTitle,
        description: sectionDescription,
        id: sectionId,
        href: sectionHref,
        lessons: courseLessons,
      } = section
      const sectionSlug = slugify(sectionTitle, { lower: true })

      const sectionPath = path.join(contentDir, courseId, sectionId, 'page.mdx')

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
        sectionOrder++,
        sectionHref,
        courseRecord.id,
      )

      console.log(`Synced section: ${sectionTitle}`)

      for (const lesson of courseLessons.values()) {
        const {
          title: lessonTitle,
          description: lessonDescription,
          id: lessonId,
          access: lessonAccess,
          href: lessonHref,
        } = lesson
        const lessonSlug = slugify(lessonTitle, { lower: true })

        const lessonPath = path.join(
          contentDir,
          courseId,
          sectionId,
          lessonId,
          'page.mdx',
        )
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
          lessonOrder++,
          lessonAccess,
          lessonHref,
          sectionRecord.id,
        )

        console.log(`Synced lesson: ${lesson.title}`)

        if (lesson.problems) {
          for (const problem of lesson.problems) {
            await upsertProblem(
              problem.href,
              problem.title,
              problem.difficulty,
              problem.question,
              problem.answer,
              problem.type,
              lessonRecord.id,
            )
            console.log(`Synced problem: ${problem.title}`)
          }
        }

        if (lesson.resources) {
          const resourcesDir = path.join(
            process.cwd(),
            `src/${RESOURCES_FOLDER}`,
          )

          for (const resource of lesson.resources.values()) {
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
              resourceOrder++,
              resourceHref,
              lessonAccess,
              lessonRecord.id,
            )
          }
        }
      }
    }
  }

  const activeProducts = await getActiveProducts()

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

  const couponConfig = {
    ...ACTIVE_DISCOUNT,
    applies_to: {
      products: productIds,
    },
  }

  Object.keys(couponConfig).forEach(
    (key) =>
      (couponConfig[key as keyof typeof couponConfig] === undefined ||
        ['promotion_code', 'banner'].includes(key)) &&
      delete couponConfig[key as keyof typeof couponConfig],
  )

  try {
    const isDiscountExpired = ACTIVE_DISCOUNT.redeem_by
      ? isPast(new Date(ACTIVE_DISCOUNT.redeem_by))
      : false

    if (isDiscountExpired) {
      console.log(
        `Skipping discount creation: "${ACTIVE_DISCOUNT.name}" has expired (redeem_by: ${ACTIVE_DISCOUNT.redeem_by})`,
      )

      if (ACTIVE_DISCOUNT.banner) {
        const existingBanner = await prisma.banner.findUnique({
          where: { title: ACTIVE_DISCOUNT.banner.title },
        })

        if (existingBanner && existingBanner.isActive) {
          await prisma.banner.update({
            where: { title: ACTIVE_DISCOUNT.banner.title },
            data: { isActive: false },
          })
          console.log(
            `Deactivated banner: ${ACTIVE_DISCOUNT.banner.title} (discount expired)`,
          )
        }
      }
    } else {
      const { coupon, promotionCode } = await createStripeCoupon(
        couponConfig,
        ACTIVE_DISCOUNT.promotion_code,
      )
      console.log(`Created Memoized Launch discount: ${coupon.id}`)
      console.log(`Discount applies to products:`, productIds)

      if (promotionCode) {
        console.log(`Promotion code created: ${promotionCode.code}`)
      }

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
