import { describe, it, expect, beforeEach } from 'vitest'
import { AVLTree } from './AVLTree'

describe('AVLTree', () => {
  let tree: AVLTree<number>

  beforeEach(() => {
    tree = new AVLTree<number>()
  })

  it('should insert values and balance the tree', () => {
    tree.insert(10)
    tree.insert(20)
    tree.insert(30)
    tree.insert(40)
    tree.insert(50)
    tree.insert(25)
    expect(tree.inorder()).toEqual([10, 20, 25, 30, 40, 50])
    expect(tree.preorder()).toEqual([30, 20, 10, 25, 40, 50])
    expect(tree.postorder()).toEqual([10, 25, 20, 50, 40, 30])
    expect(tree.levelOrder()).toEqual([30, 20, 40, 10, 25, 50])
  })

  it('should delete values and balance the tree', () => {
    tree.insert(10)
    tree.insert(20)
    tree.insert(30)
    tree.insert(40)
    tree.insert(50)
    tree.insert(25)
    tree.delete(30)
    expect(tree.inorder()).toEqual([10, 20, 25, 40, 50])
    expect(tree.preorder()).toEqual([40, 20, 10, 25, 50])
    expect(tree.postorder()).toEqual([10, 25, 20, 50, 40])
    expect(tree.levelOrder()).toEqual([40, 20, 50, 10, 25])
  })

  it('should handle duplicate inserts', () => {
    tree.insert(10)
    tree.insert(20)
    tree.insert(20)
    expect(tree.inorder()).toEqual([10, 20])
  })

  it('should handle deleting non-existent values gracefully', () => {
    tree.insert(10)
    tree.insert(20)
    tree.delete(30)
    expect(tree.inorder()).toEqual([10, 20])
  })

  it('should handle inserting and deleting a single value', () => {
    tree.insert(10)
    expect(tree.inorder()).toEqual([10])
    tree.delete(10)
    expect(tree.inorder()).toEqual([])
  })
})
