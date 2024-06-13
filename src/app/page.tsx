import { AnimatedCode } from '@/components/AnimatedCode'
import { Logo } from '@/components/Logo'
import { OverlayedImage } from '@/components/OverlayedImage'
import { Tabs } from '@/components/Tabs'
import { completeCurriculum } from '@/constants/curriculum'
import { DS_ICONS, SECTION_ICONS } from '@/constants/icons'
import { BsNvidia } from 'react-icons/bs'
import {
  FaAirbnb,
  FaAmazon,
  FaApple,
  FaGoogle,
  FaMicrosoft,
  FaTiktok,
  FaTwitter,
} from 'react-icons/fa'
import { FaMeta } from 'react-icons/fa6'
import { SiNetflix, SiTesla, SiUber } from 'react-icons/si'
import { codeToHtml } from 'shiki-v1'

const TEST_TABS = [
  {
    label: 'Profile',
    content: (
      <div>
        <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
          Profile Tab
        </h3>
        <p className="mb-2">
          This is some placeholder content the Profile tab associated content,
          clicking another tab will toggle the visibility of this one for the
          next.
        </p>
        <p>
          The tab JavaScript swaps classes to control the content visibility and
          styling.
        </p>
      </div>
    ),
    icon: (
      <svg
        className="me-2 h-4 w-4 text-white"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
      </svg>
    ),
  },
  {
    label: 'Dashboard',
    content: <div>Dashboard Content</div>,
    icon: (
      <svg
        className="me-2 h-4 w-4 text-gray-500 dark:text-gray-400"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 18 18"
      >
        <path d="M6.143 0H1.857A1.857 1.857 0 0 0 0 1.857v4.286C0 7.169.831 8 1.857 8h4.286A1.857 1.857 0 0 0 8 6.143V1.857A1.857 1.857 0 0 0 6.143 0Zm10 0h-4.286A1.857 1.857 0 0 0 10 1.857v4.286C10 7.169 10.831 8 11.857 8h4.286A1.857 1.857 0 0 0 18 6.143V1.857A1.857 1.857 0 0 0 16.143 0Zm-10 10H1.857A1.857 1.857 0 0 0 0 11.857v4.286C0 17.169.831 18 1.857 18h4.286A1.857 1.857 0 0 0 8 16.143v-4.286A1.857 1.857 0 0 0 6.143 10Zm10 0h-4.286A1.857 1.857 0 0 0 10 11.857v4.286c0 1.026.831 1.857 1.857 1.857h4.286A1.857 1.857 0 0 0 18 16.143v-4.286A1.857 1.857 0 0 0 16.143 10Z" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    content: <div>Settings Content</div>,
    icon: (
      <svg
        className="me-2 h-4 w-4 text-gray-500 dark:text-gray-400"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M18 7.5h-.423l-.452-1.09.3-.3a1.5 1.5 0 0 0 0-2.121L16.01 2.575a1.5 1.5 0 0 0-2.121 0l-.3.3-1.089-.452V2A1.5 1.5 0 0 0 11 .5H9A1.5 1.5 0 0 0 7.5 2v.423l-1.09.452-.3-.3a1.5 1.5 0 0 0-2.121 0L2.576 3.99a1.5 1.5 0 0 0 0 2.121l.3.3L2.423 7.5H2A1.5 1.5 0 0 0 .5 9v2A1.5 1.5 0 0 0 2 12.5h.423l.452 1.09-.3.3a1.5 1.5 0 0 0 0 2.121l1.415 1.413a1.5 1.5 0 0 0 2.121 0l.3-.3 1.09.452V18A1.5 1.5 0 0 0 9 19.5h2a1.5 1.5 0 0 0 1.5-1.5v-.423l1.09-.452.3.3a1.5 1.5 0 0 0 2.121 0l1.415-1.414a1.5 1.5 0 0 0 0-2.121l-.3-.3.452-1.09H18a1.5 1.5 0 0 0 1.5-1.5V9A1.5 1.5 0 0 0 18 7.5Zm-8 6a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
      </svg>
    ),
  },
  {
    label: 'Contact',
    content: <div>Contact Content</div>,
    icon: (
      <svg
        className="me-2 h-4 w-4 text-gray-500 dark:text-gray-400"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M7.824 5.937a1 1 0 0 0 .726-.312 2.042 2.042 0 0 1 2.835-.065 1 1 0 0 0 1.388-1.441 3.994 3.994 0 0 0-5.674.13 1 1 0 0 0 .725 1.688Z" />
        <path d="M17 7A7 7 0 1 0 3 7a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1a1 1 0 0 0 1-1V7a5 5 0 1 1 10 0v7.083A2.92 2.92 0 0 1 12.083 17H12a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a1.993 1.993 0 0 0 1.722-1h.361a4.92 4.92 0 0 0 4.824-4H17a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3Z" />
      </svg>
    ),
  },
  {
    label: 'Disabled',
    content: <div>Disabled Content</div>,
    icon: (
      <svg
        className="me-2 h-4 w-4 text-gray-400 dark:text-gray-500"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z" />
      </svg>
    ),
    disabled: true,
  },
]

const EXTENSION = 'ts'

const codeSnippets = [
  {
    code: `function mergeIntervals(intervals) {
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
    tab: `merge-intervals.${EXTENSION}`,
  },
  {
    code: `function binarySearch(arr, target) {
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
    tab: `binary-search.${EXTENSION}`,
  },
  {
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  let pivot = arr[arr.length - 1];
  let left = [], right = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    }
    else {
      right.push(arr[i]);
    }
  }
  return [...quickSort(left), 
    pivot, ...quickSort(right)];
}`,
    tab: `quick-sort.${EXTENSION}`,
  },
  {
    code: `function maxSubarraySum(arr, k) {
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
    tab: `max-subarray-sum.${EXTENSION}`,
  },
  {
    code: `function activitySelection(activities) {
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
    tab: `activity-selection.${EXTENSION}`,
  },
  {
    code: `function pairWithTargetSum(arr, target) {
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
    tab: `pair-with-target-sum.${EXTENSION}`,
  },
  {
    code: `function areAnagrams(s1, s2) {
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
    tab: `are-anagrams.${EXTENSION}`,
  },
  {
    code: `function validParantheses(s) {
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
    tab: `valid-parantheses.${EXTENSION}`,
  },
]

export default async function Home() {
  const initialSnippet = await codeToHtml(codeSnippets[0]?.code, {
    lang: 'ts',
    theme: 'nord',
  })

  return (
    <div className="flex w-full flex-col">
      <header className="sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-white px-4 py-5 shadow-md shadow-zinc-900/5 transition duration-500 sm:px-6 lg:px-8 dark:bg-zinc-900/95 dark:shadow-none dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-zinc-900/75">
        <div className="mr-6 flex lg:hidden">
          <button
            type="button"
            className="relative"
            aria-label="Open navigation"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              className="h-6 w-6 stroke-slate-500"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div
            style={{
              position: 'fixed',
              top: 1,
              left: 1,
              width: 1,
              height: 0,
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              borderWidth: 0,
              display: 'none',
            }}
          />
        </div>
        <div className="relative flex flex-grow basis-0 items-center">
          <a aria-label="Home page" href="/">
            <Logo className="h-7" />
          </a>
        </div>
        <div className="relative flex basis-0 justify-end gap-6 sm:gap-8 md:flex-grow">
          <a className="group" aria-label="GitHub" href="https://github.com">
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-6 w-6 fill-slate-400 group-hover:fill-slate-500 dark:group-hover:fill-slate-300"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
            </svg>
          </a>
        </div>
      </header>
      <div className="overflow-hidden bg-zinc-900 dark:-mb-32 dark:mt-[-4.75rem] dark:pb-32 dark:pt-[4.75rem]">
        <div className="py-16 sm:px-2 lg:relative lg:px-0 lg:py-20">
          <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 lg:max-w-8xl lg:grid-cols-2 lg:px-8 xl:gap-x-16 xl:px-12">
            <div className="relative z-10 md:text-center lg:text-left">
              <div className="relative">
                <p className="font-display inline bg-gradient-to-r from-indigo-200 via-lime-400 to-indigo-200 bg-clip-text text-5xl tracking-tight text-transparent">
                  Never miss the cache again.
                </p>
                <p className="mt-3 text-2xl tracking-tight text-slate-400">
                  Cache every single thing your app could ever do ahead of time,
                  so your code never even has to run at all.
                </p>
                <div className="mt-8 flex gap-4 md:justify-center lg:justify-start">
                  <a
                    className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300/50 active:bg-lime-500"
                    href="/"
                  >
                    Get started
                  </a>
                  <a
                    className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-slate-400"
                    href="/"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
            <div className="relative lg:static xl:pl-10">
              <div className="absolute inset-x-[-50vw] -bottom-48 -top-32 [mask-image:linear-gradient(transparent,white,white)] lg:-bottom-32 lg:-top-32 lg:left-[calc(50%+14rem)] lg:right-0 lg:[mask-image:none] dark:[mask-image:linear-gradient(transparent,white,transparent)] lg:dark:[mask-image:linear-gradient(white,white,transparent)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 668 1069"
                  width={668}
                  height={1069}
                  fill="none"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]"
                >
                  <defs>
                    <clipPath id=":Rqja:-clip-path">
                      <path
                        fill="#fff"
                        transform="rotate(-180 334 534.4)"
                        d="M0 0h668v1068.8H0z"
                      />
                    </clipPath>
                  </defs>
                  <g
                    opacity=".4"
                    clipPath="url(#:Rqja:-clip-path)"
                    strokeWidth={4}
                  >
                    <path
                      opacity=".3"
                      d="M584.5 770.4v-474M484.5 770.4v-474M384.5 770.4v-474M283.5 769.4v-474M183.5 768.4v-474M83.5 767.4v-474"
                      stroke="#334155"
                    />
                    <path
                      d="M83.5 221.275v6.587a50.1 50.1 0 0 0 22.309 41.686l55.581 37.054a50.102 50.102 0 0 1 22.309 41.686v6.587M83.5 716.012v6.588a50.099 50.099 0 0 0 22.309 41.685l55.581 37.054a50.102 50.102 0 0 1 22.309 41.686v6.587M183.7 584.5v6.587a50.1 50.1 0 0 0 22.31 41.686l55.581 37.054a50.097 50.097 0 0 1 22.309 41.685v6.588M384.101 277.637v6.588a50.1 50.1 0 0 0 22.309 41.685l55.581 37.054a50.1 50.1 0 0 1 22.31 41.686v6.587M384.1 770.288v6.587a50.1 50.1 0 0 1-22.309 41.686l-55.581 37.054A50.099 50.099 0 0 0 283.9 897.3v6.588"
                      stroke="#334155"
                    />
                    <path
                      d="M384.1 770.288v6.587a50.1 50.1 0 0 1-22.309 41.686l-55.581 37.054A50.099 50.099 0 0 0 283.9 897.3v6.588M484.3 594.937v6.587a50.1 50.1 0 0 1-22.31 41.686l-55.581 37.054A50.1 50.1 0 0 0 384.1 721.95v6.587M484.3 872.575v6.587a50.1 50.1 0 0 1-22.31 41.686l-55.581 37.054a50.098 50.098 0 0 0-22.309 41.686v6.582M584.501 663.824v39.988a50.099 50.099 0 0 1-22.31 41.685l-55.581 37.054a50.102 50.102 0 0 0-22.309 41.686v6.587M283.899 945.637v6.588a50.1 50.1 0 0 1-22.309 41.685l-55.581 37.05a50.12 50.12 0 0 0-22.31 41.69v6.59M384.1 277.637c0 19.946 12.763 37.655 31.686 43.962l137.028 45.676c18.923 6.308 31.686 24.016 31.686 43.962M183.7 463.425v30.69c0 21.564 13.799 40.709 34.257 47.529l134.457 44.819c18.922 6.307 31.686 24.016 31.686 43.962M83.5 102.288c0 19.515 13.554 36.412 32.604 40.645l235.391 52.309c19.05 4.234 32.605 21.13 32.605 40.646M83.5 463.425v-58.45M183.699 542.75V396.625M283.9 1068.8V945.637M83.5 363.225v-141.95M83.5 179.524v-77.237M83.5 60.537V0M384.1 630.425V277.637M484.301 830.824V594.937M584.5 1068.8V663.825M484.301 555.275V452.988M584.5 622.075V452.988M384.1 728.537v-56.362M384.1 1068.8v-20.88M384.1 1006.17V770.287M283.9 903.888V759.85M183.699 1066.71V891.362M83.5 1068.8V716.012M83.5 674.263V505.175"
                      stroke="#334155"
                    />
                    <circle
                      cx="83.5"
                      cy="384.1"
                      r="10.438"
                      transform="rotate(-180 83.5 384.1)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="83.5"
                      cy="200.399"
                      r="10.438"
                      transform="rotate(-180 83.5 200.399)"
                      stroke="#334155"
                    />
                    <circle
                      cx="83.5"
                      cy="81.412"
                      r="10.438"
                      transform="rotate(-180 83.5 81.412)"
                      stroke="#334155"
                    />
                    <circle
                      cx="183.699"
                      cy="375.75"
                      r="10.438"
                      transform="rotate(-180 183.699 375.75)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="183.699"
                      cy="563.625"
                      r="10.438"
                      transform="rotate(-180 183.699 563.625)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="384.1"
                      cy="651.3"
                      r="10.438"
                      transform="rotate(-180 384.1 651.3)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="484.301"
                      cy="574.062"
                      r="10.438"
                      transform="rotate(-180 484.301 574.062)"
                      fill="#A3E635"
                      fillOpacity=".42"
                      stroke="#A3E635"
                    />
                    <circle
                      cx="384.1"
                      cy="749.412"
                      r="10.438"
                      transform="rotate(-180 384.1 749.412)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="384.1"
                      cy="1027.05"
                      r="10.438"
                      transform="rotate(-180 384.1 1027.05)"
                      stroke="#334155"
                    />
                    <circle
                      cx="283.9"
                      cy="924.763"
                      r="10.438"
                      transform="rotate(-180 283.9 924.763)"
                      stroke="#334155"
                    />
                    <circle
                      cx="183.699"
                      cy="870.487"
                      r="10.438"
                      transform="rotate(-180 183.699 870.487)"
                      stroke="#334155"
                    />
                    <circle
                      cx="283.9"
                      cy="738.975"
                      r="10.438"
                      transform="rotate(-180 283.9 738.975)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="83.5"
                      cy="695.138"
                      r="10.438"
                      transform="rotate(-180 83.5 695.138)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="83.5"
                      cy="484.3"
                      r="10.438"
                      transform="rotate(-180 83.5 484.3)"
                      fill="#A3E635"
                      fillOpacity=".42"
                      stroke="#A3E635"
                    />
                    <circle
                      cx="484.301"
                      cy="432.112"
                      r="10.438"
                      transform="rotate(-180 484.301 432.112)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="584.5"
                      cy="432.112"
                      r="10.438"
                      transform="rotate(-180 584.5 432.112)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="584.5"
                      cy="642.95"
                      r="10.438"
                      transform="rotate(-180 584.5 642.95)"
                      fill="#1E293B"
                      stroke="#334155"
                    />
                    <circle
                      cx="484.301"
                      cy="851.699"
                      r="10.438"
                      transform="rotate(-180 484.301 851.699)"
                      stroke="#334155"
                    />
                    <circle
                      cx="384.1"
                      cy="256.763"
                      r="10.438"
                      transform="rotate(-180 384.1 256.763)"
                      stroke="#334155"
                    />
                  </g>
                </svg>
              </div>
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-300 via-lime-300/70 to-lime-300 opacity-10 blur-lg" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-300 via-lime-300/70 to-lime-300 opacity-10" />
                <div className="relative rounded-2xl bg-[#18181b] ring-1 ring-white/10 backdrop-blur">
                  <div className="absolute -top-px left-20 right-11 h-px bg-gradient-to-r from-lime-300/0 via-lime-300/70 to-lime-300/0" />
                  <div className="absolute -bottom-px left-11 right-20 h-px bg-gradient-to-r from-lime-400/0 via-lime-400 to-lime-400/0" />
                  <AnimatedCode
                    initialTab={codeSnippets[0].tab}
                    initialSnippet={initialSnippet}
                    codeSnippets={codeSnippets}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12">
        <div className="min-w-0 max-w-2xl flex-auto px-4 py-16 lg:max-w-none xl:px-16">
          <article>
            <header className="mb-9 space-y-1">
              <h2 className="font-display text-center text-4xl tracking-tight text-slate-900 dark:text-white">
                Content overview
              </h2>
            </header>
            <div className="prose-slate prose-headings:font-display prose max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-normal prose-a:font-semibold prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.lime.300))] hover:prose-a:[--tw-prose-underline-size:6px] prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:shadow-lg prose-lead:text-slate-500 lg:prose-headings:scroll-mt-[8.5rem] dark:text-slate-400 dark:[--tw-prose-background:theme(colors.slate.900)] dark:prose-a:text-lime-400 dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.lime.800))] dark:hover:prose-a:[--tw-prose-underline-size:6px] dark:prose-pre:bg-slate-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-slate-300/10 dark:prose-hr:border-slate-800 dark:prose-lead:text-slate-400">
              <div className="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {completeCurriculum[0].sections.map((section) => (
                  <div
                    key={section.title}
                    className="group relative rounded-xl border border-lime-200 dark:border-lime-500"
                  >
                    <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-6 text-center">
                      {
                        SECTION_ICONS[
                          section.icon as keyof typeof SECTION_ICONS
                        ]
                      }
                      <h2 className="font-display mt-4 text-base text-slate-900 dark:text-white">
                        <a href={section.href}>
                          <span className="absolute -inset-px rounded-xl" />
                          {section.title}
                        </a>
                      </h2>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                        {section.about}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="prose-slate prose-headings:font-display prose max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-normal prose-a:font-semibold prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.lime.300))] hover:prose-a:[--tw-prose-underline-size:6px] prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:shadow-lg prose-lead:text-slate-500 lg:prose-headings:scroll-mt-[8.5rem] dark:text-slate-400 dark:[--tw-prose-background:theme(colors.slate.900)] dark:prose-a:text-lime-400 dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.lime.800))] dark:hover:prose-a:[--tw-prose-underline-size:6px] dark:prose-pre:bg-slate-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-slate-300/10 dark:prose-hr:border-slate-800 dark:prose-lead:text-slate-400">
              <div className="my-12">
                <h3 className="text-xl font-semibold">
                  Why Choose This Platform?
                </h3>
                <ul className="mt-3 list-disc pl-5 text-slate-700 dark:text-slate-400">
                  <li>
                    <strong>Depth and Practical Insights:</strong> The
                    curriculum goes beyond surface-level knowledge, offering
                    in-depth explanations and real-world applications to ensure
                    you have a comprehensive understanding of each topic.
                  </li>
                  <li>
                    <strong>Focus on JavaScript:</strong> Unlike other platforms
                    that focus on Python or other languages, this platform is
                    tailored specifically for JavaScript and TypeScript
                    developers. This means you‘ll be learning in the context of
                    the language you’ll be using, making the material more
                    relevant and easier to apply.
                  </li>
                  <li>
                    <strong>Interview-Ready:</strong> Every lesson is designed
                    to help you ace technical interviews. The curriculum
                    includes common interview techniques and strategies, so
                    you‘ll be well-prepared to tackle any challenge that comes
                    your way.
                  </li>
                  <li>
                    <strong>Expert Tips and Tricks:</strong> Gain insights from
                    an industry expert, with practical tips and tricks that can
                    give you an edge in your interviews. Each lesson also covers
                    common gotchas, helping you avoid the pitfalls that often
                    trip up even experienced engineers.
                  </li>
                  <li>
                    <strong>Interactive Learning:</strong> Engage with hands-on
                    exercises, quizzes, and real-world coding challenges to
                    reinforce your learning. This interactive approach ensures
                    that you not only understand the concepts but can also apply
                    them in practical scenarios.
                  </li>
                </ul>

                <h3 className="mt-6 text-xl font-semibold">
                  A Unique Approach to Interview Preparation
                </h3>
                <p className="mt-3 text-slate-700 dark:text-slate-400">
                  Having been dissatisfied with existing interview preparation
                  courses and platforms, I noticed a common issue: most of them
                  focus on Python and start with implementing various data
                  structures that aren‘t directly relevant to the language being
                  used. This inspired me to create a platform specifically for
                  JavaScript and TypeScript engineers, focusing on the tools and
                  techniques most relevant to them.
                </p>

                <h3 className="mt-6 text-xl font-semibold">
                  Comprehensive Curriculum
                </h3>
                <ul className="mt-3 list-disc pl-5 text-slate-700 dark:text-slate-400">
                  <li>
                    <strong>Built-In Data Structures:</strong> Start with the
                    basics and master JavaScript‘s built-in data structures.
                    Learn about strings, numbers, arrays, objects, sets, and
                    maps. Understand their concepts, use cases, time and space
                    complexities, and practical tips and tricks.
                  </li>
                  <li>
                    <strong>User-Defined Data Structures:</strong> Once you’ve
                    mastered the basics, move on to custom data structures
                    tailored for specific needs. Implement and optimize linked
                    lists, stacks, queues, heaps, trees, graphs, tries, and
                    more. Develop the skills to create efficient and effective
                    data structures for any problem.
                  </li>
                  <li>
                    <strong>Common Techniques:</strong> Explore widely-used
                    algorithms and problem-solving techniques essential for
                    coding interviews. Master techniques like sliding windows,
                    two pointers, cyclic sort, tree and graph traversals, binary
                    search, and many more.
                  </li>
                  <li>
                    <strong>Advanced Topics:</strong> Dive into complex topics
                    for an in-depth understanding of sophisticated algorithms.
                    Study network flow algorithms, dynamic programming, segment
                    trees, union find, minimum spanning trees, shortest path
                    algorithms, and more. Gain a competitive edge with knowledge
                    of advanced concepts and their practical applications.
                  </li>
                </ul>

                <h3 className="mt-6 text-xl font-semibold">
                  Practical Insights and Common Pitfalls
                </h3>
                <p className="mt-3 text-slate-700 dark:text-slate-400">
                  In addition to covering the theoretical aspects, every lesson
                  is packed with practical tips and tricks, along with insights
                  into common pitfalls that often cause trouble for engineers.
                  This ensures that you not only learn the concepts but also
                  understand the nuances that can make a significant difference
                  during an interview.
                </p>

                <h3 className="mt-6 text-xl font-semibold">
                  Get Started Today!
                </h3>
                <p className="mt-3 text-slate-700 dark:text-slate-400">
                  Join [Your Platform Name] and start your journey to becoming a
                  JavaScript expert. Master data structures, algorithms, and
                  interview techniques to land your dream job. With a focus on
                  depth, practical insights, and interactive learning, you’ll be
                  well-equipped to tackle any technical interview with
                  confidence.
                </p>
              </div>

              <Tabs tabs={TEST_TABS} />
            </div>
          </article>
        </div>
      </div>
      <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center bg-zinc-800 sm:px-2 lg:px-8 xl:px-12">
        <div className="min-w-0 max-w-2xl flex-auto px-4 py-16 lg:max-w-none xl:px-16">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <OverlayedImage
              src="/images/covers/linked-lists-algorithms.png"
              title="Linked Lists"
              description="Algorithms"
            />
            <OverlayedImage
              src="/images/covers/linked-lists-practical-tips.png"
              title="Linked Lists"
              description="Practical Tips"
            />
            <OverlayedImage
              src="/images/covers/dynamic-programming-operations.png"
              title="Dynamic Programming"
              description="Operations"
            />
            <OverlayedImage
              src="/images/covers/dynamic-programming-advanced-topics.png"
              title="Dynamic Programming"
              description="Advanced Topics"
            />
          </div>
          <article>
            <header className="mb-9 space-y-1">
              <h2 className="font-display text-center text-4xl text-slate-900 dark:text-white">
                Leading Tech Companies Use Algorithmic Interviews
              </h2>
            </header>
            <div>
              <p className="mt-3 text-center text-slate-700 dark:text-slate-400">
                Algorithmic interviews are the standard for evaluating technical
                skills at major tech companies and in industries like finance
                and logistics. These interviews assess your problem-solving
                abilities, critical thinking, and technical proficiency.
                Embracing this format is essential for advancing your career as
                a software engineer and standing out in a competitive job
                market.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-8 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                <div className="flex items-center justify-center">
                  <FaMeta className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaAmazon className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaApple className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <SiNetflix className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaGoogle className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaMicrosoft className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <SiUber className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <SiTesla className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaTwitter className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaAirbnb className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <FaTiktok className="h-[30px] w-[30px]" />
                </div>
                <div className="flex items-center justify-center">
                  <BsNvidia className="h-[30px] w-[30px]" />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
