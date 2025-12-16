import { Logo } from '@/components/Logo'
import { GitHubIcon } from './icons'

export const LandingHeader = () => {
  return (
    <header className="sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-white/90 px-4 py-6 shadow-sm shadow-zinc-900/5 backdrop-blur-md transition-all duration-500 sm:px-6 lg:px-8 dark:bg-zinc-900/90 dark:shadow-none dark:backdrop-blur-md">
      <div className="relative flex flex-grow basis-0 items-center">
        <a 
          aria-label="Home page" 
          href="/"
          className="group flex items-center transition-transform duration-200 hover:scale-105"
        >
          <Logo className="h-6 sm:h-7 lg:h-8 transition-all duration-200 group-hover:opacity-80" />
        </a>
      </div>
      
      <div className="relative flex basis-0 items-center justify-end gap-6 md:flex-grow">
        <a
          className="group flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 transition-all duration-200 hover:bg-zinc-200 hover:scale-105 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          aria-label="GitHub"
          href="https://github.com/msiric"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitHubIcon
            aria-hidden="true"
            className="h-5 w-5 fill-zinc-700 transition-colors duration-200 group-hover:fill-zinc-900 dark:fill-zinc-300 dark:group-hover:fill-zinc-100"
          />
        </a>
      </div>
    </header>
  )
}
