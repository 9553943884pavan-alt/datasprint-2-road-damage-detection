import React from "react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const BEAM_PATHS = [
  "M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875",
  "M-310 -221C-310 -221 -242 184 222 311C686 438 754 843 754 843",
  "M-240 -253C-240 -253 -172 152 292 279C756 406 824 811 824 811",
  "M-170 -285C-170 -285 -102 120 362 247C826 374 894 779 894 779",
  "M-100 -317C-100 -317 -32 88 432 215C896 342 964 747 964 747",
  "M-30 -349C-30 -349 38 56 502 183C966 310 1034 715 1034 715",
  "M40 -381C40 -381 108 24 572 151C1036 278 1104 683 1104 683",
  "M110 -413C110 -413 178 -8 642 119C1106 246 1174 651 1174 651",
  "M180 -445C180 -445 248 -40 712 87C1176 214 1244 619 1244 619",
  "M250 -477C250 -477 318 -72 782 55C1246 182 1314 587 1314 587",
]

export const BackgroundBeams = React.memo(function BackgroundBeams({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden [mask-repeat:no-repeat] [mask-size:40px]",
        className
      )}
    >
      <svg
        className="pointer-events-none absolute z-0 h-full w-full"
        width="100%"
        height="100%"
        viewBox="0 0 696 316"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={BEAM_PATHS[0]}
          stroke="url(#beam-static)"
          strokeOpacity="0.06"
          strokeWidth="0.5"
        />
        {BEAM_PATHS.map((d, index) => (
          <g key={d}>
            <path d={d} stroke="currentColor" strokeOpacity="0.04" strokeWidth="0.5" />
            <motion.path
              d={d}
              stroke={`url(#beam-grad-${index % 3})`}
              strokeWidth="0.7"
              strokeLinecap="round"
              initial={{ pathLength: 0.15, pathOffset: 0 }}
              animate={{ pathOffset: [0, 1] }}
              transition={{
                duration: 8 + (index % 4) * 2.5,
                repeat: Infinity,
                ease: "linear",
                delay: index * 0.45,
              }}
            />
          </g>
        ))}
        <defs>
          <linearGradient id="beam-static" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-grad-0" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
})
