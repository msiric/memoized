class ListNode<T> {
  data: T
  next: ListNode<T> | null

  constructor(data: T) {
    this.data = data
    this.next = null
  }
}

class Queue<T> {
  private head: ListNode<T> | null
  private tail: ListNode<T> | null
  private length: number

  constructor(initialValues?: T[]) {
    this.head = null
    this.tail = null
    this.length = 0

    if (Array.isArray(initialValues)) {
      for (const value of initialValues) {
        this.enqueue(value)
      }
    }
  }

  enqueue(element: T): void {
    const newNode = new ListNode(element)
    if (this.tail) {
      this.tail.next = newNode
    } else {
      this.head = newNode
    }
    this.tail = newNode
    this.length++
  }

  dequeue(): T {
    if (this.head === null) {
      throw new Error('Queue is empty')
    }
    const dequeuedNode = this.head
    this.head = this.head.next
    if (this.head === null) {
      this.tail = null
    }
    this.length--
    return dequeuedNode.data
  }

  peek(): T {
    if (this.head === null) {
      throw new Error('Queue is empty')
    }
    return this.head.data
  }

  isEmpty(): boolean {
    return this.length === 0
  }

  size(): number {
    return this.length
  }

  clear(): void {
    this.head = null
    this.tail = null
    this.length = 0
  }

  log(): void {
    const elements: T[] = []
    let currentNode = this.head
    while (currentNode) {
      elements.push(currentNode.data)
      currentNode = currentNode.next
    }
    console.log(elements)
  }

  *iterator() {
    let currentNode = this.head
    while (currentNode) {
      yield currentNode.data
      currentNode = currentNode.next
    }
  }

  [Symbol.iterator]() {
    return this.iterator()
  }
}

export { Queue }
