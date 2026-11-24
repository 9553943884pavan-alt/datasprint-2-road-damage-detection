import React, { useRef } from "react"
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react"

import { cn } from "@/lib/utils"

export function MovingBorder({
  children,
  duration = 2800,
  rx = "30%",
  ry = "30%",
}: {
  children: React.ReactNode
  duration?: number
  rx?: string
  ry?: string
}) {
  const pathRef = useRef<SVGRectElement>(null)
  const progress = useMotionValue<number>(0)

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength?.()
    if (length && length > 0) {
      const pxPerMillisecond = length / duration
      progress.set((time * pxPerMillisecond) % length)
    }
  })

  const x = useTransform(progress, (val) => {
    try {
      return pathRef.current?.getPointAtLength(val).x ?? 0
    } catch {
      return 0
    }
  })
  const y = useTransform(progress, (val) => {
    try {
      return pathRef.current?.getPointAtLength(val).y ?? 0
    } catch {
      return 0
    }
  })

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="pointer-events-none absolute h-full w-full"
        width="100%"
        height="100%"
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  )
}

export function MovingBorderPill({
  borderRadius = "9999px",
  children,
  containerClassName,
  borderClassName,
  duration = 3200,
  className,
}: {
  borderRadius?: string
  children: React.ReactNode
  containerClassName?: string
  borderClassName?: string
  duration?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden p-[1px]",
        containerClassName
      )}
      style={{ borderRadius }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={duration} rx="50%" ry="50%">
          <div
            className={cn(
              "h-14 w-14 bg-[radial-gradient(#10b981_40%,transparent_60%)] opacity-85",
              borderClassName
            )}
          />
        </MovingBorder>
      </div>
      <div
        className={cn(
          "relative flex items-center gap-2 border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-md",
          className
        )}
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        {children}
      </div>
    </div>
  )
}
