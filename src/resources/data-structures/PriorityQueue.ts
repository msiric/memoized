class PriorityQueue<T> {
  private heap: { element: T; priority: number; order: number }[]
  private orderCounter: number

  constructor() {
    this.heap = []
    this.orderCounter = 0
  }

  private getParentIndex(index: number): number {
    return Math.floor((index - 1) / 2)
  }

  private getLeftChildIndex(index: number): number {
    return 2 * index + 1
  }

  private getRightChildIndex(index: number): number {
    return 2 * index + 2
  }

  private swap(index1: number, index2: number) {
    ;[this.heap[index1], this.heap[index2]] = [
      this.heap[index2],
      this.heap[index1],
    ]
  }

  private bubbleUp(index: number) {
    let currentIndex = index
    while (currentIndex > 0) {
      const parentIndex = this.getParentIndex(currentIndex)
      if (
        this.heap[currentIndex].priority < this.heap[parentIndex].priority ||
        (this.heap[currentIndex].priority === this.heap[parentIndex].priority &&
          this.heap[currentIndex].order < this.heap[parentIndex].order)
      ) {
        this.swap(currentIndex, parentIndex)
        currentIndex = parentIndex
      } else {
        break
      }
    }
  }

  private bubbleDown(index: number) {
    let currentIndex = index
    const length = this.heap.length
    while (true) {
      const leftChildIndex = this.getLeftChildIndex(currentIndex)
      const rightChildIndex = this.getRightChildIndex(currentIndex)
      let smallest = currentIndex

      if (
        leftChildIndex < length &&
        (this.heap[leftChildIndex].priority < this.heap[smallest].priority ||
          (this.heap[leftChildIndex].priority ===
            this.heap[smallest].priority &&
            this.heap[leftChildIndex].order < this.heap[smallest].order))
      ) {
        smallest = leftChildIndex
      }

      if (
        rightChildIndex < length &&
        (this.heap[rightChildIndex].priority < this.heap[smallest].priority ||
          (this.heap[rightChildIndex].priority ===
            this.heap[smallest].priority &&
            this.heap[rightChildIndex].order < this.heap[smallest].order))
      ) {
        smallest = rightChildIndex
      }

      if (smallest !== currentIndex) {
        this.swap(currentIndex, smallest)
        currentIndex = smallest
      } else {
        break
      }
    }
  }

  enqueue(element: T, priority: number) {
    const node = { element, priority, order: this.orderCounter++ }
    this.heap.push(node)
    this.bubbleUp(this.heap.length - 1)
  }

  dequeue(): T {
    if (this.isEmpty()) {
      throw new Error('PriorityQueue is empty')
    }
    if (this.heap.length === 1) {
      return this.heap.pop()!.element
    }
    const root = this.heap[0]
    this.heap[0] = this.heap.pop()!
    this.bubbleDown(0)
    return root.element
  }

  peek(): T {
    if (this.isEmpty()) {
      throw new Error('PriorityQueue is empty')
    }
    return this.heap[0].element
  }

  size(): number {
    return this.heap.length
  }

  isEmpty(): boolean {
    return this.heap.length === 0
  }

  clear(): void {
    this.heap = []
    this.orderCounter = 0
  }

  *iterator() {
    const sortedHeap = [...this.heap].sort(
      (a, b) => a.priority - b.priority || a.order - b.order,
    )
    for (const { element } of sortedHeap) {
      yield element
    }
  }

  [Symbol.iterator]() {
    return this.iterator()
  }
}

export { PriorityQueue }
