import { describe, it, expect, beforeEach } from 'vitest'
import { PriorityQueue } from './PriorityQueue'

describe('PriorityQueue', () => {
  let pq: PriorityQueue<string>

  beforeEach(() => {
    pq = new PriorityQueue<string>()
  })

  it('should initialize an empty priority queue', () => {
    expect(pq.size()).toBe(0)
    expect(pq.isEmpty()).toBe(true)
    expect(pq.peek()).toBeNull()
  })

  it('should enqueue elements with priorities', () => {
    pq.enqueue('task1', 2)
    pq.enqueue('task2', 1)
    pq.enqueue('task3', 3)

    expect(pq.size()).toBe(3)
    expect(pq.isEmpty()).toBe(false)
  })

  it('should dequeue elements by priority', () => {
    pq.enqueue('task1', 2)
    pq.enqueue('task2', 1)
    pq.enqueue('task3', 3)

    expect(pq.dequeue()).toBe('task2')
    expect(pq.dequeue()).toBe('task1')
    expect(pq.dequeue()).toBe('task3')
    expect(pq.dequeue()).toBeNull()
  })

  it('should peek at the element with the highest priority without removing it', () => {
    pq.enqueue('task1', 2)
    pq.enqueue('task2', 1)

    expect(pq.peek()).toBe('task2')
    expect(pq.size()).toBe(2)
  })

  it('should return the correct size after enqueue and dequeue operations', () => {
    pq.enqueue('task1', 2)
    pq.enqueue('task2', 1)

    expect(pq.size()).toBe(2)
    pq.dequeue()
    expect(pq.size()).toBe(1)
    pq.dequeue()
    expect(pq.size()).toBe(0)
    pq.dequeue()
    expect(pq.size()).toBe(0)
  })

  it('should correctly determine if the priority queue is empty', () => {
    expect(pq.isEmpty()).toBe(true)
    pq.enqueue('task1', 2)
    expect(pq.isEmpty()).toBe(false)
    pq.dequeue()
    expect(pq.isEmpty()).toBe(true)
  })

  it('should handle enqueuing elements with the same priority', () => {
    pq.enqueue('task1', 1)
    pq.enqueue('task2', 1)
    pq.enqueue('task3', 1)

    expect(pq.size()).toBe(3)
    expect(pq.dequeue()).toBe('task1')
    expect(pq.dequeue()).toBe('task2')
    expect(pq.dequeue()).toBe('task3')
  })

  it('should handle a mix of enqueue and dequeue operations correctly', () => {
    pq.enqueue('task1', 3)
    pq.enqueue('task2', 2)
    pq.enqueue('task3', 1)

    expect(pq.dequeue()).toBe('task3')
    pq.enqueue('task4', 0)
    expect(pq.dequeue()).toBe('task4')
    expect(pq.dequeue()).toBe('task2')
    pq.enqueue('task5', 1)
    expect(pq.dequeue()).toBe('task5')
    expect(pq.dequeue()).toBe('task1')
  })
})
