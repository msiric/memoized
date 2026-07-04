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

/**
 * Single source of truth for deriving each content entity's stable `contentId`
 * (the fully-qualified content path) from the curriculum + content files. Walks
 * the content exactly as the sync does, returning slug -> contentId maps per
 * entity.
 *
 * Shared by the content backfill and the stale-row prune so identity derivation
 * is never duplicated (one definition of "what is a valid content entity").
 */
export function buildContentIdMaps(contentDir: string): ContentIdMaps {
  const course: Record<string, string> = {}
  const section: Record<string, string> = {}
  const lesson: Record<string, string> = {}
  const problem: Record<string, string> = {}
  const resource: Record<string, string> = { intro: 'intro' }

  for (const c of completeCurriculum) {
    course[slug(c.title)] = c.id
    for (const s of c.sections) {
      const sectionCid = `${c.id}${s.id}`
      section[slug(s.title)] = sectionCid
      const cfgPath = path.join(contentDir, c.id, s.id, '_lessons.json')
      if (!fs.existsSync(cfgPath)) continue
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
      for (const l of cfg.lessons || []) {
        const lessonCid = `${c.id}${s.id}${l.id}`
        lesson[slug(l.title)] = lessonCid
        for (const p of l.problems || []) {
          problem[slug(p.title)] = `${lessonCid}/${p.id ?? slug(p.title)}`
        }
        for (const r of l.resources || []) {
          if (r.id) resource[slug(r.title)] = r.id
        }
      }
    }
  }

  return { course, section, lesson, problem, resource }
}

/**
 * The set of valid `contentId`s per entity — everything the content currently
 * defines. A DB row whose contentId is not in its entity's set is stale
 * (removed from content) and safe to prune.
 */
export function validContentIds(maps: ContentIdMaps): Record<EntityName, Set<string>> {
  return {
    course: new Set(Object.values(maps.course)),
    section: new Set(Object.values(maps.section)),
    lesson: new Set(Object.values(maps.lesson)),
    problem: new Set(Object.values(maps.problem)),
    resource: new Set(Object.values(maps.resource)),
  }
}
