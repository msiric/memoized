import { describe, it, expect, beforeEach } from 'vitest'
import { MinHeap } from './MinHeap'

describe('MinHeap', () => {
  let heap: MinHeap<number>

  beforeEach(() => {
    heap = new MinHeap<number>()
  })

  it('should initialize an empty heap', () => {
    expect(heap.size()).toBe(0)
    expect(heap.isEmpty()).toBe(true)
  })

  it('should insert elements into the heap and maintain min-heap property', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.insert(1)
    heap.insert(25)
    expect(heap.peek()).toBe(1)
    expect(heap.size()).toBe(5)
  })

  it('should extract the minimum element and maintain min-heap property', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.insert(1)
    heap.insert(25)
    expect(heap.extractMin()).toBe(1)
    expect(heap.peek()).toBe(5)
    expect(heap.size()).toBe(4)
    expect(heap.extractMin()).toBe(5)
    expect(heap.peek()).toBe(10)
    expect(heap.size()).toBe(3)
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
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.clear()
    expect(heap.size()).toBe(0)
    expect(heap.isEmpty()).toBe(true)
  })

  it('should check if the heap contains an element', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    expect(heap.contains(10)).toBe(true)
    expect(heap.contains(15)).toBe(false)
  })

  it('should build the heap from an existing array', () => {
    heap.heapify([10, 5, 20, 1, 25])
    expect(heap.peek()).toBe(1)
    expect(heap.size()).toBe(5)
  })

  it('should update the key of an existing element', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.updateKey(10, 1)
    expect(heap.peek()).toBe(1)
    heap.updateKey(1, 15)
    expect(heap.peek()).toBe(5)
  })

  it('should remove an arbitrary element from the heap', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    expect(heap.remove(10)).toBe(true)
    expect(heap.contains(10)).toBe(false)
    expect(heap.size()).toBe(2)
    expect(heap.remove(15)).toBe(false)
  })
})
