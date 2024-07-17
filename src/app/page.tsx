import { AnimatedCode } from '@/components/AnimatedCode'
import { Logo } from '@/components/Logo'
import { OverlayedImage } from '@/components/OverlayedImage'
import { APP_NAME } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import { SECTION_ICONS } from '@/constants/icons'
import Image from 'next/image'
import Link from 'next/link'
import { BsNvidia } from 'react-icons/bs'
import {
  FaAirbnb,
  FaAmazon,
  FaApple,
  FaBookOpen,
  FaGithub,
  FaGoogle,
  FaMicrosoft,
  FaTiktok,
  FaTwitter,
} from 'react-icons/fa'
import { FaMeta } from 'react-icons/fa6'
import { LiaChalkboardTeacherSolid } from 'react-icons/lia'
import {
  MdInsights,
  MdOutlineTipsAndUpdates,
  MdOutlineTouchApp,
} from 'react-icons/md'
import { RiJavascriptLine } from 'react-icons/ri'
import { SiNetflix, SiTesla, SiUber } from 'react-icons/si'
import { codeToHtml } from 'shiki-v1'

const EXTENSION = 'js'

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
              className="h-6 w-6 fill-zinc-400 group-hover:fill-zinc-500 dark:group-hover:fill-zinc-300"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
            </svg>
          </a>
        </div>
      </header>
      <div className="overflow-hidden bg-zinc-900 dark:-mb-32 dark:mt-[-4.75rem] dark:pb-32 dark:pt-[4rem] md:dark:pt-[8rem]">
        <div className="py-16 sm:px-2 lg:relative lg:px-0 lg:py-20">
          <div className="mx-auto grid max-w-3xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 lg:max-w-8xl lg:grid-cols-2 lg:px-8 xl:gap-x-16 xl:px-12">
            <div className="relative z-10 text-center lg:text-left">
              <div className="relative">
                <p className="font-display inline bg-gradient-to-r from-indigo-200 via-lime-400 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent xs:text-4xl md:text-5xl">
                  Master Technical Interviews the JavaScript Way
                </p>
                <p className="mt-3 text-lg tracking-tight text-zinc-300 xs:text-xl md:text-2xl">
                  Unlock in-depth knowledge and practical skills to ace your
                  coding interviews with confidence. Tailored specifically for
                  JavaScript and TypeScript engineers.
                </p>
                <div className="mt-8 flex justify-center gap-4 lg:justify-start">
                  <Link
                    className="rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-lime-200 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300/50 active:bg-lime-500"
                    href="/course"
                  >
                    Get started
                  </Link>
                  <Link
                    className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 active:text-zinc-400"
                    href="/premium"
                  >
                    View pricing
                  </Link>
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
      <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-32">
        <div className="min-w-0 max-w-3xl flex-auto px-4 lg:max-w-none lg:py-16 xl:px-16">
          <article>
            <section aria-label={`Why ${APP_NAME}?`} className="py-10 lg:py-20">
              <div className="mx-auto max-w-7xl lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                  <h2 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                    Why {APP_NAME}?
                  </h2>
                  <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-300">
                    Tailored interview prep for JavaScript engineers. Master
                    data structures, algorithms, and practical insights
                  </p>
                </div>
                <ul
                  role="list"
                  className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 text-sm sm:mt-20 sm:grid-cols-2 md:gap-y-10 lg:max-w-none lg:grid-cols-3"
                >
                  <li className="rounded-2xl border border-zinc-200 p-8">
                    <MdInsights size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Depth and Practical Insights
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      The curriculum goes beyond surface-level knowledge,
                      offering in-depth explanations and real-world applications
                      to ensure you have a comprehensive understanding of each
                      topic.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-200 p-8">
                    <RiJavascriptLine size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Focus on JavaScript
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Tailored specifically for JavaScript and TypeScript
                      developers. This means you‘ll be learning in the context
                      of the language you’ll be using, making the material more
                      relevant and easier to apply.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-200 p-8">
                    <FaBookOpen size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Interview-Ready
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Designed to help you ace technical interviews. Includes
                      common interview techniques and strategies, so you‘ll be
                      well-prepared to tackle any challenge.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-200 p-8">
                    <MdOutlineTipsAndUpdates size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Expert Tips and Tricks
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Gain insights from an industry expert, with practical tips
                      and tricks that can give you an edge in your interviews.
                      Covers common gotchas to help you avoid pitfalls.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-200 p-8">
                    <MdOutlineTouchApp size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Interactive Learning
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Engage with hands-on exercises, quizzes, and real-world
                      coding challenges to reinforce your learning. Ensures that
                      you not only understand the concepts but can also apply
                      them in practical scenarios.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-200 p-8">
                    <LiaChalkboardTeacherSolid size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Advanced Topics
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Dive deep into sophisticated algorithms and data
                      structures. Gain knowledge of advanced concepts and their
                      practical applications to stay ahead.
                    </p>
                  </li>
                </ul>
              </div>
            </section>

            <section
              id="introduction"
              aria-label="Introduction"
              className="py-8 sm:pb-20 md:py-16 lg:py-20"
            >
              <div className="mx-auto text-lg tracking-tight text-zinc-700 md:max-w-3xl lg:max-w-4xl lg:px-12 dark:text-zinc-400">
                <p className="font-display text-left text-2xl font-bold tracking-tight text-zinc-900 xs:text-3xl md:text-4xl dark:text-white">
                  A Unique Approach to Interview Preparation
                </p>
                <p className="mt-4 text-left text-zinc-500 dark:text-zinc-300">
                  Tired of interview prep courses that dive into data structures
                  before you’ve mastered the language? Frustrated with lessons
                  on algorithms that don’t explain their purpose, usage, or how
                  to recognize patterns? This platform is tailored for
                  JavaScript and TypeScript engineers, offering comprehensive
                  coverage from the fundamentals of built-in data structures to
                  advanced concepts. Learn the why, when, and how of algorithms
                  and data structures, ensuring you have all the tools and
                  techniques needed to excel in technical interviews.
                </p>
                <ul role="list" className="mt-8 space-y-3">
                  <li className="flex">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      className="h-8 w-8 flex-none fill-lime-500"
                    >
                      <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                    </svg>
                    <span className="ml-4 text-zinc-500 dark:text-zinc-300">
                      Practical Insights and Common Pitfalls: Every lesson is
                      packed with practical tips and tricks, along with insights
                      into common pitfalls that often cause trouble for
                      engineers.
                    </span>
                  </li>
                  <li className="flex">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      className="h-8 w-8 flex-none fill-lime-500"
                    >
                      <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                    </svg>
                    <span className="ml-4 text-zinc-500 dark:text-zinc-300">
                      Interview Tips and Tricks: Each lesson includes specific
                      strategies and tips for technical interviews, ensuring
                      you‘re well-prepared to showcase your skills effectively.
                    </span>
                  </li>
                  <li className="flex">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      className="h-8 w-8 flex-none fill-lime-500"
                    >
                      <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                    </svg>
                    <span className="ml-4 text-zinc-500 dark:text-zinc-300">
                      Common Mistakes: Identify and avoid common mistakes that
                      can hinder your performance. Each lesson highlights
                      typical pitfalls and how to overcome them.
                    </span>
                  </li>
                  <li className="flex">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      className="h-8 w-8 flex-none fill-lime-500"
                    >
                      <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                    </svg>
                    <span className="ml-4 text-zinc-500 dark:text-zinc-300">
                      When to Use: Understand the practical applications of each
                      data structure and algorithm. Learn when and why to use
                      them in real-world scenarios.
                    </span>
                  </li>
                  <li className="flex">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      className="h-8 w-8 flex-none fill-lime-500"
                    >
                      <path d="M11.83 15.795a1 1 0 0 0-1.66 1.114l1.66-1.114Zm9.861-4.072a1 1 0 1 0-1.382-1.446l1.382 1.446ZM14.115 21l-.83.557a1 1 0 0 0 1.784-.258L14.115 21Zm.954.3c1.29-4.11 3.539-6.63 6.622-9.577l-1.382-1.446c-3.152 3.013-5.704 5.82-7.148 10.424l1.908.598Zm-4.9-4.391 3.115 4.648 1.661-1.114-3.114-4.648-1.662 1.114Z" />
                    </svg>
                    <span className="ml-4 text-zinc-500 dark:text-zinc-300">
                      Advanced Topics: Dive into complex topics for an in-depth
                      understanding of sophisticated algorithms, including
                      network flow algorithms, dynamic programming, segment
                      trees, union find, minimum spanning trees, shortest path
                      algorithms, and more.
                    </span>
                  </li>
                </ul>
                <p className="mt-8 text-left text-zinc-500 dark:text-zinc-300">
                  Join {APP_NAME} and start your journey to becoming a
                  JavaScript expert. Master data structures, algorithms, and
                  interview techniques to land your dream job. With a focus on
                  depth, practical insights, and interactive learning, you’ll be
                  well-equipped to tackle any technical interview with
                  confidence.
                </p>
              </div>
            </section>

            <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center">
              <div className="min-w-0 max-w-3xl flex-auto py-10 lg:max-w-none lg:py-20">
                <article>
                  <div className="grid grid-cols-1 grid-cols-1 gap-12 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
                    <OverlayedImage
                      src="/images/covers/strings-practical-tips.png"
                      title="Practical Tips"
                      description="Enhance your string manipulation skills with practical advice."
                    />
                    <OverlayedImage
                      src="/images/covers/linked-lists-algorithms.png"
                      title="Algorithms"
                      description="Discover tips and tricks to optimize your use of linked lists."
                    />
                    <OverlayedImage
                      src="/images/covers/sliding-window-fixed-size.png"
                      title="Common Techniques"
                      description="Understand the sliding window technique for fixed-size problems."
                    />
                    <OverlayedImage
                      src="/images/covers/dynamic-programming-advanced-topics.png"
                      title="Advanced Topics"
                      description="Dive deep into advanced topics in dynamic programming."
                    />
                  </div>
                </article>
              </div>
            </div>

            <header className="mx-auto max-w-3xl pb-8 pt-8 text-center sm:pb-12 sm:pt-12">
              <h2 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                Content overview
              </h2>
              <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-300">
                Tailored interview prep for JavaScript engineers. Master data
                structures, algorithms, and practical insights
              </p>
            </header>
            <div className="prose-zinc prose-headings:font-display prose mx-auto max-w-7xl max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-normal prose-a:font-semibold prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.lime.300))] hover:prose-a:[--tw-prose-underline-size:6px] prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-pre:shadow-lg prose-lead:text-zinc-500 lg:px-8 lg:prose-headings:scroll-mt-[8.5rem] dark:text-zinc-400 dark:[--tw-prose-background:theme(colors.slate.900)] dark:prose-a:text-lime-400 dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.lime.800))] dark:hover:prose-a:[--tw-prose-underline-size:6px] dark:prose-pre:bg-zinc-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-zinc-300/10 dark:prose-hr:border-zinc-800 dark:prose-lead:text-zinc-400">
              <div className="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {completeCurriculum[0].sections.map((section) => (
                  <div
                    key={section.title}
                    className="group relative rounded-xl"
                  >
                    <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-6 text-center">
                      {
                        SECTION_ICONS[
                          section.icon as keyof typeof SECTION_ICONS
                        ]
                      }
                      <h2 className="font-display mt-4 text-base text-zinc-900 dark:text-white">
                        <a href={section.href}>
                          <span className="absolute -inset-px rounded-xl" />
                          {section.title}
                        </a>
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-300">
                        {section.about}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
      <div className="relative flex w-full flex-auto justify-center bg-zinc-800 sm:px-2 lg:px-8 xl:px-12">
        <div className="min-w-0 max-w-3xl flex-auto px-4 py-16 lg:max-w-none xl:px-16">
          <article>
            <header className="mb-9 space-y-1">
              <h2 className="font-display text-center text-2xl text-white xs:text-3xl md:text-4xl">
                Leading Tech Companies Use Algorithmic Interviews
              </h2>
            </header>
            <div>
              <p className="mt-3 text-center text-zinc-300 dark:text-zinc-300">
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
                  <FaMeta className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaAmazon className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaApple className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <SiNetflix className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaGoogle className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaMicrosoft className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <SiUber className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <SiTesla className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaTwitter className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaAirbnb className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <FaTiktok className="h-[30px] w-[30px] fill-white" />
                </div>
                <div className="flex items-center justify-center">
                  <BsNvidia className="h-[30px] w-[30px] fill-white" />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center pt-14 sm:px-2 lg:px-8 lg:pt-32 xl:px-12">
        <div className="flex min-w-0 max-w-3xl flex-auto flex-row items-center px-4 lg:max-w-none xl:px-16">
          <article className="flex w-full flex-col items-center gap-16 md:flex-row md:gap-8">
            <div
              className="relative w-full max-w-[400px] flex-shrink-0 rounded-2xl"
              style={{ aspectRatio: '1578 / 1700' }}
            >
              <Image
                alt="Practice problems"
                src="/images/covers/practice-problems.png"
                className="absolute inset-0 h-full w-full rounded-3xl"
                fill
                sizes="100vw"
                style={{
                  objectFit: 'contain',
                }}
              />
            </div>
            <div>
              <h2 className="mb-4 text-2xl font-bold">Practice Problems</h2>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                Access over 150 diverse practice problems on our /problems
                route. Each problem is categorized by topic and aligned with the
                lessons, ensuring targeted and effective practice.
              </p>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                Problems range from beginner to advanced levels, helping you
                build and strengthen your skills progressively.
              </p>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                Regular practice reinforces concepts, improves problem-solving
                skills, and boosts your confidence for technical interviews.
              </p>
              <p className="text-lg text-zinc-500 dark:text-zinc-300">
                Start practicing and master data structures and algorithms to
                elevate your coding skills and ace your technical interviews.
              </p>
            </div>
          </article>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12">
        <div className="flex min-w-0 max-w-3xl flex-auto flex-row-reverse items-center px-4 py-8 md:py-16 lg:max-w-none xl:px-16">
          <article className="flex w-full flex-col items-center gap-16 md:flex-row-reverse md:gap-8">
            <div
              className="relative w-full max-w-[400px] flex-shrink-0 rounded-2xl"
              style={{ aspectRatio: '1398 / 1604' }}
            >
              <Image
                alt="User progress"
                src="/images/covers/user-progress.png"
                className="absolute inset-0 h-full w-full rounded-3xl"
                fill
                sizes="100vw"
                style={{
                  objectFit: 'contain',
                }}
              />
            </div>
            <div>
              <h2 className="mb-4 text-2xl font-bold">Track Your Progress</h2>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                {APP_NAME} tracks your progress as you complete lessons, helping
                you see your achievements and identify areas for improvement.
              </p>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                Stay motivated by visualizing your learning journey and
                achieving your goals more efficiently.
              </p>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                New content is added regularly, giving you access to the latest
                resources and tools for success in technical interviews.
              </p>
              <p className="text-lg text-zinc-500 dark:text-zinc-300">
                By tracking your progress and engaging with new content, you can
                systematically build and reinforce your skills, making steady
                improvements along the way.
              </p>
            </div>
          </article>
        </div>
      </div>

      <section
        id="faqs"
        aria-labelledby="faqs-title"
        className="py-12 lg:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-16">
          <div className="mx-auto max-w-3xl lg:mx-0">
            <h2
              id="faqs-title"
              className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white"
            >
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-300">
              If you have any other questions, feel free to{' '}
              <a
                href="mailto:info@example.com"
                className="text-zinc-900 underline dark:text-white"
              >
                reach out to me
              </a>
              .
            </p>
          </div>
          <ul
            role="list"
            className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-8 sm:mt-20 lg:max-w-none lg:grid-cols-3"
          >
            <li>
              <ul role="list" className="space-y-10">
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    Why focus on JavaScript and TypeScript?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Many interview preparation courses focus on Python and often
                    skip over the built-in data structures of the language. This
                    platform is tailored specifically for JavaScript and
                    TypeScript engineers, starting with the basics and covering
                    everything necessary to tackle technical interviews.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What kind of content can I expect?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    The platform covers a wide range of topics from built-in
                    data structures to advanced algorithms. Each lesson includes
                    practical tips, tricks, and insights into common pitfalls.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    How are the lessons structured?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Each lesson begins with foundational concepts and gradually
                    moves to more complex topics. Lessons are designed to be
                    interactive, with hands-on exercises and real-world coding
                    challenges.
                  </p>
                </li>
              </ul>
            </li>
            <li>
              <ul role="list" className="space-y-10">
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What makes this platform unique?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Unlike other platforms, this one focuses on mastering
                    JavaScript and TypeScript, starting from the basics and
                    building up to advanced concepts. It provides practical
                    insights and common pitfalls to ensure you’re well-prepared
                    for technical interviews.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    How do I get started?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Simply sign up on the platform and start with the
                    introductory lessons. Each lesson is designed to build on
                    the previous one, so it’s recommended to follow them in
                    order.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    Are there any prerequisites?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    A basic understanding of JavaScript is helpful, but not
                    required. The lessons start from the basics and gradually
                    increase in complexity, making it suitable for both
                    beginners and experienced developers.
                  </p>
                </li>
              </ul>
            </li>
            <li>
              <ul role="list" className="space-y-10">
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What if I get stuck?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    If you encounter any issues or have questions, you can reach
                    out for support. I’m here to help you succeed and ensure you
                    have a smooth learning experience.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    Is there any interactive content?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Yes, each lesson includes hands-on exercises, quizzes, and
                    real-world coding challenges to reinforce your learning and
                    ensure you can apply the concepts in practical scenarios.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    How can I track my progress?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    The platform includes tools to track your progress through
                    the lessons and exercises. You can see how far you’ve come
                    and what areas you need to focus on.
                  </p>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="author-section"
        className="relative scroll-mt-14 pb-3 pt-8 sm:scroll-mt-32 sm:pb-16 sm:pt-10 lg:pt-16"
      >
        <div className="absolute inset-x-0 bottom-0 top-1/2 text-zinc-900/10 [mask-image:linear-gradient(transparent,white)]">
          <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
            <defs>
              <pattern
                id=":S6:"
                width={128}
                height={128}
                patternUnits="userSpaceOnUse"
                x="50%"
                y="100%"
              >
                <path d="M0 128V.5H128" fill="none" stroke="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#:S6:)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-5xl px-4 pt-16 sm:px-6 md:px-12">
          <div className="sm:rounded-6xl rounded-3xl bg-zinc-800 pt-px">
            <div className="relative mx-auto -mt-16 h-44 w-44 overflow-hidden rounded-full bg-zinc-200 md:float-right md:ml-[36px] md:h-64 md:w-64 md:[shape-outside:circle(40%)] lg:mr-20 lg:h-72 lg:w-72">
              <Image
                alt="Author picture"
                loading="lazy"
                width={400}
                height={400}
                decoding="async"
                data-nimg={1}
                className="absolute inset-0 h-full w-full object-cover"
                src="https://avatars.githubusercontent.com/u/26199969?s=400&u=74701753b39e34fb8b83ce5f221d9dd5fa12064e&v=4"
                style={{
                  color: 'transparent',
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
            </div>
            <div className="px-4 py-10 sm:px-10 sm:py-16 md:py-20 lg:px-16 lg:py-32">
              <p className="font-display text-3xl font-extrabold tracking-tight text-white xs:text-3xl xs:text-4xl md:mt-8 md:text-5xl">
                Hello, I’m Mario, creator of{' '}
                <span className="text-lime-500">{APP_NAME}</span>.
              </p>
              <p className="mt-4 text-lg tracking-tight text-zinc-300">
                With years of experience in software engineering and a passion
                for teaching, I created this platform to help JavaScript and
                TypeScript engineers excel in their technical interviews. My
                goal is to provide comprehensive, practical, and insightful
                content that empowers you to master data structures and
                algorithms.
              </p>
              <p className="mt-4 text-lg tracking-tight text-zinc-300">
                I‘ve worked in various tech industries, where I‘ve honed my
                skills in problem-solving and software design. I‘ve faced the
                challenges of technical interviews firsthand, and now I‘m here
                to share my knowledge and experience to help you succeed.
              </p>
              <p className="mt-4 text-lg tracking-tight text-zinc-300">
                Join me on this journey to deepen your understanding of
                JavaScript and TypeScript, and let‘s work together to achieve
                your career goals.
              </p>
              <p className="mt-8">
                <a
                  className="inline-flex items-center text-base font-medium tracking-tight text-white"
                  href="https://github.com/msiric"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGithub size="40px" />
                  <span className="ml-4">Follow on GitHub</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
