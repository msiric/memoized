import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HashMap } from './HashMap'

describe('HashMap', () => {
  let map: HashMap<string, number>

  beforeEach(() => {
    map = new HashMap<string, number>()
  })

  it('should initialize an empty map', () => {
    expect(map.getSize()).toBe(0)
    expect(map.get('key')).toBeNull()
  })

  it('should put and get elements in the map', () => {
    map.put('key1', 1)
    map.put('key2', 2)
    map.put('key3', 3)
    expect(map.get('key1')).toBe(1)
    expect(map.get('key2')).toBe(2)
    expect(map.get('key3')).toBe(3)
  })

  it('should handle collisions and update existing keys', () => {
    map.put('key1', 1)
    map.put('key1', 10)
    expect(map.get('key1')).toBe(10)
  })

  it('should remove elements from the map', () => {
    map.put('key1', 1)
    map.put('key2', 2)
    expect(map.remove('key1')).toBe(1)
    expect(map.get('key1')).toBeNull()
    expect(map.getSize()).toBe(1)
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
    map.put('key1', 1)
    map.put('key2', 2)
    map.put('key3', 3)
    expect(map.keys().sort()).toEqual(['key1', 'key2', 'key3'].sort())
  })

  it('should return all values', () => {
    map.put('key1', 1)
    map.put('key2', 2)
    map.put('key3', 3)
    expect(map.values().sort()).toEqual([1, 2, 3].sort())
  })

  it('should log the map buckets', () => {
    const logSpy = vi.spyOn(console, 'log')
    map.put('key1', 1)
    map.put('key2', 2)
    map.log()
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })
})
