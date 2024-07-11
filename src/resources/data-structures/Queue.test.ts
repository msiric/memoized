import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Queue } from './Queue'

describe('Queue', () => {
  let queue: Queue<number>

  beforeEach(() => {
    queue = new Queue<number>()
  })

  it('should initialize an empty queue', () => {
    expect(queue.size()).toBe(0)
    expect(queue.isEmpty()).toBe(true)
    expect(queue.peek()).toBeNull()
  })

  it('should enqueue elements into the queue', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.size()).toBe(3)
    expect(queue.peek()).toBe(1)
  })

  it('should dequeue elements from the queue', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.dequeue()).toBe(1)
    expect(queue.size()).toBe(2)
    expect(queue.peek()).toBe(2)
  })

  it('should return null when dequeuing from an empty queue', () => {
    expect(queue.dequeue()).toBeNull()
    expect(queue.size()).toBe(0)
    expect(queue.peek()).toBeNull()
  })

  it('should peek the front element without removing it', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.peek()).toBe(1)
    expect(queue.size()).toBe(3)
  })

  it('should return null when peeking into an empty queue', () => {
    expect(queue.peek()).toBeNull()
    expect(queue.size()).toBe(0)
  })

  it('should check if the queue is empty', () => {
    expect(queue.isEmpty()).toBe(true)
    queue.enqueue(1)
    expect(queue.isEmpty()).toBe(false)
  })

  it('should clear the queue', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    queue.clear()
    expect(queue.size()).toBe(0)
    expect(queue.isEmpty()).toBe(true)
    expect(queue.peek()).toBeNull()
  })

  it('should log the queue elements', () => {
    const logSpy = vi.spyOn(console, 'log')
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    queue.log()
    expect(logSpy).toHaveBeenCalledWith([1, 2, 3])
    logSpy.mockRestore()
  })

  it('should handle enqueue and dequeue operations', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.dequeue()).toBe(1)
    expect(queue.dequeue()).toBe(2)
    expect(queue.dequeue()).toBe(3)
    expect(queue.dequeue()).toBeNull()
  })

  it('should handle interleaved enqueue and dequeue operations', () => {
    queue.enqueue(1)
    expect(queue.dequeue()).toBe(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.dequeue()).toBe(2)
    expect(queue.peek()).toBe(3)
    expect(queue.dequeue()).toBe(3)
    expect(queue.isEmpty()).toBe(true)
  })
})
