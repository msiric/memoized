import { describe, it, expect, beforeEach } from 'vitest'
import { HashMap } from './HashMap'

describe('HashMap', () => {
  let map: HashMap<string, number>

  beforeEach(() => {
    map = new HashMap<string, number>()
  })

  it('should initialize an empty hash map', () => {
    expect(map.getSize()).toBe(0)
    expect(map.get('key')).toBeNull()
    expect(map.containsKey('key')).toBe(false)
  })

  it('should put and get elements', () => {
    map.put('one', 1)
    map.put('two', 2)
    map.put('three', 3)
    expect(map.getSize()).toBe(3)
    expect(map.get('one')).toBe(1)
    expect(map.get('two')).toBe(2)
    expect(map.get('three')).toBe(3)
  })

  it('should update value for an existing key', () => {
    map.put('key', 1)
    expect(map.get('key')).toBe(1)
    map.put('key', 2)
    expect(map.get('key')).toBe(2)
  })

  it('should remove elements', () => {
    map.put('one', 1)
    map.put('two', 2)
    map.put('three', 3)
    expect(map.remove('two')).toBe(2)
    expect(map.getSize()).toBe(2)
    expect(map.get('two')).toBeNull()
  })

  it('should return the correct size', () => {
    map.put('key1', 1)
    map.put('key2', 2)
    expect(map.getSize()).toBe(2)
  })

  it('should clear the map', () => {
    map.put('key1', 1)
    map.put('key2', 2)
    map.clear()
    expect(map.getSize()).toBe(0)
    expect(map.get('key1')).toBeNull()
    expect(map.get('key2')).toBeNull()
  })

  it('should check if a key is in the map', () => {
    map.put('key1', 1)
    map.put('key2', 2)
    expect(map.containsKey('key1')).toBe(true)
    expect(map.containsKey('key3')).toBe(false)
  })

  it('should return all keys', () => {
    map.put('one', 1)
    map.put('two', 2)
    map.put('three', 3)
    const keys = map.keys()
    expect(keys).toEqual(expect.arrayContaining(['one', 'two', 'three']))
  })

  it('should return all values', () => {
    map.put('one', 1)
    map.put('two', 2)
    map.put('three', 3)
    const values = map.values()
    expect(values).toEqual(expect.arrayContaining([1, 2, 3]))
  })

  it('should clear the map', () => {
    map.put('one', 1)
    map.put('two', 2)
    map.put('three', 3)
    map.clear()
    expect(map.getSize()).toBe(0)
    expect(map.get('one')).toBeNull()
    expect(map.get('two')).toBeNull()
    expect(map.get('three')).toBeNull()
  })

  it('should iterate over the map', () => {
    map.put('one', 1)
    map.put('two', 2)
    map.put('three', 3)
    const elements: { key: string; value: number }[] = []
    for (const entry of map) {
      elements.push(entry)
    }
    expect(elements).toEqual(
      expect.arrayContaining([
        { key: 'one', value: 1 },
        { key: 'two', value: 2 },
        { key: 'three', value: 3 },
      ]),
    )
  })
})
