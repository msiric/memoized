import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MaxHeap } from './MaxHeap'

describe('MaxHeap', () => {
  let heap: MaxHeap<number>

  beforeEach(() => {
    heap = new MaxHeap<number>()
  })

  it('should initialize an empty heap', () => {
    expect(heap.size()).toBe(0)
    expect(heap.peek()).toBeNull()
    expect(heap.isEmpty()).toBe(true)
  })

  it('should insert elements into the heap', () => {
    heap.insert(1)
    heap.insert(3)
    heap.insert(2)
    expect(heap.size()).toBe(3)
    expect(heap.peek()).toBe(3)
  })

  it('should extract the maximum element from the heap', () => {
    heap.insert(1)
    heap.insert(3)
    heap.insert(2)
    expect(heap.extractMax()).toBe(3)
    expect(heap.size()).toBe(2)
    expect(heap.peek()).toBe(2)
  })

  it('should maintain the heap property', () => {
    heap.insert(10)
    heap.insert(15)
    heap.insert(20)
    heap.insert(17)
    heap.insert(8)
    expect(heap.peek()).toBe(20)
    heap.insert(25)
    expect(heap.peek()).toBe(25)
    heap.extractMax()
    expect(heap.peek()).toBe(20)
  })

  it('should handle extractMax on an empty heap', () => {
    expect(heap.extractMax()).toBeNull()
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
    expect(logSpy).toHaveBeenCalledWith([2, 1])
    logSpy.mockRestore()
  })
})
