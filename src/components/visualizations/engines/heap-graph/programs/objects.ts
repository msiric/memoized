import type { HeapProgram } from '../model'

/**
 * JavaScript Objects (dsa-track/built-in-data-structures/objects, FREE): the
 * lesson's shallow-copy gotcha, its nested-update tip and its deep-clone
 * algorithm, verbatim from the content repo (`fix/batch-2d-wording` at
 * 273a771; the JavaScript tab of each CodeGroup, list indentation removed).
 */

const RUNTIME = 'node@24.x'

/** Common Gotchas, "Shallow Copy vs. Deep Copy". */
export const shallowProgram: HeapProgram = {
  id: 'shallow',
  snippet: `let original = {a: 1, b: {c: 2}};
let copy = {...original};
copy.b.c = 3;
console.log(original.b.c);  // Output: 3 (original object is affected)`,
  runtime: RUNTIME,
  sha256: '87a8cce907be037a562fa6fb05b0c4b29c4f494cc230eed7ae56274a2c7090fa',
  observed: ['3'],
  snapshots: [{ id: 'shallow', after: 'end', bindings: ['original', 'copy'], results: ['original.b.c'] }],
}

/** Practical Tips, "Nested Object Updates". */
export const nestedProgram: HeapProgram = {
  id: 'nested',
  snippet: `let person = {
    name: 'John',
    address: {
        city: 'Anytown',
        zip: '12345'
    }
};
let updatedPerson = {
    ...person,
    address: {
        ...person.address,
        city: 'Newtown'
    }
};
console.log(updatedPerson);
// Output: {name: 'John', address: {city: 'Newtown', zip: '12345'}}`,
  runtime: RUNTIME,
  sha256: 'b324de6f55638023025e2fea2e054e26e1d74ca47512278b08cdf4d4d98f3090',
  observed: ["{ name: 'John', address: { city: 'Newtown', zip: '12345' } }"],
  snapshots: [{ id: 'nested', after: 'end', bindings: ['person', 'updatedPerson'] }],
}

/** Object Algorithms, "Deep Cloning". */
export const deepProgram: HeapProgram = {
  id: 'deep',
  snippet: `function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item));
    }
    let clone = {};
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            clone[key] = deepClone(obj[key]);
        }
    }
    return clone;
}

let original = {a: 1, b: {c: 2}};
let copy = deepClone(original);
copy.b.c = 3;
console.log(original.b.c);  // Output: 2 (original object is not affected)`,
  runtime: RUNTIME,
  sha256: 'b05d5e369f9940c258bf818b68bc146c6d59a98d99499b51f785ee8e7c40a38e',
  observed: ['2'],
  snapshots: [{ id: 'deep', after: 'end', bindings: ['original', 'copy'], results: ['original.b.c'] }],
}

export const objectsPrograms = [shallowProgram, nestedProgram, deepProgram]
