export const APP_NAME = 'Memoized'

export const COURSE_PREFIX = '/course'

export const BUILT_IN_DATA_STRUCTURES_PREFIX = '/built-in-data-structures'
export const USER_DEFINED_DATA_STRUCTURES_PREFIX =
  '/user-defined-data-structures'
export const COMMON_TECHNIQUES_PREFIX = '/common-techniques'
export const ADVANCED_TOPICS_PREFIX = '/advanced-topics'

export const CONTENT_FOLDER = 'content'

export const CUSTOMER_PORTAL_LINK =
  'https://billing.stripe.com/p/login/test_7sI6rm7l4axL8Lu4gg'

export const STRIPE_PRODUCTS = {
  PREMIUM_MONTHLY: 'prod_QANAbCfu0XOh5X',
  PREMIUM_YEARLY: 'prod_QANAHyMPuyOUgT',
  PREMIUM_LIFETIME: 'prod_QANGbYqMrSHviC',
}

export const STRIPE_PRODUCT_IDS = Object.values(STRIPE_PRODUCTS).map(
  (item) => item,
)

export const STRIPE_PRICES = {
  PREMIUM_MONTHLY: 'price_1PK2PlBOG7dj7GmqSD4oVnGw',
  PREMIUM_YEARLY: 'price_1PK2QYBOG7dj7GmqlD1ua98X',
  PREMIUM_LIFETIME: 'price_1PK2WBBOG7dj7GmqiPKGPZqd',
}

export const STRIPE_PRICE_IDS = Object.values(STRIPE_PRICES).map((item) => item)

export const PREMIUM_QUERY_PARAM = 'upgradedToPremium'
