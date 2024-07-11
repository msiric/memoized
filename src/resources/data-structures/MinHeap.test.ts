import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MinHeap } from './MinHeap'

describe('MinHeap', () => {
  let heap: MinHeap<number>

  beforeEach(() => {
    heap = new MinHeap<number>()
  })

  it('should initialize an empty heap', () => {
    expect(heap.size()).toBe(0)
    expect(heap.peek()).toBeNull()
    expect(heap.isEmpty()).toBe(true)
  })

  it('should insert elements into the heap', () => {
    heap.insert(3)
    heap.insert(1)
    heap.insert(2)
    expect(heap.size()).toBe(3)
    expect(heap.peek()).toBe(1)
  })

  it('should extract the minimum element from the heap', () => {
    heap.insert(3)
    heap.insert(1)
    heap.insert(2)
    expect(heap.extractMin()).toBe(1)
    expect(heap.size()).toBe(2)
    expect(heap.peek()).toBe(2)
  })

  it('should maintain the heap property', () => {
    heap.insert(10)
    heap.insert(15)
    heap.insert(20)
    heap.insert(17)
    heap.insert(8)
    expect(heap.peek()).toBe(8)
    heap.insert(5)
    expect(heap.peek()).toBe(5)
    heap.extractMin()
    expect(heap.peek()).toBe(8)
  })

  it('should handle extractMin on an empty heap', () => {
    expect(heap.extractMin()).toBeNull()
  })

  it('should handle peek on an empty heap', () => {
    expect(heap.peek()).toBeNull()
  })

  it('should clear the heap', () => {
    heap.insert(1)
    heap.insert(2)
    heap.clear()
    expect(heap.size()).toBe(0)
    expect(heap.peek()).toBeNull()
  })

  it('should log the heap', () => {
    const logSpy = vi.spyOn(console, 'log')
    heap.insert(1)
    heap.insert(2)
    heap.log()
    expect(logSpy).toHaveBeenCalledWith([1, 2])
    logSpy.mockRestore()
  })
})
