import React, { useEffect, useState } from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT"

interface HoverBorderGradientProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
  containerClassName?: string
  className?: string
  duration?: number
  clockwise?: boolean
  children: React.ReactNode
}

const MOVING_MAP: Record<Direction, string> = {
  TOP: "radial-gradient(20.7% 50% at 50% 0%, #f59e0b 0%, rgba(245, 158, 11, 0) 100%)",
  LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, #38bdf8 0%, rgba(56, 189, 248, 0) 100%)",
  BOTTOM: "radial-gradient(20.7% 50% at 50% 100%, #10b981 0%, rgba(16, 185, 129, 0) 100%)",
  RIGHT: "radial-gradient(16.2% 41.2% at 100% 50%, #f59e0b 0%, rgba(245, 158, 11, 0) 100%)",
}

const HIGHLIGHT =
  "radial-gradient(75% 181.16% at 50% 50%, rgba(245, 158, 11, 0.85) 0%, rgba(56, 189, 248, 0.25) 60%, rgba(255, 255, 255, 0) 100%)"

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = "div",
  duration = 1.4,
  clockwise = true,
  ...props
}: HoverBorderGradientProps) {
  const [hovered, setHovered] = useState(false)
  const [direction, setDirection] = useState<Direction>("TOP")

  useEffect(() => {
    if (hovered) return
    const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"]
    const interval = setInterval(() => {
      setDirection((prev) => {
        const idx = directions.indexOf(prev)
        const nextIdx = clockwise
          ? (idx - 1 + directions.length) % directions.length
          : (idx + 1) % directions.length
        return directions[nextIdx]
      })
    }, duration * 1000)
    return () => clearInterval(interval)
  }, [hovered, duration, clockwise])

  return (
    <Tag
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex rounded-2xl border border-border/80 bg-card/70 content-center items-center justify-center overflow-visible p-px transition duration-500",
        containerClassName
      )}
      {...props}
    >
      <div
        className={cn(
          "relative z-10 w-full rounded-[inherit] bg-card text-card-foreground",
          className
        )}
      >
        {children}
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
        style={{ filter: "blur(2px)" }}
        initial={{ background: MOVING_MAP[direction] }}
        animate={{
          background: hovered
            ? [MOVING_MAP[direction], HIGHLIGHT]
            : MOVING_MAP[direction],
        }}
        transition={{ ease: "linear", duration }}
      />
      <div className="pointer-events-none absolute inset-[2px] z-[1] flex-none rounded-[calc(1rem-2px)] bg-card" />
    </Tag>
  )
}
