import { AnimatedCode } from '@/components/AnimatedCode'
import { Footer } from '@/components/Footer'
import { Logo } from '@/components/Logo'
import TopBanner from '@/components/TopBanner'
import { APP_NAME } from '@/constants'
import { completeCurriculum } from '@/constants/curriculum'
import { SECTION_ICONS } from '@/constants/icons'
import { getActiveBanners } from '@/services/banner'
import { highlightCode } from '@/utils/helpers'
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
  MdOutlineAlternateEmail,
  MdOutlineTipsAndUpdates,
  MdOutlineTouchApp,
} from 'react-icons/md'
import { RiJavascriptLine } from 'react-icons/ri'
import { SiNetflix, SiTesla, SiUber } from 'react-icons/si'
import { HomepageBackground } from '../components/icons/HomepageBackground'
import { ThemeToggle } from '../components/ThemeToggle'

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
  const [activeBanners, initialSnippet] = await Promise.all([
    getActiveBanners(),
    highlightCode(codeSnippets[0].code),
  ])

  return (
    <div className="flex w-full flex-col">
      {activeBanners.map((banner) => (
        <TopBanner
          key={banner.id}
          title={banner.title}
          message={banner.message}
          type={banner.type}
          link={
            banner.linkUrl
              ? { text: banner.linkText!, url: banner.linkUrl }
              : undefined
          }
        />
      ))}
      <header className="sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-white px-4 py-5 shadow-md shadow-zinc-900/5 transition duration-500 sm:px-6 lg:px-8 dark:bg-zinc-900/95 dark:shadow-none dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-zinc-900/75">
        <div className="relative flex flex-grow basis-0 items-center">
          <a aria-label="Home page" href="/">
            <Logo className="h-7" />
          </a>
        </div>
        <div className="relative flex basis-0 items-center justify-end gap-4 sm:gap-8 md:flex-grow">
          <ThemeToggle />
          <a
            className="group"
            aria-label="GitHub"
            href="https://github.com/msiric"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-6 w-6 fill-zinc-900 group-hover:fill-zinc-500 dark:fill-zinc-200 dark:group-hover:fill-zinc-300"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
            </svg>
          </a>
        </div>
      </header>
      <div className="overflow-hidden bg-zinc-900">
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
                    href="/courses"
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
              <div className="absolute inset-x-[-50vw] -bottom-48 -top-24 [mask-image:linear-gradient(transparent,white,white)] lg:-bottom-32 lg:-top-24 lg:left-[calc(50%+14rem)] lg:right-0 lg:[mask-image:none] dark:[mask-image:linear-gradient(transparent,white,transparent)] lg:dark:[mask-image:linear-gradient(white,white,transparent)]">
                <HomepageBackground
                  width={668}
                  height={1069}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]"
                />
              </div>
              <div className="min-h-full">
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-300 via-lime-300/70 to-lime-300 opacity-10 blur-lg" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-lime-300 via-lime-300/70 to-lime-300 opacity-10" />
                  <div className="relative min-h-full rounded-2xl bg-zinc-900 ring-1 ring-white/10 backdrop-blur">
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
                    Transform your interview preparation with a comprehensive
                    dual-track approach, designed specifically for JavaScript
                    engineers.
                  </p>
                </div>
                <ul
                  role="list"
                  className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 text-sm sm:mt-20 sm:grid-cols-2 md:gap-y-10 lg:max-w-none lg:grid-cols-3"
                >
                  <li className="rounded-2xl border border-zinc-400 p-8">
                    <MdInsights size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Depth and Practical Insights
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Go beyond basics with in-depth explanations and real-world
                      applications that ensure comprehensive understanding of
                      each topic.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-400 p-8">
                    <RiJavascriptLine size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Focus on JavaScript
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Tailored for JavaScript and TypeScript developers, making
                      concepts more relevant and immediately applicable to your
                      work.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-400 p-8">
                    <FaBookOpen size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Interview-Ready
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Equips you with techniques and strategies to confidently
                      tackle technical interviews and common coding challenges.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-400 p-8">
                    <MdOutlineTipsAndUpdates size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Expert Tips and Tricks
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Gain insider knowledge from an industry expert, with
                      practical tips and common pitfalls to avoid during
                      interviews.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-400 p-8">
                    <MdOutlineTouchApp size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Interactive Learning
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Reinforce concepts through hands-on coding challenges that
                      build practical application skills for real-world
                      scenarios.
                    </p>
                  </li>
                  <li className="rounded-2xl border border-zinc-400 p-8">
                    <LiaChalkboardTeacherSolid size="32px" />
                    <h3 className="mt-6 font-semibold text-zinc-900 dark:text-white">
                      Advanced Topics
                    </h3>
                    <p className="mt-2 text-zinc-500 dark:text-zinc-300">
                      Dive deep into sophisticated algorithms and modern
                      frontend architectures to stand out in technical
                      interviews.
                    </p>
                  </li>
                </ul>
              </div>
            </section>

            <header className="mx-auto max-w-3xl pb-8 pt-8 text-center sm:pb-12 sm:pt-12">
              <h2 className="text-3xl font-medium tracking-tight text-zinc-900 dark:text-white">
                Content overview
              </h2>
              <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-300">
                Comprehensive interview preparation covering algorithmic
                problem-solving and advanced JavaScript/TypeScript concepts for
                modern development
              </p>
            </header>
            <div className="prose-zinc prose-headings:font-display prose mx-auto max-w-7xl max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-headings:font-normal prose-a:font-semibold prose-a:no-underline prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background,#fff),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.lime.300))] hover:prose-a:[--tw-prose-underline-size:6px] prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-pre:shadow-lg prose-lead:text-zinc-500 lg:px-8 lg:prose-headings:scroll-mt-[8.5rem] dark:text-zinc-400 dark:[--tw-prose-background:theme(colors.slate.900)] dark:prose-a:text-lime-400 dark:prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.lime.800))] dark:hover:prose-a:[--tw-prose-underline-size:6px] dark:prose-pre:bg-zinc-800/60 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-zinc-300/10 dark:prose-hr:border-zinc-800 dark:prose-lead:text-zinc-400">
              <div className="grid grid-cols-1 gap-8 px-4 lg:grid-cols-2 lg:gap-12">
                {completeCurriculum.map((track) => (
                  <div
                    key={track.id}
                    className="mx-auto w-full max-w-[650px] rounded-2xl px-4 sm:px-8 lg:px-12"
                  >
                    <div className="mb-8">
                      <h3 className="text-center text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {track.title}
                      </h3>
                      <p className="text-md mt-2 text-center text-zinc-500 dark:text-zinc-300">
                        {track.description}
                      </p>
                    </div>
                    <div className="not-prose grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {track.sections.map((section) => (
                        <div
                          key={section.title}
                          className="group relative mx-auto w-full max-w-[280px] rounded-xl"
                        >
                          <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 transition-all duration-200 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.lime.50)),var(--quick-links-hover-bg,theme(colors.lime.50)))_padding-box,linear-gradient(to_top,theme(colors.indigo.400),theme(colors.cyan.400),theme(colors.lime.500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:theme(colors.slate.800)]" />
                          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-6 text-center">
                            <div className="rounded-full bg-zinc-700 p-4">
                              {
                                SECTION_ICONS[
                                  section.icon as keyof typeof SECTION_ICONS
                                ]
                              }
                            </div>
                            <h2 className="font-display mt-4 text-base text-zinc-900 dark:text-white">
                              <a href={section.href}>
                                <span className="absolute -inset-px rounded-xl" />
                                {section.title}
                              </a>
                            </h2>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section
              id="introduction"
              aria-label="Introduction"
              className="py-8 sm:pb-20 md:py-16 lg:py-20"
            >
              <div className="mx-auto text-lg tracking-tight text-zinc-700 md:max-w-3xl lg:max-w-4xl lg:px-12 dark:text-zinc-400">
                <p className="font-display text-left text-2xl font-bold tracking-tight text-zinc-900 xs:text-3xl md:text-4xl dark:text-white">
                  What makes this approach different
                </p>
                <p className="mt-4 text-left text-zinc-500 dark:text-zinc-300">
                  I built this platform to address what I found lacking in my
                  own interview preparation journey. The curriculum covers both
                  data structures & algorithms and advanced JavaScript concepts
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
                      Practical insights from experience - Each lesson includes
                      real-world examples and common pitfalls I’ve encountered
                      in my own development and interviewing journey.
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
                      Interview-focused approach - Content is designed with
                      technical interviews in mind, helping you explain complex
                      concepts clearly and showcase your skills effectively.
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
                      Learn from mistakes - I’ve documented common errors that
                      trip up candidates, helping you avoid these same pitfalls
                      during your interviews.
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
                      Practical application context - Understand not just how
                      algorithms and JavaScript features work, but when and why
                      to apply them in actual development scenarios.
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
                      Beyond the basics - Covering advanced topics from
                      sophisticated algorithms to modern JavaScript patterns and
                      TypeScript features that most courses overlook.
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </article>
        </div>
      </div>
      <div className="relative flex w-full flex-auto justify-center bg-zinc-800 sm:px-2 lg:px-8 xl:px-12">
        <div className="min-w-0 max-w-3xl flex-auto px-4 py-16 lg:max-w-none xl:px-16">
          <article>
            <header className="mb-9 space-y-1">
              <h2 className="font-display text-center text-2xl text-white xs:text-3xl md:text-4xl">
                Modern Technical Interviews Require Both Skills
              </h2>
            </header>
            <div>
              <p className="mt-3 text-center text-zinc-300 dark:text-zinc-300">
                Whether you’re interviewing at tech giants or growing startups,
                you’ll need to demonstrate both algorithmic problem-solving
                abilities and deep JavaScript knowledge. This platform helps you
                master both aspects, preparing you for the complete interview
                experience at companies like:
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
          <article className="flex w-full flex-col items-center gap-4 md:flex-row md:gap-8">
            <div
              className="relative w-full max-w-[400px] flex-shrink-0 rounded-2xl"
              style={{ aspectRatio: '1210 / 1250' }}
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
                Access over 450 diverse practice problems and questions. Each
                problem is categorized by topic and aligned with the lessons,
                ensuring targeted and effective practice.
              </p>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                Problems range from beginner to advanced levels, helping you
                build and strengthen your skills progressively.
              </p>
              <p className="mb-4 text-lg text-zinc-500 dark:text-zinc-300">
                Regular practice reinforces concepts, improves problem-solving
                skills, and boosts your confidence for technical interviews.
              </p>
            </div>
          </article>
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12">
        <div className="flex min-w-0 max-w-3xl flex-auto flex-row-reverse items-center px-4 py-8 md:py-16 lg:max-w-none xl:px-16">
          <article className="flex w-full flex-col items-center gap-6 md:flex-row-reverse md:gap-8">
            <div
              className="relative w-full max-w-[400px] flex-shrink-0 rounded-2xl"
              style={{ aspectRatio: '1302 / 1696' }}
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
                href="mailto:support@memoized.io"
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
                    Why these two tracks?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Modern technical interviews require both strong algorithmic
                    problem-solving skills and deep JavaScript knowledge. These
                    tracks help you master both aspects, preparing you for
                    everything from coding challenges to in-depth JavaScript
                    discussions.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    Which track should I focus on?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    You can study both tracks or focus on one based on your
                    interview timeline. The DSA track is crucial for coding
                    interviews, while the JS track helps you master JavaScript
                    concepts and patterns that often come up in technical
                    discussions.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    How are the lessons structured?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Both tracks follow a natural progression: the DSA track
                    takes you from basic data structures through advanced
                    algorithms, while the JS track starts with JavaScript
                    mechanics and builds up to advanced patterns and TypeScript
                    features.
                  </p>
                </li>
              </ul>
            </li>
            <li>
              <ul role="list" className="space-y-10">
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What makes this platform different?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Most platforms focus on either algorithms or JavaScript, but
                    rarely both. I’ve designed this platform to cover both
                    aspects comprehensively, with all content specifically
                    tailored for JavaScript developers. Plus, it reflects my
                    real-world experience with both giving and taking technical
                    interviews.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What does Premium include?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Premium gives you full access to both tracks, including all
                    practice problems, deep-dives into JavaScript internals,
                    advanced TypeScript features, and algorithm implementations.
                    You’ll also get access to all future updates and content.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What knowledge do I need to start?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Basic JavaScript familiarity is helpful but not required.
                    Both tracks start from fundamentals and gradually progress
                    to advanced topics. I’ve included resources to help you get
                    up to speed where needed.
                  </p>
                </li>
              </ul>
            </li>
            <li>
              <ul role="list" className="space-y-10">
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    What if I need help?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    You can reach out to me directly with any questions or if
                    you get stuck. As the creator and maintainer of this
                    platform, I’m committed to helping you succeed in your
                    interview preparation.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    Is the content practical?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Yes, each lesson includes hands-on challenges and real-world
                    examples. You’ll work through actual coding problems and
                    learn how to apply JavaScript patterns in practical
                    scenarios.
                  </p>
                </li>
                <li>
                  <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
                    Can I track my progress?
                  </h3>
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-300">
                    Yes, you can track your progress through both tracks
                    independently. This helps you stay organized and ensures
                    you’re making steady progress toward your interview
                    preparation goals.
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
        <div className="relative mx-auto max-w-5xl px-4 pb-8 pt-16 sm:px-6 md:px-12">
          <div className="sm:rounded-6xl rounded-3xl bg-zinc-800 pt-px">
            <div className="relative mx-auto -mt-16 h-44 w-44 overflow-hidden rounded-full bg-zinc-400 md:float-right md:ml-[96px] md:h-64 md:w-64 md:[shape-outside:circle(40%)] lg:mr-20 lg:h-72 lg:w-72">
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
                After spending years interviewing candidates and mentoring
                developers, I noticed a gap in how engineers prepare for
                technical interviews. Most platforms focus on either algorithms
                or JavaScript concepts, but rarely both. That’s why I created
                this platform.
              </p>
              <p className="mt-4 text-lg tracking-tight text-zinc-300">
                Through my experience both giving and taking technical
                interviews, I’ve learned what makes candidates successful. I’ve
                structured this platform to focus on what actually matters:
                strong algorithmic thinking and deep JavaScript knowledge.
              </p>
              <p className="mt-4 text-lg tracking-tight text-zinc-300">
                Whether you’re preparing for your next interview or simply want
                to deepen your understanding of algorithms and JavaScript, I’m
                here to help you succeed. This isn’t just another course
                platform — it’s the resource I wish I had when I was preparing
                for interviews.
              </p>
              <p className="mt-8 flex flex-wrap items-center gap-8">
                <a
                  className="inline-flex items-center text-base font-medium tracking-tight text-white"
                  href="https://github.com/msiric"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaGithub size="40px" />
                  <span className="ml-4">GitHub</span>
                </a>
                <a
                  className="inline-flex items-center text-base font-medium tracking-tight text-white"
                  href="mailto:support@memoized.io"
                >
                  <MdOutlineAlternateEmail size="40px" />
                  <span className="ml-4">Contact</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
