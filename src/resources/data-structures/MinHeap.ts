class MinHeap<T> {
  private heap: T[]

  constructor() {
    this.heap = []
  }

  private getLeftChildIndex(parentIndex: number): number {
    return 2 * parentIndex + 1
  }

  private getRightChildIndex(parentIndex: number): number {
    return 2 * parentIndex + 2
  }

  private getParentIndex(childIndex: number): number {
    return Math.floor((childIndex - 1) / 2)
  }

  private hasLeftChild(index: number): boolean {
    return this.getLeftChildIndex(index) < this.heap.length
  }

  private hasRightChild(index: number): boolean {
    return this.getRightChildIndex(index) < this.heap.length
  }

  private hasParent(index: number): boolean {
    return this.getParentIndex(index) >= 0
  }

  private leftChild(index: number): T {
    return this.heap[this.getLeftChildIndex(index)]
  }

  private rightChild(index: number): T {
    return this.heap[this.getRightChildIndex(index)]
  }

  private parent(index: number): T {
    return this.heap[this.getParentIndex(index)]
  }

  private swap(indexOne: number, indexTwo: number): void {
    ;[this.heap[indexOne], this.heap[indexTwo]] = [
      this.heap[indexTwo],
      this.heap[indexOne],
    ]
  }

  public peek(): T | null {
    if (this.heap.length === 0) {
      return null
    }
    return this.heap[0]
  }

  public extractMin(): T | null {
    if (this.heap.length === 0) {
      return null
    }
    if (this.heap.length === 1) {
      return this.heap.pop()!
    }

    const root = this.heap[0]
    this.heap[0] = this.heap.pop()!
    this.heapifyDown()
    return root
  }

  public insert(element: T): void {
    this.heap.push(element)
    this.heapifyUp()
  }

  private heapifyUp(): void {
    let index = this.heap.length - 1

    while (this.hasParent(index) && this.parent(index) > this.heap[index]) {
      this.swap(this.getParentIndex(index), index)
      index = this.getParentIndex(index)
    }
  }

  private heapifyDown(): void {
    let index = 0

    while (this.hasLeftChild(index)) {
      let smallerChildIndex = this.getLeftChildIndex(index)

      if (
        this.hasRightChild(index) &&
        this.rightChild(index) < this.leftChild(index)
      ) {
        smallerChildIndex = this.getRightChildIndex(index)
      }

      if (this.heap[index] < this.heap[smallerChildIndex]) {
        break
      } else {
        this.swap(index, smallerChildIndex)
      }

      index = smallerChildIndex
    }
  }

  private heapifyDownFrom(index: number): void {
    while (this.hasLeftChild(index)) {
      let smallerChildIndex = this.getLeftChildIndex(index)
      if (
        this.hasRightChild(index) &&
        this.rightChild(index) < this.leftChild(index)
      ) {
        smallerChildIndex = this.getRightChildIndex(index)
      }
      if (this.heap[index] < this.heap[smallerChildIndex]) break
      this.swap(index, smallerChildIndex)
      index = smallerChildIndex
    }
  }

  private heapifyUpFrom(index: number): void {
    while (this.hasParent(index) && this.parent(index) > this.heap[index]) {
      this.swap(this.getParentIndex(index), index)
      index = this.getParentIndex(index)
    }
  }

  public size(): number {
    return this.heap.length
  }

  public isEmpty(): boolean {
    return this.heap.length === 0
  }

  public clear(): void {
    this.heap = []
  }

  public log(): void {
    console.log(this.heap)
  }

  public contains(element: T): boolean {
    return this.heap.includes(element)
  }

  public heapify(array: T[]): void {
    this.heap = array
    for (let i = Math.floor(this.heap.length / 2 - 1); i >= 0; i--) {
      this.heapifyDownFrom(i)
    }
  }

  public updateKey(oldKey: T, newKey: T): void {
    const index = this.heap.indexOf(oldKey)
    if (index === -1) return

    this.heap[index] = newKey
    if (newKey < oldKey) {
      this.heapifyUpFrom(index)
    } else {
      this.heapifyDownFrom(index)
    }
  }

  public remove(element: T): boolean {
    const index = this.heap.indexOf(element)
    if (index === -1) return false

    if (index === this.heap.length - 1) {
      this.heap.pop()
    } else {
      this.heap[index] = this.heap.pop()!
      this.heapifyDownFrom(index)
      this.heapifyUpFrom(index)
    }
    return true
  }
}

export { MinHeap }
