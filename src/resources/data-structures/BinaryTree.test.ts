import { describe, it, expect, beforeEach } from 'vitest'
import { BinaryTree, TreeNode } from './BinaryTree'

describe('BinaryTree', () => {
  let bt: BinaryTree<number>

  beforeEach(() => {
    bt = new BinaryTree<number>()
  })

  it('should initialize an empty tree', () => {
    expect(bt.root).toBeNull()
  })

  it('should insert nodes in the tree', () => {
    bt.insert(5)
    bt.insert(3)
    bt.insert(7)
    expect(bt.root?.data).toBe(5)
    expect(bt.root?.left?.data).toBe(3)
    expect(bt.root?.right?.data).toBe(7)
  })

  it('should perform in-order traversal', () => {
    bt.insert(5)
    bt.insert(3)
    bt.insert(7)
    bt.insert(2)
    bt.insert(4)
    bt.insert(6)
    bt.insert(8)
    expect(bt.inorderTraversal(bt.root)).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it('should perform pre-order traversal', () => {
    bt.insert(5)
    bt.insert(3)
    bt.insert(7)
    bt.insert(2)
    bt.insert(4)
    bt.insert(6)
    bt.insert(8)
    expect(bt.preorderTraversal(bt.root)).toEqual([5, 3, 2, 4, 7, 6, 8])
  })

  it('should perform post-order traversal', () => {
    bt.insert(5)
    bt.insert(3)
    bt.insert(7)
    bt.insert(2)
    bt.insert(4)
    bt.insert(6)
    bt.insert(8)
    expect(bt.postorderTraversal(bt.root)).toEqual([2, 4, 3, 6, 8, 7, 5])
  })

  it('should search for a node in the tree', () => {
    bt.insert(5)
    bt.insert(3)
    bt.insert(7)
    bt.insert(2)
    bt.insert(4)
    bt.insert(6)
    bt.insert(8)
    expect(bt.search(bt.root, 4)?.data).toBe(4)
    expect(bt.search(bt.root, 9)).toBeNull()
  })
})
