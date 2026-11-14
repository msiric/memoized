import type { PointerProgram } from '../program'

/**
 * In-Place Reversal of a Linked List
 * (dsa-track/common-techniques/linked-list-reversal, PREMIUM): "Reversing a
 * Part of the Linked List", the JavaScript tab verbatim (content repo
 * `fix/batch-2d-wording` at 273a771), after the `ListNode` class from the
 * same lesson's first example, which it uses. The reader sees the function;
 * the run is the whole example, so its printed output is the lesson's own
 * (1 4 3 2 5).
 */
export const reverseBetweenProgram: PointerProgram = {
  id: 'reverse-between',
  snippet: `class ListNode {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function reverseBetween(head, m, n) {
    if (m === n) return head;

    let current = head, previous = null;
    for (let i = 1; i < m; i++) {
        previous = current;
        current = current.next;
    }

    const connection = previous;
    const tail = current;

    let next = null;
    for (let i = 0; i < n - m + 1; i++) {
        next = current.next;
        current.next = previous;
        previous = current;
        current = next;
    }

    if (connection !== null) {
        connection.next = previous;
    } else {
        head = previous;
    }

    tail.next = current;

    return head;
}

// Example usage:
const head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);

const m = 2, n = 4;
const newHead = reverseBetween(head, m, n);
let current = newHead;
while (current !== null) {
    console.log(current.value);  // Output: 1 4 3 2 5
    current = current.next;
}`,
  lang: 'js',
  runtime: 'node@24.x',
  sha256: '6957db42d3e39bf719f70e0c92a467ada867a82554fae1599af4d64cccc94696',
  observed: ['1', '4', '3', '2', '5'],
  nodeClass: 'ListNode',
  valueField: 'value',
  classEnd: { text: '}', nth: 2 },
  shown: { first: { text: 'function reverseBetween(head, m, n) {' }, last: { text: '}', nth: 6 } },
  probes: [
    // The list as the example builds it, before the call: only `head` points into it.
    { id: 'start', after: { text: 'const m = 2, n = 4;' }, vars: ['head'] },
    { id: 'init', after: { text: 'let current = head, previous = null;' }, vars: ['head', 'previous', 'current'] },
    {
      id: 'walk',
      from: { text: 'previous = current;', nth: 1 },
      after: { text: 'current = current.next;', nth: 1 },
      vars: ['head', 'previous', 'current'],
    },
    {
      id: 'anchors',
      from: { text: 'const connection = previous;' },
      after: { text: 'const tail = current;' },
      vars: ['head', 'connection', 'tail', 'previous', 'current'],
    },
    { id: 'next-null', after: { text: 'let next = null;' }, vars: ['head', 'connection', 'tail', 'previous', 'current', 'next'] },
    {
      id: 'flip',
      from: { text: 'next = current.next;' },
      after: { text: 'current.next = previous;' },
      vars: ['head', 'connection', 'tail', 'previous', 'current', 'next'],
    },
    {
      id: 'advance',
      from: { text: 'previous = current;', nth: 2 },
      after: { text: 'current = next;' },
      vars: ['head', 'connection', 'tail', 'previous', 'current', 'next'],
    },
    { id: 'connect', after: { text: 'connection.next = previous;' }, vars: ['head', 'connection', 'tail', 'previous', 'current', 'next'] },
    { id: 'reattach', after: { text: 'tail.next = current;' }, vars: ['head', 'connection', 'tail', 'previous', 'current', 'next'] },
  ],
}

/**
 * "Reversing the Entire Linked List", the lesson's first example verbatim:
 * the class, the function and its example usage (5 4 3 2 1).
 */
export const reverseFullProgram: PointerProgram = {
  id: 'reverse-full',
  snippet: `class ListNode {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function reverseLinkedList(head) {
    let previous = null;
    let current = head;

    while (current !== null) {
        const next = current.next;  // Store the next node
        current.next = previous;    // Reverse the link
        previous = current;         // Move previous to the current node
        current = next;             // Move current to the next node
    }

    return previous;  // New head of the reversed list
}

// Example usage:
const head = new ListNode(1);
head.next = new ListNode(2);
head.next.next = new ListNode(3);
head.next.next.next = new ListNode(4);
head.next.next.next.next = new ListNode(5);

const reversedHead = reverseLinkedList(head);
let current = reversedHead;
while (current !== null) {
    console.log(current.value);  // Output: 5 4 3 2 1
    current = current.next;
}`,
  lang: 'js',
  runtime: 'node@24.x',
  sha256: 'cd32eb2b8617ccc824e92e2bfaa36e8e5b5358871e7ff21d2fa191931014af07',
  observed: ['5', '4', '3', '2', '1'],
  nodeClass: 'ListNode',
  valueField: 'value',
  classEnd: { text: '}', nth: 2 },
  shown: { first: { text: 'function reverseLinkedList(head) {' }, last: { text: '}', nth: 4 } },
  probes: [
    { id: 'start', after: { text: 'head.next.next.next.next = new ListNode(5);' }, vars: ['head'] },
    {
      id: 'init',
      from: { text: 'let previous = null;' },
      after: { text: 'let current = head;' },
      vars: ['previous', 'current'],
    },
    {
      id: 'iteration',
      from: { text: 'const next = current.next;  // Store the next node' },
      after: { text: 'current = next;             // Move current to the next node' },
      vars: ['previous', 'current', 'next'],
    },
  ],
}
