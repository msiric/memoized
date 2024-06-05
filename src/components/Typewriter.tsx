'use client'

import { useEffect, useState } from 'react'
import { getHighlighter, Highlighter } from 'shiki'
import { ShikiMagicMove } from 'shiki-magic-move/react'

import 'shiki-magic-move/dist/style.css'

const codeSnippets = [
  `function mergeIntervals(intervals) {
    if (!intervals.length) return intervals;
    intervals.sort((a, b) => a[0] - b[0]);
    let result = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        let prev = result[result.length - 1];
        let curr = intervals[i];
        if (prev[1] >= curr[0]) {
            prev[1] = Math.max(prev[1], curr[1]);
        } else {
            result.push(curr);
        }
    }
    return result;
}`,
  `function binarySearch(arr, target) {
    let left = 0, right = arr.length - 1;
    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (arr[mid] === target) {
            return mid;
        }
        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}`,
  `function quickSort(arr) {
    if (arr.length <= 1) return arr;
    let pivot = arr[arr.length - 1];
    let left = [];
    let right = [];
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] < pivot) {
            left.push(arr[i]);
        }
        else {
            right.push(arr[i]);
        }
    }
    return [...quickSort(left), pivot, ...quickSort(right)];
}`,
  `function maxSubarraySum(arr, k) {
    if (arr.length < k) {
        return null;
    }
    let maxSum = 0;
    for (let i = 0; i < k; i++) {
        maxSum += arr[i];
    }
    let currentSum = maxSum;
    for (let i = k; i < arr.length; i++) {
        currentSum += arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, currentSum);
    }
    return maxSum;
}`,
  `function activitySelection(activities) {
    activities.sort((a, b) => {
        return a[1] - b[1]
    });
    let lastEndTime = 0;
    const selected = [];
    for (let activity of activities) {
        const [start, end] = activity;
        if (start >= lastEndTime) {
            selected.push([start, end]);
            lastEndTime = end;
        }
    }
    return selected;
}`,
  `function pairWithTargetSum(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    while (left < right) {
        const sum = arr[left] + arr[right];
        if (sum === target) return [left, right];
        if (sum < target) {
            left++;
        }
        else {
            right--;
        }
    }
    return [];
}`,
  `function areAnagrams(s1, s2) {
    if (s1.length !== s2.length) {
        return false;
    }
    const count = {};
    for (let char of s1) {
        const val = count[char] || 0;
        count[char] = val + 1;
    }
    for (let char of s2) {
        if (!count[char]) return false;
        count[char]--;
    }
    return true;
}`,
  `function validParantheses(s) {
    const stack = [];
    const pairs = { '(': ')', '{': '}', '[': ']' };
    for (let char of s) {
        if (pairs[char]) {
            stack.push(char);
        } else {
            const match = stack.pop();
            if (char !== pairs[match]) {
                return false;
            }
        }
    }
    return stack.length === 0;
}`,
]

export const AnimatedCode = () => {
  const [code, setCode] = useState(codeSnippets[0])
  const [highlighter, setHighlighter] = useState<Highlighter>()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    async function initializeHighlighter() {
      const highlighter = await getHighlighter({
        themes: ['nord'],
        langs: ['javascript', 'typescript'],
      })
      setHighlighter(highlighter)
    }
    initializeHighlighter()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % codeSnippets.length)
      setCode(codeSnippets[(index + 1) % codeSnippets.length])
    }, 5000) // Change every 5 seconds

    return () => clearInterval(interval)
  }, [index])

  return (
    <div className="w-full">
      {highlighter && (
        <>
          <ShikiMagicMove
            lang="ts"
            theme="nord"
            highlighter={highlighter}
            code={code}
            options={{ duration: 800, stagger: 0.3, lineNumbers: true }}
          />
        </>
      )}
    </div>
  )
}
