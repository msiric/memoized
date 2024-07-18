import { useTheme } from 'next-themes'
import { CustomContentProps, SnackbarContent } from 'notistack'
import { forwardRef } from 'react'
import { IoIosCheckmarkCircleOutline } from 'react-icons/io'
import { VscError } from 'react-icons/vsc'

export const SnackbarNotification = forwardRef<
  HTMLDivElement,
  CustomContentProps
>((props, ref) => {
  const { id, message, variant, ...other } = props

  const { resolvedTheme } = useTheme()

  return (
    <SnackbarContent
      ref={ref}
      role="alert"
      {...other}
      className={`rounded p-4 shadow-lg ${resolvedTheme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-900'} flex items-center text-sm text-white`}
    >
      {variant === 'success' && (
        <IoIosCheckmarkCircleOutline size={24} className="mr-2 fill-lime-600" />
      )}
      {variant === 'error' && (
        <VscError size={24} className="mr-2 fill-red-700" />
      )}
      {message}
    </SnackbarContent>
  )
})

SnackbarNotification.displayName = 'SnackbarNotification'
