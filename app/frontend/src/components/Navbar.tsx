import { Cpu, ExternalLink, Github, Moon, ShieldAlert, Sun } from "lucide-react"

import { MovingBorderPill } from "@/components/aceternity/moving-border"
import { Button } from "@/components/ui/button"
import type { HealthResponse } from "@/lib/api"

interface NavbarProps {
  health: HealthResponse | null
  healthError: string | null
  isDark: boolean
  onToggleTheme: () => void
}

const GITHUB_URL = "https://github.com/9553943884pavan-alt/datasprint-2-road-damage-detection"
const KAGGLE_URL =
  "https://www.kaggle.com/code/pavankumar9938/datasprint-2-0-v3-yolo26m-inference-t4-benchmark"

export function Navbar({
  health,
  healthError,
  isDark,
  onToggleTheme,
}: NavbarProps) {
  const isOnline = Boolean(health?.model_loaded)
  const shortSha = health?.weights_sha256 ? health.weights_sha256.slice(0, 8) : "9f9fd2b5"
  const shortGpu = health?.device_name
    .replace("NVIDIA GeForce ", "")
    .replace(" Laptop GPU", "")
  const deviceLabel = health
    ? health.device.startsWith("cuda")
      ? `CUDA · ${shortGpu}`
      : "CPU Inference"
    : healthError
      ? "Backend Offline"
      : "Warming Model…"

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-500 shadow-xs">
            <ShieldAlert className="size-5" />
          </div>
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold tracking-tight text-foreground">
                RoadGuard AI
              </span>
              <span className="hidden rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-amber-500 uppercase xl:inline-block">
                DataSprint 2.0 · #1 LB
              </span>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              YOLO26m Pavement Distress Console
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <MovingBorderPill
            borderClassName={
              isOnline
                ? "bg-[radial-gradient(#10b981_40%,transparent_60%)]"
                : "bg-[radial-gradient(#f59e0b_40%,transparent_60%)]"
            }
            containerClassName="hidden lg:block shrink-0"
            className="whitespace-nowrap"
          >
            <span
              className={`size-2 rounded-full ${
                isOnline
                  ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            <Cpu className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px]">{deviceLabel}</span>
            <span className="text-border">|</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              best.pt · {shortSha}
            </span>
          </MovingBorderPill>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="hidden sm:inline-flex gap-1.5 border-border/80"
          >
            <a href={KAGGLE_URL} target="_blank" rel="noreferrer">
              Kaggle Notebook
              <ExternalLink className="size-3.5" />
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1.5 border-border/80"
          >
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github className="size-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="border border-border/60"
          >
            {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
