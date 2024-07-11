import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Stack } from './Stack'

describe('Stack', () => {
  let stack: Stack<number>

  beforeEach(() => {
    stack = new Stack<number>()
  })

  it('should initialize an empty stack', () => {
    expect(stack.size()).toBe(0)
    expect(stack.isEmpty()).toBe(true)
    expect(stack.peek()).toBeNull()
  })

  it('should push elements onto the stack', () => {
    stack.push(1)
    stack.push(2)
    stack.push(3)
    expect(stack.size()).toBe(3)
    expect(stack.peek()).toBe(3)
  })

  it('should pop elements from the stack', () => {
    stack.push(1)
    stack.push(2)
    stack.push(3)
    expect(stack.pop()).toBe(3)
    expect(stack.size()).toBe(2)
    expect(stack.peek()).toBe(2)
  })

  it('should return null when popping from an empty stack', () => {
    expect(stack.pop()).toBeNull()
    expect(stack.size()).toBe(0)
    expect(stack.peek()).toBeNull()
  })

  it('should peek the top element without removing it', () => {
    stack.push(1)
    stack.push(2)
    stack.push(3)
    expect(stack.peek()).toBe(3)
    expect(stack.size()).toBe(3)
  })

  it('should return null when peeking into an empty stack', () => {
    expect(stack.peek()).toBeNull()
    expect(stack.size()).toBe(0)
  })

  it('should check if the stack is empty', () => {
    expect(stack.isEmpty()).toBe(true)
    stack.push(1)
    expect(stack.isEmpty()).toBe(false)
  })

  it('should clear the stack', () => {
    stack.push(1)
    stack.push(2)
    stack.push(3)
    stack.clear()
    expect(stack.size()).toBe(0)
    expect(stack.isEmpty()).toBe(true)
    expect(stack.peek()).toBeNull()
  })

  it('should log the stack elements', () => {
    const logSpy = vi.spyOn(console, 'log')
    stack.push(1)
    stack.push(2)
    stack.push(3)
    stack.log()
    expect(logSpy).toHaveBeenCalledWith([3, 2, 1])
    logSpy.mockRestore()
  })

  it('should handle push and pop operations', () => {
    stack.push(1)
    stack.push(2)
    stack.push(3)
    expect(stack.pop()).toBe(3)
    expect(stack.pop()).toBe(2)
    expect(stack.pop()).toBe(1)
    expect(stack.pop()).toBeNull()
  })

  it('should handle interleaved push and pop operations', () => {
    stack.push(1)
    expect(stack.pop()).toBe(1)
    stack.push(2)
    stack.push(3)
    expect(stack.pop()).toBe(3)
    expect(stack.peek()).toBe(2)
    expect(stack.pop()).toBe(2)
    expect(stack.isEmpty()).toBe(true)
  })
})
