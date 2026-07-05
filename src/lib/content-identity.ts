import { SLUGIFY_OPTIONS } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import fs from 'fs'
import path from 'path'
import slugify from 'slugify'

slugify.extend({ '/': '-' })
const slug = (title: string) => slugify(title, SLUGIFY_OPTIONS)

export type ContentIdMaps = {
  course: Record<string, string>
  section: Record<string, string>
  lesson: Record<string, string>
  problem: Record<string, string>
  resource: Record<string, string>
}

export type EntityName = keyof ContentIdMaps
export type ContentIdSets = Record<EntityName, Set<string>>

export type ContentIndex = {
  maps: ContentIdMaps
  validIds: ContentIdSets
}

const emptySets = (): ContentIdSets => ({
  course: new Set(),
  section: new Set(),
  lesson: new Set(),
  problem: new Set(),
  resource: new Set(),
})

/**
 * Single source of truth for deriving each content entity's stable `contentId`
 * (the fully-qualified content path) from the curriculum + content files. Walks
 * the content exactly as the sync does and returns, per entity:
 *
 *  - `maps`: slug -> contentId, a convenience for slug-based matching. NOTE:
 *    two entities that slugify to the same title (e.g. two "Security" lessons in
 *    different sections) collide here — the last one wins. Do NOT use this to
 *    decide what is a valid content entity.
 *  - `validIds`: the COMPLETE set of contentIds the content defines. contentIds
 *    are unique, so this never drops duplicate-title entities. This is the
 *    authoritative "what content currently exists" set that the prune keys on.
 *
 * Shared by the stale-row prune (and the orphan diagnostic) so identity
 * derivation is defined exactly once.
 */
export function buildContentIndex(contentDir: string): ContentIndex {
  const maps: ContentIdMaps = {
    course: {},
    section: {},
    lesson: {},
    problem: {},
    resource: { intro: 'intro' },
  }
  const validIds = emptySets()
  validIds.resource.add('intro')

  const add = (name: EntityName, title: string, contentId: string) => {
    maps[name][slug(title)] = contentId
    validIds[name].add(contentId)
  }

  for (const c of completeCurriculum) {
    add('course', c.title, c.id)
    for (const s of c.sections) {
      const sectionCid = `${c.id}${s.id}`
      add('section', s.title, sectionCid)
      const cfgPath = path.join(contentDir, c.id, s.id, '_lessons.json')
      if (!fs.existsSync(cfgPath)) continue
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      for (const l of cfg.lessons || []) {
        const lessonCid = `${c.id}${s.id}${l.id}`
        add('lesson', l.title, lessonCid)
        for (const p of l.problems || []) {
          add('problem', p.title, `${lessonCid}/${p.id ?? slug(p.title)}`)
        }
        for (const r of l.resources || []) {
          if (r.id) add('resource', r.title, r.id)
        }
      }
    }
  }

  return { maps, validIds }
}

/**
 * The COMPLETE set of valid `contentId`s per entity — everything the content
 * currently defines. A DB row whose contentId is not in its entity's set is
 * stale (removed from content) and safe to prune.
 */
export function validContentIds(contentDir: string): ContentIdSets {
  return buildContentIndex(contentDir).validIds
}
