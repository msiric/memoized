'use client'
import { useEffect, useState, useCallback, useMemo, memo } from 'react'

interface CountdownTimerProps {
  expiresAt: number
  onExpire?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface TimeUnit {
  value: number
  label: string
}

const TIME_CONSTANTS = {
  MILLISECONDS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  EXPIRED_DISPLAY_DURATION: 500,
  ANIMATION_DELAY_INCREMENT: 50,
  MESSAGE_ANIMATION_DELAY: 200,
} as const

const TimeUnitDisplay = memo<{
  unit: TimeUnit
  index: number
  animationClass: string
  isExpiredHiding?: boolean
}>(({ unit, index, animationClass, isExpiredHiding = false }) => (
  <div
    className={`${animationClass} relative overflow-hidden rounded-lg bg-zinc-50 p-1.5 sm:p-2 ring-1 ring-zinc-200/50 dark:bg-zinc-800/50 dark:ring-zinc-700`}
    style={{
      animationDelay: `${index * TIME_CONSTANTS.ANIMATION_DELAY_INCREMENT}ms`,
    }}
  >
    <div
      className="text-xs sm:text-sm lg:text-base font-bold text-zinc-900 dark:text-white"
      aria-live="polite"
    >
      {isExpiredHiding ? '00' : unit.value.toString().padStart(2, '0')}
    </div>
    <div className="text-[10px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-400">{unit.label}</div>
  </div>
))

TimeUnitDisplay.displayName = 'TimeUnitDisplay'

const OfferMessage = memo<{ shouldDelay?: boolean }>(
  ({ shouldDelay = false }) => (
    <div
      className="animate-fade-in mt-3 flex flex-col items-center gap-2"
      style={{
        animationDelay: shouldDelay
          ? `${TIME_CONSTANTS.MESSAGE_ANIMATION_DELAY}ms`
          : '0ms',
      }}
    >
      <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
        <svg
          className="h-3 w-3 animate-pulse text-lime-600 dark:text-lime-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
            clipRule="evenodd"
          />
        </svg>
        Offer ends when timer reaches zero
      </div>
    </div>
  ),
)

OfferMessage.displayName = 'OfferMessage'

export const CountdownTimer = memo<CountdownTimerProps>(
  ({ expiresAt, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
    const [hasExpired, setHasExpired] = useState(false)
    const [isHiding, setIsHiding] = useState(false)
    const [isFullyHidden, setIsFullyHidden] = useState(false)

    const calculateTimeLeft = useCallback((): TimeLeft | null => {
      const now = Date.now()
      const difference = expiresAt - now

      if (difference <= 0) {
        return null
      }

      const {
        MILLISECONDS_IN_SECOND,
        SECONDS_IN_MINUTE,
        MINUTES_IN_HOUR,
        HOURS_IN_DAY,
      } = TIME_CONSTANTS

      return {
        days: Math.floor(
          difference /
            (MILLISECONDS_IN_SECOND *
              SECONDS_IN_MINUTE *
              MINUTES_IN_HOUR *
              HOURS_IN_DAY),
        ),
        hours: Math.floor(
          (difference /
            (MILLISECONDS_IN_SECOND * SECONDS_IN_MINUTE * MINUTES_IN_HOUR)) %
            HOURS_IN_DAY,
        ),
        minutes: Math.floor(
          (difference / (MILLISECONDS_IN_SECOND * SECONDS_IN_MINUTE)) %
            SECONDS_IN_MINUTE,
        ),
        seconds: Math.floor(
          (difference / MILLISECONDS_IN_SECOND) % SECONDS_IN_MINUTE,
        ),
      }
    }, [expiresAt])

    const handleExpiration = useCallback(() => {
      setHasExpired(true)
      onExpire?.()

      const hideTimer = setTimeout(() => {
        setIsHiding(true)
      }, TIME_CONSTANTS.EXPIRED_DISPLAY_DURATION)

      return () => clearTimeout(hideTimer)
    }, [onExpire])

    useEffect(() => {
      const initialTimeLeft = calculateTimeLeft()

      if (!initialTimeLeft) {
        // Timer already expired - don't show anything
        return
      }

      setTimeLeft(initialTimeLeft)

      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeLeft()

        if (!newTimeLeft) {
          clearInterval(timer)
          handleExpiration()
          return
        }

        setTimeLeft(newTimeLeft)
      }, TIME_CONSTANTS.MILLISECONDS_IN_SECOND)

      return () => clearInterval(timer)
    }, [expiresAt, calculateTimeLeft, handleExpiration])

    const timeUnits = useMemo((): TimeUnit[] => {
      if (hasExpired) {
        return [
          { value: 0, label: 'Days' },
          { value: 0, label: 'Hours' },
          { value: 0, label: 'Minutes' },
          { value: 0, label: 'Seconds' },
        ]
      }

      if (!timeLeft) {
        return []
      }

      return [
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hours' },
        { value: timeLeft.minutes, label: 'Minutes' },
        { value: timeLeft.seconds, label: 'Seconds' },
      ]
    }, [timeLeft, hasExpired])

    if (isFullyHidden) {
      return null
    }

    if (hasExpired && isHiding) {
      return (
        <div
          className="animate-fade-out mt-4"
          onAnimationEnd={() => setIsFullyHidden(true)}
        >
          <div className="mx-auto grid max-w-xs grid-cols-4 gap-0.5 sm:gap-1">
            {timeUnits.map((unit, index) => (
              <TimeUnitDisplay
                key={unit.label}
                unit={unit}
                index={index}
                animationClass="animate-slide-down"
                isExpiredHiding
              />
            ))}
          </div>
        </div>
      )
    }

    if (!timeLeft && !hasExpired) {
      return null
    }

    return (
      <div className="animate-fade-in mt-2">
        <div
          className="mx-auto grid max-w-xs grid-cols-4 gap-1"
          role="timer"
          aria-label={`Time remaining: ${timeUnits.map((u) => `${u.value} ${u.label.toLowerCase()}`).join(', ')}`}
        >
          {timeUnits.map((unit, index) => (
            <TimeUnitDisplay
              key={unit.label}
              unit={unit}
              index={index}
              animationClass="animate-slide-up"
            />
          ))}
        </div>

        <OfferMessage shouldDelay={hasExpired} />
      </div>
    )
  },
)

CountdownTimer.displayName = 'CountdownTimer'
