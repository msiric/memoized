import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SinglyLinkedList } from './SinglyLinkedList';

describe('SinglyLinkedList', () => {
  let list: SinglyLinkedList<number>;

  beforeEach(() => {
    list = new SinglyLinkedList();
  });

  it('should initialize an empty list', () => {
    expect(list.size()).toBe(0);
    expect(list.head()).toBeNull();
    expect(list.tail()).toBeNull();
    expect(list.isEmpty()).toBe(true);
  });

  it('should add elements to the end of the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.size()).toBe(3);
    expect(list.head()).toBe(1);
    expect(list.tail()).toBe(3);
    expect(list.get()).toEqual([1, 2, 3]);
  });

  it('should add elements to the beginning of the list', () => {
    list.addFirst(1);
    list.addFirst(2);
    list.addFirst(3);
    expect(list.size()).toBe(3);
    expect(list.head()).toBe(3);
    expect(list.tail()).toBe(1);
    expect(list.get()).toEqual([3, 2, 1]);
  });

  it('should remove the first element from the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.removeFirst()).toBe(1);
    expect(list.size()).toBe(2);
    expect(list.head()).toBe(2);
    expect(list.tail()).toBe(3);
    expect(list.get()).toEqual([2, 3]);
  });

  it('should remove the last element from the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.removeLast()).toBe(3);
    expect(list.size()).toBe(2);
    expect(list.head()).toBe(1);
    expect(list.tail()).toBe(2);
    expect(list.get()).toEqual([1, 2]);
  });

  it('should remove an element from the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.remove(2)).toBe(2);
    expect(list.size()).toBe(2);
    expect(list.head()).toBe(1);
    expect(list.tail()).toBe(3);
    expect(list.get()).toEqual([1, 3]);
  });

  it('should return the index of an element', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.indexOf(2)).toBe(1);
    expect(list.indexOf(4)).toBe(-1);
  });

  it('should return the element at a specific index', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.elementAt(1)).toBe(2);
    expect(() => list.elementAt(3)).toThrow(RangeError);
  });

  it('should add an element at a specific index', () => {
    list.addLast(1);
    list.addLast(3);
    list.addAt(1, 2);
    expect(list.size()).toBe(3);
    expect(list.get()).toEqual([1, 2, 3]);
  });

  it('should remove an element at a specific index', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.removeAt(1)).toBe(2);
    expect(list.size()).toBe(2);
    expect(list.get()).toEqual([1, 3]);
  });

  it('should find the middle element of the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    list.addLast(4);
    list.addLast(5);
    expect(list.findMiddle()?.data).toBe(3);
    list.addLast(6);
    expect(list.findMiddle()?.data).toBe(4);
  });

  it('should clean the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.clean();
    expect(list.size()).toBe(0);
    expect(list.head()).toBeNull();
    expect(list.tail()).toBeNull();
  });

  it('should rotate the list to the right by k places', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    list.addLast(4);
    list.addLast(5);
    list.rotateListRight(2);
    expect(list.get()).toEqual([4, 5, 1, 2, 3]);
  });

  it('should iterate over the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    const iterator = list.iterator();
    expect(iterator.next().value).toBe(1);
    expect(iterator.next().value).toBe(2);
    expect(iterator.next().value).toBe(3);
    expect(iterator.next().done).toBe(true);
  });

  it('should log the list', () => {
    const logSpy = vi.spyOn(console, 'log');
    list.addLast(1);
    list.addLast(2);
    list.log();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(list.headNode, null, 2));
    logSpy.mockRestore();
  });

  it('should reverse the list', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    list.reverse();
    expect(list.get()).toEqual([3, 2, 1]);
  });

  it('should handle addFirst on an empty list', () => {
    list.addFirst(1);
    expect(list.size()).toBe(1);
    expect(list.head()).toBe(1);
    expect(list.tail()).toBe(1);
  });

  it('should handle removeFirst on an empty list', () => {
    expect(list.removeFirst()).toBeNull();
    expect(list.size()).toBe(0);
    expect(list.head()).toBeNull();
    expect(list.tail()).toBeNull();
  });

  it('should handle removeLast on an empty list', () => {
    expect(list.removeLast()).toBeNull();
    expect(list.size()).toBe(0);
    expect(list.head()).toBeNull();
    expect(list.tail()).toBeNull();
  });

  it('should handle remove on a non-existent element', () => {
    list.addLast(1);
    list.addLast(2);
    list.addLast(3);
    expect(list.remove(4)).toBeNull();
    expect(list.size()).toBe(3);
    expect(list.get()).toEqual([1, 2, 3]);
  });

  it('should throw error on elementAt with negative index', () => {
    list.addLast(1);
    expect(() => list.elementAt(-1)).toThrow(RangeError);
  });

  it('should throw error on addAt with out of range index', () => {
    expect(() => list.addAt(1, 1)).toThrow(RangeError);
  });

  it('should throw error on removeAt with out of range index', () => {
    expect(() => list.removeAt(0)).toThrow(RangeError);
  });
});