import type { PointerProgram } from '../program'

/**
 * Fast and Slow Pointers (dsa-track/common-techniques/fast-and-slow-pointers,
 * PREMIUM): "Finding the Start of a Cycle in a Linked List", the JavaScript
 * `detectCycle` verbatim (content repo `fix/batch-2d-wording` at 273a771),
 * after the lesson's `ListNode` class. The register's input replaces the
 * lesson's three-node example: 1 to 6 with 6 linking back to 3 (tail a = 2,
 * cycle c = 4), built and printed by the harness after the function.
 */
export const detectCycleProgram: PointerProgram = {
  id: 'detect-cycle',
  snippet: `class ListNode {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

function detectCycle(head) {
    let slow = head, fast = head;

    while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;

        if (slow === fast) {
            // Cycle detected, find the start of the cycle
            let pointer1 = head;
            let pointer2 = slow;

            while (pointer1 !== pointer2) {
                pointer1 = pointer1.next;
                pointer2 = pointer2.next;
            }

            return pointer1;  // Start of the cycle
        }
    }

    return null;  // No cycle
}

const nodes = [1, 2, 3, 4, 5, 6].map((v) => new ListNode(v));
nodes.forEach((node, i) => { node.next = nodes[i + 1] ?? nodes[2]; });
const head = nodes[0];
console.log(detectCycle(head).value);`,
  lang: 'js',
  runtime: 'node@24.x',
  sha256: '33e889aa9cbf3b902582c5e45411e0847304a021f4f5cb8d7c0d37d74b38fa49',
  observed: ['3'],
  nodeClass: 'ListNode',
  valueField: 'value',
  classEnd: { text: '}', nth: 2 },
  shown: { first: { text: 'function detectCycle(head) {' }, last: { text: '}', nth: 6 } },
  harness: 'The three lines after the function build 1 to 6 with 6 linking back to 3 and print the value detectCycle returns.',
  probes: [
    { id: 'start', after: { text: 'const head = nodes[0];' }, vars: ['head'] },
    { id: 'init', after: { text: 'let slow = head, fast = head;' }, vars: ['slow', 'fast'] },
    { id: 'stride', from: { text: 'slow = slow.next;' }, after: { text: 'fast = fast.next.next;' }, vars: ['slow', 'fast'] },
    {
      id: 'reset',
      from: { text: 'let pointer1 = head;' },
      after: { text: 'let pointer2 = slow;' },
      vars: ['slow', 'fast', 'pointer1', 'pointer2'],
    },
    {
      id: 'walk',
      from: { text: 'pointer1 = pointer1.next;' },
      after: { text: 'pointer2 = pointer2.next;' },
      vars: ['slow', 'fast', 'pointer1', 'pointer2'],
    },
  ],
}
