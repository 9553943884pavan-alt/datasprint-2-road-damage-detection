import React from "react"

import { cn } from "@/lib/utils"

export function BentoGrid({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto grid grid-cols-1 gap-4 md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  )
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string
  title?: string | React.ReactNode
  description?: string | React.ReactNode
  header?: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-border bg-card/90 p-5 shadow-xs transition duration-200 hover:border-amber-500/40 hover:shadow-md",
        className
      )}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-0.5">
        <div className="mb-1.5 flex items-center gap-2">
          {icon}
          <div className="font-display text-sm font-semibold text-foreground">
            {title}
          </div>
        </div>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  )
}
