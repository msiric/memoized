import { beforeEach, describe, expect, it } from 'vitest'
import { BinarySearchTree } from './BinarySearchTree'

describe('BinarySearchTree', () => {
  let tree: BinarySearchTree<number>

  beforeEach(() => {
    tree = new BinarySearchTree<number>()
  })

  it('should initialize an empty binary search tree', () => {
    expect(tree.root).toBeNull()
  })

  it('should insert nodes into the binary search tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    expect(tree.root?.data).toBe(10)
    expect(tree.root?.left?.data).toBe(5)
    expect(tree.root?.right?.data).toBe(15)
  })

  it('should perform in-order traversal', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    tree.insert(3)
    tree.insert(7)
    tree.insert(12)
    tree.insert(18)
    expect(tree.inorderTraversal(tree.root)).toEqual([3, 5, 7, 10, 12, 15, 18])
  })

  it('should perform pre-order traversal', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    tree.insert(3)
    tree.insert(7)
    tree.insert(12)
    tree.insert(18)
    expect(tree.preorderTraversal(tree.root)).toEqual([10, 5, 3, 7, 15, 12, 18])
  })

  it('should perform post-order traversal', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    tree.insert(3)
    tree.insert(7)
    tree.insert(12)
    tree.insert(18)
    expect(tree.postorderTraversal(tree.root)).toEqual([
      3, 7, 5, 12, 18, 15, 10,
    ])
  })

  it('should perform breadth-first traversal', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    tree.insert(3)
    tree.insert(7)
    tree.insert(12)
    tree.insert(18)
    expect(tree.breadthFirstTraversal()).toEqual([10, 5, 15, 3, 7, 12, 18])
  })

  it('should search for nodes in the binary search tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    expect(tree.search(tree.root, 10)?.data).toBe(10)
    expect(tree.search(tree.root, 5)?.data).toBe(5)
    expect(tree.search(tree.root, 15)?.data).toBe(15)
    expect(tree.search(tree.root, 20)).toBeNull()
  })

  it('should remove nodes from the binary search tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    tree.insert(3)
    tree.insert(7)
    tree.insert(12)
    tree.insert(18)
    tree.remove(10)
    expect(tree.inorderTraversal(tree.root)).toEqual([3, 5, 7, 12, 15, 18])
    tree.remove(5)
    expect(tree.inorderTraversal(tree.root)).toEqual([3, 7, 12, 15, 18])
    tree.remove(15)
    expect(tree.inorderTraversal(tree.root)).toEqual([3, 7, 12, 18])
  })

  it('should find the minimum value in the tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    expect(tree.findMin()).toBe(5)
    tree.insert(3)
    expect(tree.findMin()).toBe(3)
  })

  it('should find the maximum value in the tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    expect(tree.findMax()).toBe(15)
    tree.insert(18)
    expect(tree.findMax()).toBe(18)
  })

  it('should calculate the height of the tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    expect(tree.height()).toBe(1)
    tree.insert(3)
    tree.insert(7)
    expect(tree.height()).toBe(2)
  })

  it('should clear the tree', () => {
    tree.insert(10)
    tree.insert(5)
    tree.insert(15)
    tree.clear()
    expect(tree.root).toBeNull()
  })
})
