import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PriorityQueue } from './PriorityQueue'

describe('PriorityQueue', () => {
  let pq: PriorityQueue<number>

  beforeEach(() => {
    pq = new PriorityQueue<number>()
  })

  it('should initialize an empty priority queue', () => {
    expect(pq.size()).toBe(0)
    expect(() => pq.peek()).toThrow('PriorityQueue is empty')
    expect(pq.isEmpty()).toBe(true)
  })

  it('should enqueue elements into the priority queue', () => {
    pq.enqueue(1, 3)
    pq.enqueue(2, 1)
    pq.enqueue(3, 2)
    expect(pq.size()).toBe(3)
    expect(pq.peek()).toBe(2)
  })

  it('should dequeue elements from the priority queue', () => {
    pq.enqueue(1, 3)
    pq.enqueue(2, 1)
    pq.enqueue(3, 2)
    expect(pq.dequeue()).toBe(2)
    expect(pq.size()).toBe(2)
    expect(pq.peek()).toBe(3)
  })

  it('should throw an error when dequeuing from an empty priority queue', () => {
    expect(() => pq.dequeue()).toThrow('PriorityQueue is empty')
    expect(pq.size()).toBe(0)
    expect(() => pq.peek()).toThrow('PriorityQueue is empty')
  })

  it('should peek the highest priority element without removing it', () => {
    pq.enqueue(1, 3)
    pq.enqueue(2, 1)
    pq.enqueue(3, 2)
    expect(pq.peek()).toBe(2)
    expect(pq.size()).toBe(3)
  })

  it('should throw an error when peeking into an empty priority queue', () => {
    expect(() => pq.peek()).toThrow('PriorityQueue is empty')
    expect(pq.size()).toBe(0)
  })

  it('should check if the priority queue is empty', () => {
    expect(pq.isEmpty()).toBe(true)
    pq.enqueue(1, 1)
    expect(pq.isEmpty()).toBe(false)
  })

  it('should clear the priority queue', () => {
    pq.enqueue(1, 1)
    pq.enqueue(2, 2)
    pq.clear()
    expect(pq.size()).toBe(0)
    expect(pq.isEmpty()).toBe(true)
    expect(() => pq.peek()).toThrow('PriorityQueue is empty')
  })

  it('should handle enqueue and dequeue operations', () => {
    pq.enqueue(1, 3)
    pq.enqueue(2, 1)
    pq.enqueue(3, 2)
    expect(pq.dequeue()).toBe(2)
    expect(pq.dequeue()).toBe(3)
    expect(pq.dequeue()).toBe(1)
    expect(() => pq.dequeue()).toThrow('PriorityQueue is empty')
  })

  it('should handle interleaved enqueue and dequeue operations', () => {
    pq.enqueue(1, 3)
    expect(pq.dequeue()).toBe(1)
    pq.enqueue(2, 1)
    pq.enqueue(3, 2)
    expect(pq.dequeue()).toBe(2)
    expect(pq.peek()).toBe(3)
    expect(pq.dequeue()).toBe(3)
    expect(pq.isEmpty()).toBe(true)
  })

  it('should iterate over the priority queue', () => {
    pq.enqueue(1, 3)
    pq.enqueue(2, 1)
    pq.enqueue(3, 2)
    const elements: number[] = []
    for (const element of pq) {
      elements.push(element)
    }
    expect(elements).toEqual([2, 3, 1])
  })
})
