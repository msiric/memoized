import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Queue } from './Queue'

describe('Queue', () => {
  let queue: Queue<number>

  beforeEach(() => {
    queue = new Queue<number>()
  })

  it('should initialize an empty queue', () => {
    expect(queue.size()).toBe(0)
    expect(() => queue.peek()).toThrow('Queue is empty')
    expect(queue.isEmpty()).toBe(true)
  })

  it('should enqueue elements to the queue', () => {
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

  it('should throw an error when dequeuing from an empty queue', () => {
    expect(() => queue.dequeue()).toThrow('Queue is empty')
    expect(queue.size()).toBe(0)
    expect(() => queue.peek()).toThrow('Queue is empty')
  })

  it('should peek the front element without removing it', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.peek()).toBe(1)
    expect(queue.size()).toBe(3)
  })

  it('should throw an error when peeking into an empty queue', () => {
    expect(() => queue.peek()).toThrow('Queue is empty')
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
    expect(() => queue.peek()).toThrow('Queue is empty')
  })

  it('should log the queue elements', () => {
    const logSpy = vi.spyOn(console, 'log')
    queue.enqueue(1)
    queue.enqueue(2)
    queue.log()
    expect(logSpy).toHaveBeenCalledWith([1, 2])
    logSpy.mockRestore()
  })

  it('should handle enqueue and dequeue operations', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    expect(queue.dequeue()).toBe(1)
    expect(queue.dequeue()).toBe(2)
    expect(queue.dequeue()).toBe(3)
    expect(() => queue.dequeue()).toThrow('Queue is empty')
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

  it('should initialize queue with an array', () => {
    const arrayQueue = new Queue<number>([1, 2, 3])
    expect(arrayQueue.size()).toBe(3)
    expect(arrayQueue.peek()).toBe(1)
  })

  it('should iterate over the queue', () => {
    queue.enqueue(1)
    queue.enqueue(2)
    queue.enqueue(3)
    const elements: number[] = []
    for (const element of queue) {
      elements.push(element)
    }
    expect(elements).toEqual([1, 2, 3])
  })
})
