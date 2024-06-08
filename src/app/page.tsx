import { AnimatedCode } from '@/components/AnimatedCode'
import { Logo } from '@/components/Logo'
import { codeToHtml } from 'shiki-v1'

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
        <div className="min-w-0 max-w-2xl flex-auto px-4 py-16 lg:max-w-none lg:pl-8 lg:pr-0 xl:px-16">
          <article>
            <header className="mb-9 space-y-1">
              <p className="font-display text-sm font-medium text-lime-500">
                Introduction
              </p>
              <h1 className="font-display text-3xl tracking-tight text-slate-900 dark:text-white">
                Getting started
              </h1>
            </header>
            <div className="prose-slate prose-headings:font-display prose max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-normal prose-a:font-semibold prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.lime.300))] hover:prose-a:[--tw-prose-underline-size:6px] prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:shadow-lg prose-lead:text-slate-500 lg:prose-headings:scroll-mt-[8.5rem] dark:text-slate-400 dark:[--tw-prose-background:theme(colors.slate.900)] dark:prose-a:text-lime-400 dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.lime.800))] dark:hover:prose-a:[--tw-prose-underline-size:6px] dark:prose-pre:bg-slate-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-slate-300/10 dark:prose-hr:border-slate-800 dark:prose-lead:text-slate-400">
              <p className="lead">
                Learn how to get CacheAdvance set up in your project in under
                thirty minutes or it’s free.{' '}
              </p>
              <div className="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                  <div className="relative overflow-hidden rounded-xl p-6">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="h-8 w-8 [--icon-background:theme(colors.white)] [--icon-foreground:theme(colors.slate.900)]"
                    >
                      <defs>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S1:-gradient"
                          gradientTransform="matrix(0 21 -21 0 12 3)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S1:-gradient-dark"
                          gradientTransform="matrix(0 21 -21 0 16 7)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                      </defs>
                      <g className="dark:hidden">
                        <circle
                          cx={12}
                          cy={12}
                          r={12}
                          fill="url(#:S1:-gradient)"
                        />
                        <path
                          d="m8 8 9 21 2-10 10-2L8 8Z"
                          fillOpacity="0.5"
                          className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <g className="hidden dark:inline">
                        <path
                          d="m4 4 10.286 24 2.285-11.429L28 14.286 4 4Z"
                          fill="url(#:S1:-gradient-dark)"
                          stroke="url(#:S1:-gradient-dark)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    </svg>
                    <h2 className="font-display mt-4 text-base text-slate-900 dark:text-white">
                      <a href="/">
                        <span className="absolute -inset-px rounded-xl" />
                        Installation
                      </a>
                    </h2>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                      Step-by-step guides to setting up your system and
                      installing the library.
                    </p>
                  </div>
                </div>
                <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                  <div className="relative overflow-hidden rounded-xl p-6">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="h-8 w-8 [--icon-background:theme(colors.white)] [--icon-foreground:theme(colors.slate.900)]"
                    >
                      <defs>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S2:-gradient"
                          gradientTransform="matrix(0 21 -21 0 20 3)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S2:-gradient-dark"
                          gradientTransform="matrix(0 22.75 -22.75 0 16 6.25)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                      </defs>
                      <g className="dark:hidden">
                        <circle
                          cx={20}
                          cy={12}
                          r={12}
                          fill="url(#:S2:-gradient)"
                        />
                        <g
                          className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                          fillOpacity="0.5"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 5v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
                          <path d="M18 17v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V17a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2Z" />
                          <path d="M18 5v4a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2Z" />
                          <path d="M3 25v2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
                        </g>
                      </g>
                      <g
                        className="hidden dark:inline"
                        fill="url(#:S2:-gradient-dark)"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M3 17V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm16 10v-9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2Zm0-23v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1ZM3 28v-3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"
                        />
                        <path d="M2 4v13h2V4H2Zm2-2a2 2 0 0 0-2 2h2V2Zm8 0H4v2h8V2Zm2 2a2 2 0 0 0-2-2v2h2Zm0 13V4h-2v13h2Zm-2 2a2 2 0 0 0 2-2h-2v2Zm-8 0h8v-2H4v2Zm-2-2a2 2 0 0 0 2 2v-2H2Zm16 1v9h2v-9h-2Zm3-3a3 3 0 0 0-3 3h2a1 1 0 0 1 1-1v-2Zm6 0h-6v2h6v-2Zm3 3a3 3 0 0 0-3-3v2a1 1 0 0 1 1 1h2Zm0 9v-9h-2v9h2Zm-3 3a3 3 0 0 0 3-3h-2a1 1 0 0 1-1 1v2Zm-6 0h6v-2h-6v2Zm-3-3a3 3 0 0 0 3 3v-2a1 1 0 0 1-1-1h-2Zm2-18V4h-2v5h2Zm0 0h-2a2 2 0 0 0 2 2V9Zm8 0h-8v2h8V9Zm0 0v2a2 2 0 0 0 2-2h-2Zm0-5v5h2V4h-2Zm0 0h2a2 2 0 0 0-2-2v2Zm-8 0h8V2h-8v2Zm0 0V2a2 2 0 0 0-2 2h2ZM2 25v3h2v-3H2Zm2-2a2 2 0 0 0-2 2h2v-2Zm9 0H4v2h9v-2Zm2 2a2 2 0 0 0-2-2v2h2Zm0 3v-3h-2v3h2Zm-2 2a2 2 0 0 0 2-2h-2v2Zm-9 0h9v-2H4v2Zm-2-2a2 2 0 0 0 2 2v-2H2Z" />
                      </g>
                    </svg>
                    <h2 className="font-display mt-4 text-base text-slate-900 dark:text-white">
                      <a href="/">
                        <span className="absolute -inset-px rounded-xl" />
                        Architecture guide
                      </a>
                    </h2>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                      Learn how the internals work and contribute.
                    </p>
                  </div>
                </div>
                <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                  <div className="relative overflow-hidden rounded-xl p-6">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="h-8 w-8 [--icon-background:theme(colors.white)] [--icon-foreground:theme(colors.slate.900)]"
                    >
                      <defs>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S3:-gradient"
                          gradientTransform="matrix(0 21 -21 0 20 11)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S3:-gradient-dark-1"
                          gradientTransform="matrix(0 22.75 -22.75 0 16 6.25)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S3:-gradient-dark-2"
                          gradientTransform="matrix(0 14 -14 0 16 10)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                      </defs>
                      <g className="dark:hidden">
                        <circle
                          cx={20}
                          cy={20}
                          r={12}
                          fill="url(#:S3:-gradient)"
                        />
                        <g
                          fillOpacity="0.5"
                          className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 9v14l12 6V15L3 9Z" />
                          <path d="M27 9v14l-12 6V15l12-6Z" />
                        </g>
                        <path
                          d="M11 4h8v2l6 3-10 6L5 9l6-3V4Z"
                          fillOpacity="0.5"
                          className="fill-[var(--icon-background)]"
                        />
                        <g
                          className="stroke-[color:var(--icon-foreground)]"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 5.5 27 9l-12 6L3 9l7-3.5" />
                          <path d="M20 5c0 1.105-2.239 2-5 2s-5-.895-5-2m10 0c0-1.105-2.239-2-5-2s-5 .895-5 2m10 0v3c0 1.105-2.239 2-5 2s-5-.895-5-2V5" />
                        </g>
                      </g>
                      <g
                        className="hidden dark:inline"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d="M17.676 3.38a3.887 3.887 0 0 0-3.352 0l-9 4.288C3.907 8.342 3 9.806 3 11.416v9.168c0 1.61.907 3.073 2.324 3.748l9 4.288a3.887 3.887 0 0 0 3.352 0l9-4.288C28.093 23.657 29 22.194 29 20.584v-9.168c0-1.61-.907-3.074-2.324-3.748l-9-4.288Z"
                          stroke="url(#:S3:-gradient-dark-1)"
                        />
                        <path
                          d="M16.406 8.087a.989.989 0 0 0-.812 0l-7 3.598A1.012 1.012 0 0 0 8 12.61v6.78c0 .4.233.762.594.925l7 3.598a.989.989 0 0 0 .812 0l7-3.598c.361-.163.594-.525.594-.925v-6.78c0-.4-.233-.762-.594-.925l-7-3.598Z"
                          fill="url(#:S3:-gradient-dark-2)"
                          stroke="url(#:S3:-gradient-dark-2)"
                        />
                      </g>
                    </svg>
                    <h2 className="font-display mt-4 text-base text-slate-900 dark:text-white">
                      <a href="/">
                        <span className="absolute -inset-px rounded-xl" />
                        Plugins
                      </a>
                    </h2>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                      Extend the library with third-party plugins or write your
                      own.
                    </p>
                  </div>
                </div>
                <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                  <div className="relative overflow-hidden rounded-xl p-6">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 32 32"
                      fill="none"
                      className="h-8 w-8 [--icon-background:theme(colors.white)] [--icon-foreground:theme(colors.slate.900)]"
                    >
                      <defs>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S4:-gradient"
                          gradientTransform="matrix(0 21 -21 0 12 11)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                        <radialGradient
                          cx={0}
                          cy={0}
                          r={1}
                          gradientUnits="userSpaceOnUse"
                          id=":S4:-gradient-dark"
                          gradientTransform="matrix(0 24.5 -24.5 0 16 5.5)"
                        >
                          <stop stopColor="#A3E635" />
                          <stop stopColor="#84CC16" offset=".527" />
                          <stop stopColor="#65A30D" offset={1} />
                        </radialGradient>
                      </defs>
                      <g className="dark:hidden">
                        <circle
                          cx={12}
                          cy={20}
                          r={12}
                          fill="url(#:S4:-gradient)"
                        />
                        <path
                          d="M27 12.13 19.87 5 13 11.87v14.26l14-14Z"
                          className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                          fillOpacity="0.5"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M3 3h10v22a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V3Z"
                          className="fill-[var(--icon-background)]"
                          fillOpacity="0.5"
                        />
                        <path
                          d="M3 9v16a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V9M3 9V3h10v6M3 9h10M3 15h10M3 21h10"
                          className="stroke-[color:var(--icon-foreground)]"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M29 29V19h-8.5L13 26c0 1.5-2.5 3-5 3h21Z"
                          fillOpacity="0.5"
                          className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                      <g className="hidden dark:inline">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M3 2a1 1 0 0 0-1 1v21a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H3Zm16.752 3.293a1 1 0 0 0-1.593.244l-1.045 2A1 1 0 0 0 17 8v13a1 1 0 0 0 1.71.705l7.999-8.045a1 1 0 0 0-.002-1.412l-6.955-6.955ZM26 18a1 1 0 0 0-.707.293l-10 10A1 1 0 0 0 16 30h13a1 1 0 0 0 1-1V19a1 1 0 0 0-1-1h-3ZM5 18a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2H5Zm-1-5a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm1-7a1 1 0 0 0 0 2h6a1 1 0 1 0 0-2H5Z"
                          fill="url(#:S4:-gradient-dark)"
                        />
                      </g>
                    </svg>
                    <h2 className="font-display mt-4 text-base text-slate-900 dark:text-white">
                      <a href="/">
                        <span className="absolute -inset-px rounded-xl" />
                        API reference
                      </a>
                    </h2>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                      Learn to easily customize and modify your app’s visual
                      design to fit your brand.
                    </p>
                  </div>
                </div>
              </div>
              <p>
                Possimus saepe veritatis sint nobis et quam eos. Architecto
                consequatur odit perferendis fuga eveniet possimus rerum cumque.
                Ea deleniti voluptatum deserunt voluptatibus ut non iste.
              </p>
              <hr />
              <h2 id="quick-start">Quick start</h2>
              <p>
                Sit commodi iste iure molestias qui amet voluptatem sed quaerat.
                Nostrum aut pariatur. Sint ipsa praesentium dolor error cumque
                velit tenetur.
              </p>
              <h3 id="installing-dependencies">Installing dependencies</h3>
              <p>
                Sit commodi iste iure molestias qui amet voluptatem sed quaerat.
                Nostrum aut pariatur. Sint ipsa praesentium dolor error cumque
                velit tenetur quaerat exercitationem. Consequatur et cum atque
                mollitia qui quia necessitatibus.
              </p>
              <pre className="prism-code language-shell">
                <code>
                  <span className="token plain">
                    npm install @tailwindlabs/cache-advance
                  </span>
                  {'\n'}
                </code>
              </pre>
              <p>
                Possimus saepe veritatis sint nobis et quam eos. Architecto
                consequatur odit perferendis fuga eveniet possimus rerum cumque.
                Ea deleniti voluptatum deserunt voluptatibus ut non iste.
                Provident nam asperiores vel laboriosam omnis ducimus enim
                nesciunt quaerat. Minus tempora cupiditate est quod.
              </p>
              <div className="my-8 flex rounded-3xl bg-amber-50 p-6 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-300/10">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="h-8 w-8 flex-none [--icon-background:theme(colors.amber.100)] [--icon-foreground:theme(colors.amber.900)]"
                >
                  <defs>
                    <radialGradient
                      cx={0}
                      cy={0}
                      r={1}
                      gradientUnits="userSpaceOnUse"
                      id=":S5:-gradient"
                      gradientTransform="rotate(65.924 1.519 20.92) scale(25.7391)"
                    >
                      <stop stopColor="#FDE68A" offset=".08" />
                      <stop stopColor="#F59E0B" offset=".837" />
                    </radialGradient>
                    <radialGradient
                      cx={0}
                      cy={0}
                      r={1}
                      gradientUnits="userSpaceOnUse"
                      id=":S5:-gradient-dark"
                      gradientTransform="matrix(0 24.5 -24.5 0 16 5.5)"
                    >
                      <stop stopColor="#FDE68A" offset=".08" />
                      <stop stopColor="#F59E0B" offset=".837" />
                    </radialGradient>
                  </defs>
                  <g className="dark:hidden">
                    <circle cx={20} cy={20} r={12} fill="url(#:S5:-gradient)" />
                    <path
                      d="M3 16c0 7.18 5.82 13 13 13s13-5.82 13-13S23.18 3 16 3 3 8.82 3 16Z"
                      fillOpacity="0.5"
                      className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m15.408 16.509-1.04-5.543a1.66 1.66 0 1 1 3.263 0l-1.039 5.543a.602.602 0 0 1-1.184 0Z"
                      className="fill-[var(--icon-foreground)] stroke-[color:var(--icon-foreground)]"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 23a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                      fillOpacity="0.5"
                      stroke="currentColor"
                      className="fill-[var(--icon-background)] stroke-[color:var(--icon-foreground)]"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <g className="hidden dark:inline">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2 16C2 8.268 8.268 2 16 2s14 6.268 14 14-6.268 14-14 14S2 23.732 2 16Zm11.386-4.85a2.66 2.66 0 1 1 5.228 0l-1.039 5.543a1.602 1.602 0 0 1-3.15 0l-1.04-5.543ZM16 20a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
                      fill="url(#:S5:-gradient-dark)"
                    />
                  </g>
                </svg>
                <div className="ml-4 flex-auto">
                  <p className="font-display m-0 text-xl text-amber-900 dark:text-amber-500">
                    Oh no! Something bad happened!
                  </p>
                  <div className="prose mt-2.5 text-amber-800 [--tw-prose-background:theme(colors.amber.50)] [--tw-prose-underline:theme(colors.amber.400)] prose-a:text-amber-900 prose-code:text-amber-900 dark:text-slate-300 dark:[--tw-prose-underline:theme(colors.lime.700)] dark:prose-code:text-slate-300">
                    <p>
                      This is what a disclaimer message looks like. You might
                      want to include inline <code>code</code> in it. Or maybe
                      you’ll want to include a <a href="/">link</a> in it. I
                      don’t think we should get too carried away with other
                      scenarios like lists or tables — that would be silly.
                    </p>
                  </div>
                </div>
              </div>
              <h3 id="configuring-the-library">Configuring the library</h3>
              <p>
                Sit commodi iste iure molestias qui amet voluptatem sed quaerat.
                Nostrum aut pariatur. Sint ipsa praesentium dolor error cumque
                velit tenetur quaerat exercitationem. Consequatur et cum atque
                mollitia qui quia necessitatibus.
              </p>
              <p>
                Possimus saepe veritatis sint nobis et quam eos. Architecto
                consequatur odit perferendis fuga eveniet possimus rerum cumque.
                Ea deleniti voluptatum deserunt voluptatibus ut non iste.
                Provident nam asperiores vel laboriosam omnis ducimus enim
                nesciunt quaerat. Minus tempora cupiditate est quod.
              </p>
              <div className="my-8 flex rounded-3xl bg-lime-50 p-6 dark:bg-slate-800/60 dark:ring-1 dark:ring-slate-300/10">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="h-8 w-8 flex-none [--icon-background:theme(colors.white)] [--icon-foreground:theme(colors.slate.900)]"
                >
                  <defs>
                    <radialGradient
                      cx={0}
                      cy={0}
                      r={1}
                      gradientUnits="userSpaceOnUse"
                      id=":S6:-gradient"
                      gradientTransform="matrix(0 21 -21 0 20 11)"
                    >
                      <stop stopColor="#A3E635" />
                      <stop stopColor="#84CC16" offset=".527" />
                      <stop stopColor="#65A30D" offset={1} />
                    </radialGradient>
                    <radialGradient
                      cx={0}
                      cy={0}
                      r={1}
                      gradientUnits="userSpaceOnUse"
                      id=":S6:-gradient-dark"
                      gradientTransform="matrix(0 24.5001 -19.2498 0 16 5.5)"
                    >
                      <stop stopColor="#A3E635" />
                      <stop stopColor="#84CC16" offset=".527" />
                      <stop stopColor="#65A30D" offset={1} />
                    </radialGradient>
                  </defs>
                  <g className="dark:hidden">
                    <circle cx={20} cy={20} r={12} fill="url(#:S6:-gradient)" />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M20 24.995c0-1.855 1.094-3.501 2.427-4.792C24.61 18.087 26 15.07 26 12.231 26 7.133 21.523 3 16 3S6 7.133 6 12.23c0 2.84 1.389 5.857 3.573 7.973C10.906 21.494 12 23.14 12 24.995V27a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.005Z"
                      className="fill-[var(--icon-background)]"
                      fillOpacity="0.5"
                    />
                    <path
                      d="M25 12.23c0 2.536-1.254 5.303-3.269 7.255l1.391 1.436c2.354-2.28 3.878-5.547 3.878-8.69h-2ZM16 4c5.047 0 9 3.759 9 8.23h2C27 6.508 21.998 2 16 2v2Zm-9 8.23C7 7.76 10.953 4 16 4V2C10.002 2 5 6.507 5 12.23h2Zm3.269 7.255C8.254 17.533 7 14.766 7 12.23H5c0 3.143 1.523 6.41 3.877 8.69l1.392-1.436ZM13 27v-2.005h-2V27h2Zm1 1a1 1 0 0 1-1-1h-2a3 3 0 0 0 3 3v-2Zm4 0h-4v2h4v-2Zm1-1a1 1 0 0 1-1 1v2a3 3 0 0 0 3-3h-2Zm0-2.005V27h2v-2.005h-2ZM8.877 20.921C10.132 22.136 11 23.538 11 24.995h2c0-2.253-1.32-4.143-2.731-5.51L8.877 20.92Zm12.854-1.436C20.32 20.852 19 22.742 19 24.995h2c0-1.457.869-2.859 2.122-4.074l-1.391-1.436Z"
                      className="fill-[var(--icon-foreground)]"
                    />
                    <path
                      d="M20 26a1 1 0 1 0 0-2v2Zm-8-2a1 1 0 1 0 0 2v-2Zm2 0h-2v2h2v-2Zm1 1V13.5h-2V25h2Zm-5-11.5v1h2v-1h-2Zm3.5 4.5h5v-2h-5v2Zm8.5-3.5v-1h-2v1h2ZM20 24h-2v2h2v-2Zm-2 0h-4v2h4v-2Zm-1-10.5V25h2V13.5h-2Zm2.5-2.5a2.5 2.5 0 0 0-2.5 2.5h2a.5.5 0 0 1 .5-.5v-2Zm2.5 2.5a2.5 2.5 0 0 0-2.5-2.5v2a.5.5 0 0 1 .5.5h2ZM18.5 18a3.5 3.5 0 0 0 3.5-3.5h-2a1.5 1.5 0 0 1-1.5 1.5v2ZM10 14.5a3.5 3.5 0 0 0 3.5 3.5v-2a1.5 1.5 0 0 1-1.5-1.5h-2Zm2.5-3.5a2.5 2.5 0 0 0-2.5 2.5h2a.5.5 0 0 1 .5-.5v-2Zm2.5 2.5a2.5 2.5 0 0 0-2.5-2.5v2a.5.5 0 0 1 .5.5h2Z"
                      className="fill-[var(--icon-foreground)]"
                    />
                  </g>
                  <g className="hidden dark:inline">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M16 2C10.002 2 5 6.507 5 12.23c0 3.144 1.523 6.411 3.877 8.691.75.727 1.363 1.52 1.734 2.353.185.415.574.726 1.028.726H12a1 1 0 0 0 1-1v-4.5a.5.5 0 0 0-.5-.5A3.5 3.5 0 0 1 9 14.5V14a3 3 0 1 1 6 0v9a1 1 0 1 0 2 0v-9a3 3 0 1 1 6 0v.5a3.5 3.5 0 0 1-3.5 3.5.5.5 0 0 0-.5.5V23a1 1 0 0 0 1 1h.36c.455 0 .844-.311 1.03-.726.37-.833.982-1.626 1.732-2.353 2.354-2.28 3.878-5.547 3.878-8.69C27 6.507 21.998 2 16 2Zm5 25a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1 3 3 0 0 0 3 3h4a3 3 0 0 0 3-3Zm-8-13v1.5a.5.5 0 0 1-.5.5 1.5 1.5 0 0 1-1.5-1.5V14a1 1 0 1 1 2 0Zm6.5 2a.5.5 0 0 1-.5-.5V14a1 1 0 1 1 2 0v.5a1.5 1.5 0 0 1-1.5 1.5Z"
                      fill="url(#:S6:-gradient-dark)"
                    />
                  </g>
                </svg>
                <div className="ml-4 flex-auto">
                  <p className="font-display m-0 text-xl text-lime-900 dark:text-lime-400">
                    You should know!
                  </p>
                  <div className="prose mt-2.5 text-lime-800 [--tw-prose-background:theme(colors.lime.50)] prose-a:text-lime-900 prose-code:text-lime-900 dark:text-slate-300 dark:prose-code:text-slate-300">
                    <p>
                      This is what a disclaimer message looks like. You might
                      want to include inline <code>code</code> in it. Or maybe
                      you’ll want to include a <a href="/">link</a> in it. I
                      don’t think we should get too carried away with other
                      scenarios like lists or tables — that would be silly.
                    </p>
                  </div>
                </div>
              </div>
              <hr />
              <h2 id="basic-usage">Basic usage</h2>
              <p>
                Praesentium laudantium magni. Consequatur reiciendis aliquid
                nihil iusto ut in et. Quisquam ut et aliquid occaecati. Culpa
                veniam aut et voluptates amet perspiciatis. Qui exercitationem
                in qui. Vel qui dignissimos sit quae distinctio.
              </p>
              <h3 id="your-first-cache">Your first cache</h3>
              <p>
                Minima vel non iste debitis. Consequatur repudiandae et quod
                accusamus sit molestias consequatur aperiam. Et sequi ipsa eum
                voluptatibus ipsam. Et quisquam ut.
              </p>
              <p>
                Qui quae esse aspernatur fugit possimus. Quam sed molestiae
                temporibus. Eum perferendis dignissimos provident ea et. Et
                repudiandae quasi accusamus consequatur dolore nobis. Quia
                reiciendis necessitatibus a blanditiis iste quia. Ut quis et
                amet praesentium sapiente.
              </p>
              <p>
                Atque eos laudantium. Optio odit aspernatur consequuntur
                corporis soluta quidem sunt aut doloribus. Laudantium assumenda
                commodi.
              </p>
              <h3 id="clearing-the-cache">Clearing the cache</h3>
              <p>
                Vel aut velit sit dolor aut suscipit at veritatis voluptas.
                Laudantium tempore praesentium. Qui ut voluptatem.
              </p>
              <p>
                Ea est autem fugiat velit esse a alias earum. Dolore non amet
                soluta eos libero est. Consequatur qui aliquam qui odit eligendi
                ut impedit illo dignissimos.
              </p>
              <p>
                Ut dolore qui aut nam. Natus temporibus nisi voluptatum labore
                est ex error vel officia. Vero repellendus ut. Suscipit
                voluptate et placeat. Eius quo corporis ab et consequatur
                quisquam. Nihil officia facere dolorem occaecati alias deleniti
                deleniti in.
              </p>
              <h3 id="adding-middleware">Adding middleware</h3>
              <p>
                Officia nobis tempora maiores id iusto magni reprehenderit
                velit. Quae dolores inventore molestiae perspiciatis aut. Quis
                sequi officia quasi rem officiis officiis. Nesciunt ut
                cupiditate. Sunt aliquid explicabo enim ipsa eum recusandae.
                Vitae sunt eligendi et non beatae minima aut.
              </p>
              <p>
                Harum perferendis aut qui quibusdam tempore laboriosam
                voluptatum qui sed. Amet error amet totam exercitationem aut
                corporis accusantium dolorum. Perspiciatis aut animi et. Sed
                unde error ut aut rerum.
              </p>
              <p>
                Ut quo libero aperiam mollitia est repudiandae quaerat corrupti
                explicabo. Voluptas accusantium sed et doloribus voluptatem
                fugiat a mollitia. Numquam est magnam dolorem asperiores fugiat.
                Soluta et fuga amet alias temporibus quasi velit. Laudantium
                voluptatum perspiciatis doloribus quasi facere. Eveniet deleniti
                veniam et quia veritatis minus veniam perspiciatis.
              </p>
              <hr />
              <h2 id="getting-help">Getting help</h2>
              <p>
                Consequuntur et aut quisquam et qui consequatur eligendi.
                Necessitatibus dolorem sit. Excepturi cumque quibusdam soluta
                ullam rerum voluptatibus. Porro illo sequi consequatur nisi
                numquam nisi autem. Ut necessitatibus aut. Veniam ipsa
                voluptatem sed.
              </p>
              <h3 id="submit-an-issue">Submit an issue</h3>
              <p>
                Inventore et aut minus ut voluptatem nihil commodi doloribus
                consequatur. Facilis perferendis nihil sit aut aspernatur iure
                ut dolores et. Aspernatur odit dignissimos. Aut qui est sint
                sint.
              </p>
              <p>
                Facere aliquam qui. Dolorem officia ipsam adipisci qui
                molestiae. Error voluptatem reprehenderit ex.
              </p>
              <p>
                Consequatur enim quia maiores aperiam et ipsum dicta. Quam ut
                sit facere sit quae. Eligendi veritatis aut ut veritatis iste ut
                adipisci illo.
              </p>
              <h3 id="join-the-community">Join the community</h3>
              <p>
                Praesentium facilis iste aliquid quo quia a excepturi. Fuga
                reprehenderit illo sequi voluptatem voluptatem omnis. Id quia
                consequatur rerum consectetur eligendi et omnis. Voluptates
                iusto labore possimus provident praesentium id vel harum
                quisquam. Voluptatem provident corrupti.
              </p>
              <p>
                Eum et ut. Qui facilis est ipsa. Non facere quia sequi commodi
                autem. Dicta autem sit sequi omnis impedit. Eligendi amet
                dolorum magnam repudiandae in a.
              </p>
              <p>
                Molestiae iusto ut exercitationem dolorem unde iusto tempora
                atque nihil. Voluptatem velit facere laboriosam nobis ea.
                Consequatur rerum velit ipsum ipsam. Et qui saepe consequatur
                minima laborum tempore voluptatum et. Quia eveniet eaque sequi
                consequatur nihil eos.
              </p>
            </div>
          </article>
        </div>
        <div className="hidden xl:sticky xl:top-[4.75rem] xl:-mr-6 xl:block xl:h-[calc(100vh-4.75rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
          <nav aria-labelledby="on-this-page-title" className="w-56">
            <h2
              id="on-this-page-title"
              className="font-display text-sm font-medium text-slate-900 dark:text-white"
            >
              On this page
            </h2>
            <ol role="list" className="mt-4 space-y-3 text-sm">
              <li>
                <h3>
                  <a className="text-lime-500" href="#quick-start">
                    Quick start
                  </a>
                </h3>
                <ol
                  role="list"
                  className="mt-2 space-y-3 pl-5 text-slate-500 dark:text-slate-400"
                >
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#installing-dependencies"
                    >
                      Installing dependencies
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#configuring-the-library"
                    >
                      Configuring the library
                    </a>
                  </li>
                </ol>
              </li>
              <li>
                <h3>
                  <a
                    className="font-normal text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                    href="#basic-usage"
                  >
                    Basic usage
                  </a>
                </h3>
                <ol
                  role="list"
                  className="mt-2 space-y-3 pl-5 text-slate-500 dark:text-slate-400"
                >
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#your-first-cache"
                    >
                      Your first cache
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#clearing-the-cache"
                    >
                      Clearing the cache
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#adding-middleware"
                    >
                      Adding middleware
                    </a>
                  </li>
                </ol>
              </li>
              <li>
                <h3>
                  <a
                    className="font-normal text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                    href="#getting-help"
                  >
                    Getting help
                  </a>
                </h3>
                <ol
                  role="list"
                  className="mt-2 space-y-3 pl-5 text-slate-500 dark:text-slate-400"
                >
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#submit-an-issue"
                    >
                      Submit an issue
                    </a>
                  </li>
                  <li>
                    <a
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                      href="#join-the-community"
                    >
                      Join the community
                    </a>
                  </li>
                </ol>
              </li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  )
}
