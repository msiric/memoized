import { describe, it, expect, beforeEach } from 'vitest'
import { Trie } from './Trie'

describe('Trie', () => {
  let trie: Trie

  beforeEach(() => {
    trie = new Trie()
  })

  it('should insert and search for words in the trie', () => {
    trie.insert('apple')
    expect(trie.contains('apple')).toBe(true)
    expect(trie.contains('app')).toBe(false)
    trie.insert('app')
    expect(trie.contains('app')).toBe(true)
  })

  it('should check if there is any word in the trie that starts with the given prefix', () => {
    trie.insert('apple')
    expect(trie.findPrefix('app')).not.toBeNull()
    expect(trie.findPrefix('apl')).toBeNull()
  })

  it('should handle inserting and searching for multiple words', () => {
    trie.insert('apple')
    trie.insert('app')
    trie.insert('apricot')
    trie.insert('banana')
    expect(trie.contains('apple')).toBe(true)
    expect(trie.contains('app')).toBe(true)
    expect(trie.contains('apricot')).toBe(true)
    expect(trie.contains('banana')).toBe(true)
    expect(trie.contains('ban')).toBe(false)
  })

  it('should handle checking prefixes for multiple words', () => {
    trie.insert('apple')
    trie.insert('app')
    trie.insert('apricot')
    trie.insert('banana')
    expect(trie.findPrefix('ap')).not.toBeNull()
    expect(trie.findPrefix('app')).not.toBeNull()
    expect(trie.findPrefix('apr')).not.toBeNull()
    expect(trie.findPrefix('ban')).not.toBeNull()
    expect(trie.findPrefix('ba')).not.toBeNull()
    expect(trie.findPrefix('bana')).not.toBeNull()
    expect(trie.findPrefix('banan')).not.toBeNull()
    expect(trie.findPrefix('banana')).not.toBeNull()
    expect(trie.findPrefix('bananaa')).toBeNull()
  })

  it('should return false for searching words not in the trie', () => {
    expect(trie.contains('apple')).toBe(false)
    expect(trie.contains('app')).toBe(false)
    expect(trie.contains('apricot')).toBe(false)
    expect(trie.contains('banana')).toBe(false)
  })

  it('should return null for checking prefixes not in the trie', () => {
    expect(trie.findPrefix('ap')).toBeNull()
    expect(trie.findPrefix('app')).toBeNull()
    expect(trie.findPrefix('apr')).toBeNull()
    expect(trie.findPrefix('ban')).toBeNull()
  })

  it('should handle removing words from the trie', () => {
    trie.insert('apple')
    trie.insert('app')
    expect(trie.contains('apple')).toBe(true)
    expect(trie.contains('app')).toBe(true)
    trie.remove('app')
    expect(trie.contains('apple')).toBe(true)
    expect(trie.contains('app')).toBe(false)
    trie.remove('apple')
    expect(trie.contains('apple')).toBe(false)
  })

  it('should handle removing words with count from the trie', () => {
    trie.insert('apple')
    trie.insert('apple')
    expect(trie.findOccurrences('apple')).toBe(2)
    trie.remove('apple')
    expect(trie.findOccurrences('apple')).toBe(1)
    trie.remove('apple')
    expect(trie.findOccurrences('apple')).toBe(0)
  })

  it('should find all words with a given prefix', () => {
    trie.insert('apple')
    trie.insert('app')
    trie.insert('apricot')
    trie.insert('banana')
    const words = trie.findAllWords('app')
    expect(words).toEqual([
      { word: 'app', count: 1 },
      { word: 'apple', count: 1 },
    ])
  })
})
