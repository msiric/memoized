import { describe, expect, it } from 'vitest'
import { contentSlug } from './content-slug'

describe('shared public content slugs', () => {
  it.each([
    ['Async/Await', 'async-await'],
    ['Observer (Pub/Sub) Pattern: Implement `EventEmitter`', 'observer-pub-sub-pattern-implement-eventemitter'],
    ['Browser Security', 'browser-security'],
    ['Web Application Security', 'web-application-security'],
    ['3Sum', '3sum'],
    ['a / b', 'a-b'],
    ['a//b', 'a-b'],
  ])('derives %s without importing a sync script for side effects', (title, expected) => {
    expect(contentSlug(title)).toBe(expected)
  })
})
