import { describe, it, expect, beforeEach } from 'vitest'
import { MaxHeap } from './MaxHeap'

describe('MaxHeap', () => {
  let heap: MaxHeap<number>

  beforeEach(() => {
    heap = new MaxHeap<number>()
  })

  it('should initialize an empty heap', () => {
    expect(heap.size()).toBe(0)
    expect(heap.isEmpty()).toBe(true)
  })

  it('should insert elements into the heap and maintain max-heap property', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.insert(1)
    heap.insert(25)
    expect(heap.peek()).toBe(25)
    expect(heap.size()).toBe(5)
  })

  it('should extract the maximum element and maintain max-heap property', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.insert(1)
    heap.insert(25)
    expect(heap.extractMax()).toBe(25)
    expect(heap.peek()).toBe(20)
    expect(heap.size()).toBe(4)
    expect(heap.extractMax()).toBe(20)
    expect(heap.peek()).toBe(10)
    expect(heap.size()).toBe(3)
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
    expect(heap.peek()).toBe(25)
    expect(heap.size()).toBe(5)
  })

  it('should update the key of an existing element', () => {
    heap.insert(10)
    heap.insert(5)
    heap.insert(20)
    heap.updateKey(10, 30)
    expect(heap.peek()).toBe(30)
    heap.updateKey(30, 15)
    expect(heap.peek()).toBe(20)
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
