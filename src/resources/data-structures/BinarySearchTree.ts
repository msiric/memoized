class TreeNode<T> {
  data: T
  left: TreeNode<T> | null
  right: TreeNode<T> | null

  constructor(data: T) {
    this.data = data
    this.left = null
    this.right = null
  }
}

class BinarySearchTree<T> {
  root: TreeNode<T> | null

  constructor() {
    this.root = null
  }

  // Insert a node in the BST
  insert(data: T) {
    const newNode = new TreeNode(data)
    if (this.root === null) {
      this.root = newNode
    } else {
      this.insertNode(this.root, newNode)
    }
  }

  private insertNode(node: TreeNode<T>, newNode: TreeNode<T>) {
    if (newNode.data < node.data) {
      if (node.left === null) {
        node.left = newNode
      } else {
        this.insertNode(node.left, newNode)
      }
    } else {
      if (node.right === null) {
        node.right = newNode
      } else {
        this.insertNode(node.right, newNode)
      }
    }
  }

  // In-order traversal
  inorderTraversal(node: TreeNode<T> | null, result: T[] = []): T[] {
    if (node !== null) {
      this.inorderTraversal(node.left, result)
      result.push(node.data)
      this.inorderTraversal(node.right, result)
    }
    return result
  }

  // Pre-order traversal
  preorderTraversal(node: TreeNode<T> | null, result: T[] = []): T[] {
    if (node !== null) {
      result.push(node.data)
      this.preorderTraversal(node.left, result)
      this.preorderTraversal(node.right, result)
    }
    return result
  }

  // Post-order traversal
  postorderTraversal(node: TreeNode<T> | null, result: T[] = []): T[] {
    if (node !== null) {
      this.postorderTraversal(node.left, result)
      this.postorderTraversal(node.right, result)
      result.push(node.data)
    }
    return result
  }

  // Search for a node in the BST
  search(node: TreeNode<T> | null, data: T): TreeNode<T> | null {
    if (node === null) {
      return null
    }
    if (data < node.data) {
      return this.search(node.left, data)
    } else if (data > node.data) {
      return this.search(node.right, data)
    } else {
      return node
    }
  }

  // Find the minimum node in the BST
  findMinNode(node: TreeNode<T>): TreeNode<T> | null {
    if (node.left === null) {
      return node
    } else {
      return this.findMinNode(node.left)
    }
  }

  // Remove a node in the BST
  remove(data: T) {
    this.root = this.removeNode(this.root, data)
  }

  private removeNode(node: TreeNode<T> | null, data: T): TreeNode<T> | null {
    if (node === null) {
      return null
    }
    if (data < node.data) {
      node.left = this.removeNode(node.left, data)
      return node
    } else if (data > node.data) {
      node.right = this.removeNode(node.right, data)
      return node
    } else {
      // Node with only one child or no child
      if (node.left === null && node.right === null) {
        node = null
        return node
      }
      if (node.left === null) {
        node = node.right
        return node
      } else if (node.right === null) {
        node = node.left
        return node
      }

      // Node with two children: Get the inorder successor (smallest in the right subtree)
      const tempNode = this.findMinNode(node.right)
      node.data = tempNode!.data
      node.right = this.removeNode(node.right, tempNode!.data)
      return node
    }
  }
}

export { BinarySearchTree, TreeNode }
