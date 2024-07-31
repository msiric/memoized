class ListNode<T> {
  data: T
  next: ListNode<T> | null

  constructor(data: T) {
    this.data = data
    this.next = null
  }
}

class Stack<T> {
  private head: ListNode<T> | null
  private length: number

  constructor(initialValues?: T[]) {
    this.head = null
    this.length = 0

    if (Array.isArray(initialValues)) {
      for (const value of initialValues) {
        this.push(value)
      }
    }
  }

  push(element: T): void {
    const newNode = new ListNode(element)
    newNode.next = this.head
    this.head = newNode
    this.length++
  }

  pop(): T {
    if (this.head === null) {
      throw new Error('Stack is empty')
    }
    const poppedNode = this.head
    this.head = this.head.next
    this.length--
    return poppedNode.data
  }

  peek(): T {
    if (this.head === null) {
      throw new Error('Stack is empty')
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

export { Stack }
