import type { PointerProgram, Probe } from '../program'

/**
 * Linked Lists (dsa-track/user-defined-data-structures/linked-lists,
 * PREMIUM): the answer to the practice question palindrome-linked-list,
 * verbatim (content repo `fix/batch-2d-wording` at 273a771), run as
 * TypeScript (Node 24 strips the types). The answer declares `ListNode`
 * only in a comment, so the harness uses that declaration, uncommented, and
 * after the answer builds one input list and prints the result; the reader
 * sees the function alone.
 */
const HARNESS = 'The ListNode class (the answer\'s own comment, uncommented) and the three lines after the function build the input and print the result.'

const ALL = ['head', 'slow', 'fast', 'cur', 'prev'] as const

const PROBES: readonly Probe[] = [
  { id: 'start', after: { text: 'const head = nodes[0];' }, vars: ['head'] },
  {
    id: 'init',
    from: { text: 'let slow: ListNode = head,' },
    after: { text: 'fast: ListNode = head.next;' },
    vars: ['head', 'slow', 'fast'],
  },
  {
    id: 'stride',
    from: { text: 'slow = slow.next;' },
    after: { text: 'fast = fast.next.next;' },
    vars: ['head', 'slow', 'fast'],
  },
  {
    id: 'cut',
    from: { text: 'let cur: ListNode = slow.next;' },
    after: { text: 'slow.next = null;' },
    vars: ['head', 'slow', 'fast', 'cur'],
  },
  { id: 'prev-null', after: { text: 'let prev: ListNode = null;' }, vars: ALL },
  {
    id: 'flip',
    from: { text: 'let t: ListNode = cur.next;' },
    after: { text: 'cur.next = prev;' },
    vars: [...ALL, 't'],
  },
  { id: 'advance', from: { text: 'prev = cur;' }, after: { text: 'cur = t;' }, vars: [...ALL, 't'] },
  {
    id: 'compare',
    from: { text: 'if (prev.val != head.val) return false;' },
    after: { text: 'head = head.next;' },
    vars: ALL,
  },
]

/** 1, 2, 3, 2, 1: odd length, a palindrome. */
export const palindromeOddProgram: PointerProgram = {
  id: 'palindrome-12321',
  snippet: `class ListNode {
    val: number
    next: ListNode | null
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val)
        this.next = (next===undefined ? null : next)
    }
}

function isPalindrome(head: ListNode | null): boolean {
    let slow: ListNode = head,
        fast: ListNode = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    let cur: ListNode = slow.next;
    slow.next = null;
    let prev: ListNode = null;
    while (cur != null) {
        let t: ListNode = cur.next;
        cur.next = prev;
        prev = cur;
        cur = t;
    }
    while (prev != null) {
        if (prev.val != head.val) return false;
        prev = prev.next;
        head = head.next;
    }
    return true;
}

const nodes = [1, 2, 3, 2, 1].map((v) => new ListNode(v));
nodes.forEach((node, i) => { node.next = nodes[i + 1] ?? null; });
const head = nodes[0];
console.log(isPalindrome(head));`,
  lang: 'ts',
  runtime: 'node@24.x',
  sha256: '70f771a44c909d331e392a3463a8cc7aed0f3ad7668e5f3c466d40b9cb42d053',
  observed: ['true'],
  nodeClass: 'ListNode',
  valueField: 'val',
  classEnd: { text: '}', nth: 2 },
  shown: { first: { text: 'function isPalindrome(head: ListNode | null): boolean {' }, last: { text: '}', nth: 6 } },
  harness: HARNESS,
  probes: PROBES,
}

/** 1, 2, 2, 1: even length, a palindrome. */
export const palindromeEvenProgram: PointerProgram = {
  id: 'palindrome-1221',
  snippet: `class ListNode {
    val: number
    next: ListNode | null
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val)
        this.next = (next===undefined ? null : next)
    }
}

function isPalindrome(head: ListNode | null): boolean {
    let slow: ListNode = head,
        fast: ListNode = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    let cur: ListNode = slow.next;
    slow.next = null;
    let prev: ListNode = null;
    while (cur != null) {
        let t: ListNode = cur.next;
        cur.next = prev;
        prev = cur;
        cur = t;
    }
    while (prev != null) {
        if (prev.val != head.val) return false;
        prev = prev.next;
        head = head.next;
    }
    return true;
}

const nodes = [1, 2, 2, 1].map((v) => new ListNode(v));
nodes.forEach((node, i) => { node.next = nodes[i + 1] ?? null; });
const head = nodes[0];
console.log(isPalindrome(head));`,
  lang: 'ts',
  runtime: 'node@24.x',
  sha256: 'c5e29a88d26df6b63a609bffc207b3eccd37046d7e7b6488ab6a37da7cd6044e',
  observed: ['true'],
  nodeClass: 'ListNode',
  valueField: 'val',
  classEnd: { text: '}', nth: 2 },
  shown: { first: { text: 'function isPalindrome(head: ListNode | null): boolean {' }, last: { text: '}', nth: 6 } },
  harness: HARNESS,
  probes: PROBES,
}

/** 1, 2, 3, 1: not a palindrome. */
export const palindromeFalseProgram: PointerProgram = {
  id: 'palindrome-1231',
  snippet: `class ListNode {
    val: number
    next: ListNode | null
    constructor(val?: number, next?: ListNode | null) {
        this.val = (val===undefined ? 0 : val)
        this.next = (next===undefined ? null : next)
    }
}

function isPalindrome(head: ListNode | null): boolean {
    let slow: ListNode = head,
        fast: ListNode = head.next;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    let cur: ListNode = slow.next;
    slow.next = null;
    let prev: ListNode = null;
    while (cur != null) {
        let t: ListNode = cur.next;
        cur.next = prev;
        prev = cur;
        cur = t;
    }
    while (prev != null) {
        if (prev.val != head.val) return false;
        prev = prev.next;
        head = head.next;
    }
    return true;
}

const nodes = [1, 2, 3, 1].map((v) => new ListNode(v));
nodes.forEach((node, i) => { node.next = nodes[i + 1] ?? null; });
const head = nodes[0];
console.log(isPalindrome(head));`,
  lang: 'ts',
  runtime: 'node@24.x',
  sha256: 'c01063c8b7280017721377dd4e0a77c80898fc6b523f7cd4d084080a94b78d36',
  observed: ['false'],
  nodeClass: 'ListNode',
  valueField: 'val',
  classEnd: { text: '}', nth: 2 },
  shown: { first: { text: 'function isPalindrome(head: ListNode | null): boolean {' }, last: { text: '}', nth: 6 } },
  harness: HARNESS,
  probes: PROBES,
}
