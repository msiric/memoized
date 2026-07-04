import { Footer } from '@/components/Footer'
import { getUnifiedBanners } from '@/services/banner'
import { highlightCode } from '@/utils/helpers'
import dynamic from 'next/dynamic'
import { ContentOverview } from '../components/ContentOverview'
import { FreeOfferingHighlight } from '../components/FreeOfferingHighlight'

// Revalidate hourly for Stripe coupon changes.
// Database banners are invalidated on-demand via revalidateBanners().
export const revalidate = 3600

const TopBanner = dynamic(
  () => import('../components/TopBanner').then((mod) => mod.TopBanner),
  {
    ssr: true,
  },
)
const LandingHeader = dynamic(
  () =>
    import('../components/LandingHeader').then(
      (mod) => mod.LandingHeader,
    ),
  {
    ssr: true,
  },
)
const CallToAction = dynamic(
  () =>
    import('../components/CallToAction').then(
      (mod) => mod.CallToAction,
    ),
  {
    ssr: true,
  },
)
const CompanyLogos = dynamic(
  () =>
    import('../components/CompanyLogos').then(
      (mod) => mod.CompanyLogos,
    ),
  {
    ssr: true,
  },
)
const TrackProgress = dynamic(
  () =>
    import('../components/TrackProgress').then(
      (mod) => mod.TrackProgress,
    ),
  {
    ssr: true,
  },
)
const SolveProblems = dynamic(
  () =>
    import('../components/SolveProblems').then(
      (mod) => mod.SolveProblems,
    ),
  {
    ssr: true,
  },
)
const CreatorIntro = dynamic(
  () =>
    import('../components/CreatorIntro').then(
      (mod) => mod.CreatorIntro,
    ),
  {
    ssr: true,
  },
)

const EXTENSION = 'js'

const CODE_SNIPPETS = [
  {
    code: `function debounce(fn, delay) {
  let timeoutId;
  function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  }
  debounced.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}`,
    tab: `debounce.${EXTENSION}`,
  },
  {
    code: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor(
      (left + right) / 2,
    );
    if (arr[mid] === target) return mid;
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
    code: `function curry(fn) {
  return function curried(...args) {
    const enough =
      args.length >= fn.length;
    if (enough) {
      return fn.apply(this, args);
    }
    return function (...rest) {
      return curried.apply(this, [
        ...args,
        ...rest,
      ]);
    };
  };
}`,
    tab: `curry.${EXTENSION}`,
  },
  {
    code: `function deepClone(value) {
  const isObject =
    value !== null &&
    typeof value === 'object';
  if (!isObject) return value;
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  const clone = {};
  for (const key of Object.keys(value)) {
    clone[key] = deepClone(value[key]);
  }

  return clone;
}`,
    tab: `deep-clone.${EXTENSION}`,
  },
  {
    code: `function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const prev = result[result.length - 1];
    const curr = intervals[i];
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
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [];
  const right = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }
  const l = quickSort(left);
  return [...l, pivot, ...quickSort(right)];
}`,
    tab: `quick-sort.${EXTENSION}`,
  },
  {
    code: `function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let done = 0;
    if (!promises.length) resolve(results);
    promises.forEach((promise, i) => {
      Promise.resolve(promise).then((value) => {
        results[i] = value;
        if (++done === promises.length) {
          resolve(results);
        }
      }, reject);
    });
  });
}`,
    tab: `promise-all.${EXTENSION}`,
  },
  {
    code: `function validParentheses(s) {
  const stack = [];
  const pairs = { '(': ')', '{': '}', '[': ']' };
  for (const char of s) {
    if (pairs[char]) {
      stack.push(char);
    } else {
      const open = stack.pop();
      if (char !== pairs[open]) {
        return false;
      }
    }
  }
  return stack.length === 0;
}`,
    tab: `valid-parentheses.${EXTENSION}`,
  },
]

export default async function Home() {
  const [unifiedBanners, initialSnippet] = await Promise.all([
    getUnifiedBanners(),
    highlightCode(CODE_SNIPPETS[0].code),
  ])

  return (
    <div className="flex w-full flex-col">
      {unifiedBanners.map((banner) => (
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
          countdownTo={banner.countdownTo}
          discountPercent={banner.discountPercent}
        />
      ))}

      <LandingHeader />

      <CallToAction
        codeSnippets={CODE_SNIPPETS}
        initialSnippet={initialSnippet}
      />

      <ContentOverview />

      <FreeOfferingHighlight />

      <CompanyLogos />

      <SolveProblems />

      <TrackProgress />

      <CreatorIntro />

      <Footer />
    </div>
  )
}
