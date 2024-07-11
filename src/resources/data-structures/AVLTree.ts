class AVLTreeNode<T> {
  value: T
  height: number
  left: AVLTreeNode<T> | null
  right: AVLTreeNode<T> | null

  constructor(value: T) {
    this.value = value
    this.height = 1
    this.left = null
    this.right = null
  }
}

class AVLTree<T> {
  root: AVLTreeNode<T> | null

  constructor() {
    this.root = null
  }

  // Helper function to get the height of the node
  private height(node: AVLTreeNode<T> | null): number {
    return node ? node.height : 0
  }

  // Helper function to get balance factor of the node
  private getBalance(node: AVLTreeNode<T> | null): number {
    return node ? this.height(node.left) - this.height(node.right) : 0
  }

  // Helper function to perform right rotation
  private rightRotate(y: AVLTreeNode<T>): AVLTreeNode<T> {
    const x = y.left!
    const T2 = x.right

    x.right = y
    y.left = T2

    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1
    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1

    return x
  }

  // Helper function to perform left rotation
  private leftRotate(x: AVLTreeNode<T>): AVLTreeNode<T> {
    const y = x.right!
    const T2 = y.left

    y.left = x
    x.right = T2

    x.height = Math.max(this.height(x.left), this.height(x.right)) + 1
    y.height = Math.max(this.height(y.left), this.height(y.right)) + 1

    return y
  }

  // Insert a value into the AVL tree
  insert(value: T) {
    this.root = this.insertNode(this.root, value)
  }

  private insertNode(node: AVLTreeNode<T> | null, value: T): AVLTreeNode<T> {
    if (!node) return new AVLTreeNode(value)

    if (value < node.value) {
      node.left = this.insertNode(node.left, value)
    } else if (value > node.value) {
      node.right = this.insertNode(node.right, value)
    } else {
      return node
    }

    node.height = 1 + Math.max(this.height(node.left), this.height(node.right))

    const balance = this.getBalance(node)

    // Left Left Case
    if (balance > 1 && value < node.left!.value) return this.rightRotate(node)

    // Right Right Case
    if (balance < -1 && value > node.right!.value) return this.leftRotate(node)

    // Left Right Case
    if (balance > 1 && value > node.left!.value) {
      node.left = this.leftRotate(node.left!)
      return this.rightRotate(node)
    }

    // Right Left Case
    if (balance < -1 && value < node.right!.value) {
      node.right = this.rightRotate(node.right!)
      return this.leftRotate(node)
    }

    return node
  }

  // Get the minimum value node
  private getMinValueNode(node: AVLTreeNode<T>): AVLTreeNode<T> {
    let current = node
    while (current.left) current = current.left
    return current
  }

  // Delete a value from the AVL tree
  delete(value: T) {
    this.root = this.deleteNode(this.root, value)
  }

  private deleteNode(
    node: AVLTreeNode<T> | null,
    value: T,
  ): AVLTreeNode<T> | null {
    if (!node) return node

    if (value < node.value) {
      node.left = this.deleteNode(node.left, value)
    } else if (value > node.value) {
      node.right = this.deleteNode(node.right, value)
    } else {
      if (!node.left || !node.right) {
        const temp = node.left ? node.left : node.right
        if (!temp) {
          return null
        } else {
          node = temp
        }
      } else {
        const temp = this.getMinValueNode(node.right!)
        node.value = temp.value
        node.right = this.deleteNode(node.right, temp.value)
      }
    }

    node.height = Math.max(this.height(node.left), this.height(node.right)) + 1

    const balance = this.getBalance(node)

    if (balance > 1 && this.getBalance(node.left) >= 0)
      return this.rightRotate(node)
    if (balance > 1 && this.getBalance(node.left) < 0) {
      node.left = this.leftRotate(node.left!)
      return this.rightRotate(node)
    }
    if (balance < -1 && this.getBalance(node.right) <= 0)
      return this.leftRotate(node)
    if (balance < -1 && this.getBalance(node.right) > 0) {
      node.right = this.rightRotate(node.right!)
      return this.leftRotate(node)
    }

    return node
  }

  // Preorder traversal
  preorder(node: AVLTreeNode<T> | null = this.root, result: T[] = []): T[] {
    if (node) {
      result.push(node.value)
      this.preorder(node.left, result)
      this.preorder(node.right, result)
    }
    return result
  }

  // Inorder traversal
  inorder(node: AVLTreeNode<T> | null = this.root, result: T[] = []): T[] {
    if (node) {
      this.inorder(node.left, result)
      result.push(node.value)
      this.inorder(node.right, result)
    }
    return result
  }

  // Postorder traversal
  postorder(node: AVLTreeNode<T> | null = this.root, result: T[] = []): T[] {
    if (node) {
      this.postorder(node.left, result)
      this.postorder(node.right, result)
      result.push(node.value)
    }
    return result
  }

  // Level order traversal
  levelOrder(): T[] {
    const result: T[] = []
    const queue: (AVLTreeNode<T> | null)[] = [this.root]

    while (queue.length > 0) {
      const node = queue.shift()
      if (node) {
        result.push(node.value)
        if (node.left) queue.push(node.left)
        if (node.right) queue.push(node.right)
      }
    }

    return result
  }
}

export { AVLTree, AVLTreeNode }
