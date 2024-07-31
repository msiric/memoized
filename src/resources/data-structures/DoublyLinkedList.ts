class DoublyLinkedListNode<T> {
  data: T
  next: DoublyLinkedListNode<T> | null
  prev: DoublyLinkedListNode<T> | null

  constructor(data: T) {
    this.data = data
    this.next = null
    this.prev = null
  }
}

class DoublyLinkedList<T> {
  headNode: DoublyLinkedListNode<T> | null
  tailNode: DoublyLinkedListNode<T> | null
  length: number

  constructor(listOfValues?: T[]) {
    this.headNode = null
    this.tailNode = null
    this.length = 0

    if (Array.isArray(listOfValues)) {
      for (const value of listOfValues) {
        this.addLast(value)
      }
    }
  }

  private initiateNodeAndIndex() {
    return { currentNode: this.headNode, currentIndex: 0 }
  }

  size() {
    return this.length
  }

  head() {
    return this.headNode?.data ?? null
  }

  tail() {
    return this.tailNode?.data ?? null
  }

  isEmpty() {
    return this.length === 0
  }

  addLast(element: T) {
    const node = new DoublyLinkedListNode(element)
    if (this.tailNode === null) {
      this.headNode = node
      this.tailNode = node
    } else {
      this.tailNode.next = node
      node.prev = this.tailNode
      this.tailNode = node
    }
    this.length++
    return this.size()
  }

  addFirst(element: T) {
    const node = new DoublyLinkedListNode(element)
    if (this.headNode === null) {
      this.headNode = node
      this.tailNode = node
    } else {
      node.next = this.headNode
      this.headNode.prev = node
      this.headNode = node
    }
    this.length++
    return this.size()
  }

  removeFirst() {
    if (this.headNode === null) {
      return null
    }
    const removedNode = this.headNode
    this.headNode = this.headNode.next
    if (this.headNode !== null) {
      this.headNode.prev = null
    } else {
      this.tailNode = null
    }
    this.length--
    return removedNode.data
  }

  removeLast() {
    if (this.tailNode === null) {
      return null
    }
    const removedNode = this.tailNode
    this.tailNode = this.tailNode.prev
    if (this.tailNode !== null) {
      this.tailNode.next = null
    } else {
      this.headNode = null
    }
    this.length--
    return removedNode.data
  }

  remove(element: T) {
    if (this.isEmpty()) return null
    let currentNode = this.headNode
    while (currentNode) {
      if (currentNode.data === element) {
        if (currentNode.prev) {
          currentNode.prev.next = currentNode.next
        } else {
          this.headNode = currentNode.next
        }
        if (currentNode.next) {
          currentNode.next.prev = currentNode.prev
        } else {
          this.tailNode = currentNode.prev
        }
        this.length--
        return currentNode.data
      }
      currentNode = currentNode.next
    }
    return null
  }

  indexOf(element: T) {
    if (this.isEmpty()) return -1
    let { currentNode, currentIndex } = this.initiateNodeAndIndex()
    while (currentNode) {
      if (currentNode.data === element) {
        return currentIndex
      }
      currentNode = currentNode.next
      currentIndex++
    }
    return -1
  }

  elementAt(index: number) {
    if (index >= this.length || index < 0) {
      throw new RangeError('Out of Range index')
    }
    let { currentIndex, currentNode } = this.initiateNodeAndIndex()
    while (currentIndex < index) {
      currentIndex++
      currentNode = currentNode!.next
    }
    return currentNode!.data
  }

  addAt(index: number, element: T) {
    if (index > this.length || index < 0) {
      throw new RangeError('Out of Range index')
    }
    if (index === 0) return this.addFirst(element)
    if (index === this.length) return this.addLast(element)
    let { currentIndex, currentNode } = this.initiateNodeAndIndex()
    const node = new DoublyLinkedListNode(element)

    while (currentIndex !== index - 1) {
      currentIndex++
      currentNode = currentNode!.next
    }

    node.next = currentNode!.next
    node.prev = currentNode
    if (currentNode!.next) {
      currentNode!.next.prev = node
    }
    currentNode!.next = node
    this.length++
    return this.size()
  }

  removeAt(index: number) {
    if (index < 0 || index >= this.length) {
      throw new RangeError('Out of Range index')
    }
    if (index === 0) return this.removeFirst()
    if (index === this.length - 1) return this.removeLast()
    let { currentIndex, currentNode } = this.initiateNodeAndIndex()
    while (currentIndex !== index - 1) {
      currentIndex++
      currentNode = currentNode!.next
    }
    const removedNode = currentNode!.next
    currentNode!.next = removedNode!.next
    if (removedNode!.next) {
      removedNode!.next.prev = currentNode
    }
    this.length--
    return removedNode!.data
  }

  findMiddle() {
    let fast = this.headNode
    let slow = this.headNode

    while (fast !== null && fast.next !== null) {
      fast = fast.next.next
      slow = slow?.next ?? null
    }
    return slow
  }

  clean() {
    this.headNode = null
    this.tailNode = null
    this.length = 0
  }

  get() {
    const list: T[] = []
    let { currentNode } = this.initiateNodeAndIndex()
    while (currentNode) {
      list.push(currentNode.data)
      currentNode = currentNode.next
    }
    return list
  }

  rotateListRight(k: number) {
    if (!this.headNode) return
    let current = this.headNode
    let tail = this.tailNode
    let count = 1
    while (current.next) {
      count++
      current = current.next
    }
    current.next = this.headNode
    tail = current
    k %= count
    while (count - k > 0) {
      tail = tail!.next!
      count--
    }
    this.headNode = tail.next
    tail.next = null
    this.headNode!.prev = null
  }

  *iterator() {
    let { currentNode } = this.initiateNodeAndIndex()
    while (currentNode) {
      yield currentNode.data
      currentNode = currentNode.next
    }
  }

  log() {
    const result = []
    let currentNode = this.headNode
    while (currentNode) {
      result.push(currentNode.data)
      currentNode = currentNode.next
    }
    console.log(JSON.stringify(result, null, 2))
  }

  reverse() {
    let current = this.headNode
    let temp: DoublyLinkedListNode<T> | null = null
    while (current) {
      temp = current.prev
      current.prev = current.next
      current.next = temp
      current = current.prev
    }
    if (temp) {
      this.headNode = temp.prev!
    }
  }
}

export { DoublyLinkedListNode, DoublyLinkedList }
