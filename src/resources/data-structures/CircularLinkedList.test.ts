import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CircularLinkedList } from './CircularLinkedList'

describe('CircularLinkedList', () => {
  let list: CircularLinkedList<number>

  beforeEach(() => {
    list = new CircularLinkedList<number>()
  })

  it('should initialize an empty list', () => {
    expect(list.size()).toBe(0)
    expect(list.head()).toBeNull()
    expect(list.isEmpty()).toBe(true)
  })

  it('should add elements to the end of the list', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.size()).toBe(3)
    expect(list.head()).toBe(1)
    expect(list.get()).toEqual([1, 2, 3])
  })

  it('should add elements to the beginning of the list', () => {
    list.addAtFirst(1)
    list.addAtFirst(2)
    list.addAtFirst(3)
    expect(list.size()).toBe(3)
    expect(list.head()).toBe(3)
    expect(list.get()).toEqual([3, 2, 1])
  })

  it('should remove the first element from the list', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.removeFirst()).toBe(1)
    expect(list.size()).toBe(2)
    expect(list.head()).toBe(2)
    expect(list.get()).toEqual([2, 3])
  })

  it('should remove the last element from the list', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.remove()).toBe(3)
    expect(list.size()).toBe(2)
    expect(list.head()).toBe(1)
    expect(list.get()).toEqual([1, 2])
  })

  it('should remove an element from the list', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.removeData(2)).toBe(2)
    expect(list.size()).toBe(2)
    expect(list.head()).toBe(1)
    expect(list.get()).toEqual([1, 3])
  })

  it('should return the index of an element', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.indexOf(2)).toBe(1)
    expect(list.indexOf(4)).toBe(-1)
  })

  it('should return the element at a specific index', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.getElementAt(1)?.data).toBe(2)
    expect(list.getElementAt(3)).toBeNull()
  })

  it('should add an element at a specific index', () => {
    list.add(1)
    list.add(3)
    list.insertAt(1, 2)
    expect(list.size()).toBe(3)
    expect(list.get()).toEqual([1, 2, 3])
  })

  it('should remove an element at a specific index', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.removeAt(1)).toBe(2)
    expect(list.size()).toBe(2)
    expect(list.get()).toEqual([1, 3])
  })

  it('should clean the list', () => {
    list.add(1)
    list.add(2)
    list.clear()
    expect(list.size()).toBe(0)
    expect(list.head()).toBeNull()
  })

  it('should iterate over the list', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    const elements: number[] = []
    for (const element of list) {
      elements.push(element)
    }
    expect(elements).toEqual([1, 2, 3])
  })

  it('should log the list', () => {
    const logSpy = vi.spyOn(console, 'log')
    list.add(1)
    list.add(2)
    list.printData()
    expect(logSpy).toHaveBeenCalledWith(1)
    expect(logSpy).toHaveBeenCalledWith(2)
    logSpy.mockRestore()
  })

  it('should handle addAtFirst on an empty list', () => {
    list.addAtFirst(1)
    expect(list.size()).toBe(1)
    expect(list.head()).toBe(1)
  })

  it('should handle removeFirst on an empty list', () => {
    expect(list.removeFirst()).toBeNull()
    expect(list.size()).toBe(0)
    expect(list.head()).toBeNull()
  })

  it('should handle remove on an empty list', () => {
    expect(list.remove()).toBeNull()
    expect(list.size()).toBe(0)
    expect(list.head()).toBeNull()
  })

  it('should handle removeData on a non-existent element', () => {
    list.add(1)
    list.add(2)
    list.add(3)
    expect(list.removeData(4)).toBeNull()
    expect(list.size()).toBe(3)
    expect(list.get()).toEqual([1, 2, 3])
  })

  it('should throw error on insertAt with out of range index', () => {
    expect(() => list.insertAt(1, 1)).toThrow(RangeError)
  })

  it('should throw error on removeAt with out of range index', () => {
    expect(() => list.removeAt(4)).toThrow(RangeError)
  })
})
