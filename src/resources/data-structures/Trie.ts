class TrieNode {
  key: string | null
  count: number
  children: Record<string, TrieNode>
  parent: TrieNode | null

  constructor(key: string | null, parent: TrieNode | null) {
    this.key = key
    this.count = 0
    this.children = Object.create(null)
    this.parent = parent || null
  }
}

class Trie {
  root: TrieNode

  constructor() {
    this.root = new TrieNode(null, null)
  }

  // Recursively finds the occurrence of all words in a given node
  static findAllWords(
    root: TrieNode,
    word: string,
    output: Array<{ word: string; count: number }>,
  ) {
    if (root === null) return
    if (root.count > 0) {
      output.push({ word, count: root.count })
    }
    for (const key in root.children) {
      Trie.findAllWords(root.children[key], word + key, output)
    }
  }

  insert(word: string) {
    if (typeof word !== 'string') return
    if (word === '') {
      this.root.count += 1
      return
    }
    let node = this.root
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode(char, node)
      }
      node = node.children[char]
    }
    node.count += 1
  }

  findPrefix(prefix: string): TrieNode | null {
    if (typeof prefix !== 'string') return null
    let node = this.root
    for (const char of prefix) {
      if (!node.children[char]) return null
      node = node.children[char]
    }
    return node
  }

  remove(word: string, count: number = 1) {
    if (typeof word !== 'string' || count <= 0) return
    if (word === '') {
      this.root.count = Math.max(0, this.root.count - count)
      return
    }
    let node = this.root
    for (const char of word) {
      if (!node.children[char]) return
      node = node.children[char]
    }
    node.count = Math.max(0, node.count - count)
    if (node.count === 0 && Object.keys(node.children).length === 0) {
      let parent = node.parent
      while (parent) {
        delete parent.children[node.key!]
        if (Object.keys(parent.children).length > 0 || parent.count > 0) break
        node = parent
        parent = parent.parent
      }
    }
  }

  findAllWords(prefix: string): Array<{ word: string; count: number }> {
    const output: Array<{ word: string; count: number }> = []
    const node = this.findPrefix(prefix)
    if (node === null) return output
    Trie.findAllWords(node, prefix, output)
    return output
  }

  contains(word: string): boolean {
    const node = this.findPrefix(word)
    return node !== null && node.count > 0
  }

  findOccurrences(word: string): number {
    const node = this.findPrefix(word)
    return node ? node.count : 0
  }
}

export { Trie }
