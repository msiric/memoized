import { MeiliSearch } from 'meilisearch'

const MEILI_HOST = process.env.MEILISEARCH_HOST ?? ''
const MEILI_API_KEY = process.env.MEILISEARCH_MASTER_KEY ?? ''

export const meiliSearch = new MeiliSearch({
  host: MEILI_HOST,
  apiKey: MEILI_API_KEY,
})
