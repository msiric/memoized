class HashMapNode<K, V> {
  key: K
  value: V
  next: HashMapNode<K, V> | null

  constructor(key: K, value: V) {
    this.key = key
    this.value = value
    this.next = null
  }
}

class HashMap<K extends string | number | symbol, V> {
  private buckets: Array<HashMapNode<K, V> | null>
  private size: number
  private capacity: number
  private loadFactor: number

  constructor(capacity: number = 16, loadFactor: number = 0.75) {
    this.capacity = capacity
    this.buckets = new Array<HashMapNode<K, V> | null>(capacity).fill(null)
    this.size = 0
    this.loadFactor = loadFactor
  }

  private hash(key: K): number {
    let hash = 0
    const keyString = key.toString()
    for (let i = 0; i < keyString.length; i++) {
      hash = (hash << 5) - hash + keyString.charCodeAt(i)
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash) % this.capacity
  }

  private resize() {
    const newCapacity = this.capacity * 2
    const newBuckets: Array<HashMapNode<K, V> | null> = new Array(
      newCapacity,
    ).fill(null)
    this.buckets.forEach((node) => {
      while (node) {
        const newIndex = this.hash(node.key) % newCapacity
        const newNode = new HashMapNode(node.key, node.value)
        newNode.next = newBuckets[newIndex]
        newBuckets[newIndex] = newNode
        node = node.next
      }
    })
    this.buckets = newBuckets
    this.capacity = newCapacity
  }

  put(key: K, value: V): void {
    if (this.size / this.capacity >= this.loadFactor) {
      this.resize()
    }
    const index = this.hash(key)
    let node = this.buckets[index]
    if (!node) {
      this.buckets[index] = new HashMapNode(key, value)
    } else {
      while (node) {
        if (node.key === key) {
          node.value = value
          return
        }
        if (!node.next) {
          node.next = new HashMapNode(key, value)
          break
        }
        node = node.next
      }
    }
    this.size++
  }

  get(key: K): V | null {
    const index = this.hash(key)
    let node = this.buckets[index]
    while (node) {
      if (node.key === key) {
        return node.value
      }
      node = node.next
    }
    return null
  }

  remove(key: K): V | null {
    const index = this.hash(key)
    let node = this.buckets[index]
    let prevNode: HashMapNode<K, V> | null = null

    while (node) {
      if (node.key === key) {
        if (prevNode) {
          prevNode.next = node.next
        } else {
          this.buckets[index] = node.next
        }
        this.size--
        return node.value
      }
      prevNode = node
      node = node.next
    }
    return null
  }

  containsKey(key: K): boolean {
    return this.get(key) !== null
  }

  keys(): K[] {
    const keysArray: K[] = []
    for (let i = 0; i < this.capacity; i++) {
      let node = this.buckets[i]
      while (node) {
        keysArray.push(node.key)
        node = node.next
      }
    }
    return keysArray
  }

  values(): V[] {
    const valuesArray: V[] = []
    for (let i = 0; i < this.capacity; i++) {
      let node = this.buckets[i]
      while (node) {
        valuesArray.push(node.value)
        node = node.next
      }
    }
    return valuesArray
  }

  getSize(): number {
    return this.size
  }

  clear(): void {
    this.buckets.fill(null)
    this.size = 0
  }

  log(): void {
    console.log(this.buckets)
  }

  *iterator() {
    for (let i = 0; i < this.capacity; i++) {
      let node = this.buckets[i]
      while (node) {
        yield { key: node.key, value: node.value }
        node = node.next
      }
    }
  }

  [Symbol.iterator]() {
    return this.iterator()
  }
}

export { HashMap }
