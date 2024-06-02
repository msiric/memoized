import { useProgressStore } from '@/contexts/progress'
import clsx from 'clsx'
import { signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export const UserDropdown = ({ isMobile = false }) => {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  const currentProgress = useProgressStore((state) => state.currentProgress)

  const profileRef = useRef<HTMLButtonElement>(null)

  const user = session?.user

  const formattedProgress = `${currentProgress.toFixed(2)}%`

  useEffect(() => {
    const handleDropDown = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', handleDropDown)
  }, [])

  return (
    <>
      {isMobile ? (
        <button
          ref={profileRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-white duration-150 hover:text-lime-400 active:text-lime-400"
        >
          <Image
            alt="Avatar"
            className="rounded-full"
            src={user?.image ?? ''}
            height="24"
            width="24"
          />
          {user?.name ?? ''}
        </button>
      ) : (
        <button
          ref={profileRef}
          className={
            'flex rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300 md:me-0 dark:focus:ring-gray-600'
          }
          type="button"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">Open user menu</span>
          <Image
            alt="Avatar"
            className="rounded-full"
            src={user?.image ?? ''}
            height="32"
            width="32"
          />
        </button>
      )}

      <div
        className={clsx(
          'w-50 absolute right-2 top-[64px] z-10 divide-y divide-gray-300 rounded-lg bg-zinc-100 shadow dark:divide-gray-600 dark:bg-zinc-700',
          open ? '' : 'hidden',
          isMobile ? '-top-[228px] bottom-10 left-0 w-full' : '',
        )}
      >
        <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
          <div className="truncate font-bold">{user?.name ?? ''}</div>
          <div className="truncate font-medium">{user?.email ?? ''}</div>
        </div>
        <div className="py-2">
          <div className="flex gap-1 px-4">
            <p className="block text-sm font-medium">Progress</p>
            <p className="font-sm block text-xs">({formattedProgress})</p>
          </div>
          <div className="block h-2.5 w-full rounded-full px-4 dark:bg-zinc-700">
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-500 dark:bg-white">
              <div
                className="h-1.5 bg-lime-500 dark:bg-lime-600"
                style={{ width: formattedProgress }}
              />
            </div>
          </div>
        </div>
        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
          <li>
            <a
              href="#"
              className="block px-4 py-2 hover:bg-gray-200 dark:hover:bg-zinc-600 dark:hover:text-white"
            >
              Settings
            </a>
          </li>
          <li>
            <button
              onClick={() => signOut()}
              className="block w-full px-4 py-2 text-left hover:bg-gray-200 dark:hover:bg-zinc-600 dark:hover:text-white"
            >
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}
