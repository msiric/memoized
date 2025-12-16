'use client'

import { motion } from 'framer-motion'
import { LogoIcon } from './Logo'

export type LogoSpinnerProps = {
  text?: string
}

export const LogoSpinner = ({ text }: LogoSpinnerProps) => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-4">
      <motion.div
        className="text-primary h-10 w-10"
        style={{
          transformOrigin: '50% 65%',
        }}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <LogoIcon className="h-full w-full" />
      </motion.div>
      {text && (
        <p className="font-light text-gray-500 md:text-lg dark:text-gray-400">
          {text}
        </p>
      )}
    </div>
  )
}
