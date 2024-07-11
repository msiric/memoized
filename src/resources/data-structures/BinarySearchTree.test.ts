import { describe, it, expect, beforeEach } from 'vitest'
import { BinarySearchTree, TreeNode } from './BinarySearchTree'

describe('BinarySearchTree', () => {
  let bst: BinarySearchTree<number>

  beforeEach(() => {
    bst = new BinarySearchTree<number>()
  })

  it('should initialize an empty tree', () => {
    expect(bst.root).toBeNull()
  })

  it('should insert nodes in the tree', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    expect(bst.root?.data).toBe(5)
    expect(bst.root?.left?.data).toBe(3)
    expect(bst.root?.right?.data).toBe(7)
  })

  it('should perform in-order traversal', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    bst.insert(2)
    bst.insert(4)
    bst.insert(6)
    bst.insert(8)
    expect(bst.inorderTraversal(bst.root)).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it('should perform pre-order traversal', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    bst.insert(2)
    bst.insert(4)
    bst.insert(6)
    bst.insert(8)
    expect(bst.preorderTraversal(bst.root)).toEqual([5, 3, 2, 4, 7, 6, 8])
  })

  it('should perform post-order traversal', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    bst.insert(2)
    bst.insert(4)
    bst.insert(6)
    bst.insert(8)
    expect(bst.postorderTraversal(bst.root)).toEqual([2, 4, 3, 6, 8, 7, 5])
  })

  it('should search for a node in the tree', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    bst.insert(2)
    bst.insert(4)
    bst.insert(6)
    bst.insert(8)
    expect(bst.search(bst.root, 4)?.data).toBe(4)
    expect(bst.search(bst.root, 9)).toBeNull()
  })

  it('should find the minimum node in the tree', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    bst.insert(2)
    bst.insert(4)
    expect(bst.findMinNode(bst.root!)?.data).toBe(2)
  })

  it('should remove nodes from the tree', () => {
    bst.insert(5)
    bst.insert(3)
    bst.insert(7)
    bst.insert(2)
    bst.insert(4)
    bst.insert(6)
    bst.insert(8)

    bst.remove(3)
    expect(bst.inorderTraversal(bst.root)).toEqual([2, 4, 5, 6, 7, 8])

    bst.remove(5)
    expect(bst.inorderTraversal(bst.root)).toEqual([2, 4, 6, 7, 8])

    bst.remove(7)
    expect(bst.inorderTraversal(bst.root)).toEqual([2, 4, 6, 8])
  })
})
