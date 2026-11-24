import { Activity, Award, Gauge, ShieldCheck, Sparkles } from "lucide-react"

import { BackgroundBeams } from "@/components/aceternity/background-beams"
import { Spotlight } from "@/components/aceternity/spotlight"
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text"
import { BlurFade } from "@/components/magicui/blur-fade"
import { DotPattern } from "@/components/magicui/dot-pattern"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { cn } from "@/lib/utils"
import type { BenchmarksData } from "@/lib/api"

interface HeroTelemetryProps {
  benchmarks: BenchmarksData
}

export function HeroTelemetry({ benchmarks }: HeroTelemetryProps) {
  const kpis = [
    {
      label: "Kaggle Public LB",
      value: benchmarks.public_lb,
      decimals: 5,
      suffix: "",
      sub: `#${benchmarks.public_rank} Overall · +${benchmarks.lead_over_second.toFixed(2)} pt lead`,
      icon: Award,
      accent: "text-amber-500",
    },
    {
      label: "Clean Val Competition",
      value: benchmarks.clean_val_score,
      decimals: 2,
      suffix: "/100",
      sub: `mAP@50 ${benchmarks.map50.toFixed(4)} · F1 ${benchmarks.f1.toFixed(4)}`,
      icon: ShieldCheck,
      accent: "text-emerald-500",
    },
    {
      label: "T4 Inference Latency",
      value: benchmarks.kaggle_t4_ms,
      decimals: 2,
      suffix: " ms",
      sub: `${benchmarks.kaggle_t4_fps.toFixed(1)} FPS · Speed 1.00 · ${benchmarks.vram_mb.toFixed(1)} MB VRAM`,
      icon: Gauge,
      accent: "text-sky-400",
    },
    {
      label: "Stress Robustness Gain",
      value: benchmarks.robustness_gain_vs_v2,
      decimals: 2,
      suffix: "×",
      sub: `${benchmarks.robustness_map50.toFixed(4)} mAP@50 on 2,150 perturbed images`,
      icon: Activity,
      accent: "text-rose-400",
    },
  ]

  return (
    <section className="relative overflow-hidden border-b border-border/70 bg-background py-8 sm:py-11">
      <Spotlight
        className="-top-32 left-0 md:-top-20 md:left-48"
        fill="#f59e0b"
      />
      <BackgroundBeams className="opacity-40" />
      <DotPattern
        width={24}
        height={24}
        cr={1}
        className={cn(
          "[mask-image:radial-gradient(650px_circle_at_center,white,transparent)]"
        )}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 backdrop-blur-xs">
              <Sparkles className="size-3.5 text-amber-500" />
              <AnimatedShinyText className="text-xs font-semibold tracking-wide">
                #1 Kaggle Public LB · 44.99750 · YOLO26m Final Demo
              </AnimatedShinyText>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.6rem] lg:leading-[1.12]">
              Real-Time Road Damage Inspection & Severity Triage
            </h1>

            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Powered by our competition-winning <span className="font-mono text-foreground">YOLO26m</span>{" "}
              model (<span className="font-mono text-foreground">768px · FP16 · Class-Aware NMS</span>) detecting{" "}
              <span className="font-medium text-amber-500">D00 Longitudinal</span>,{" "}
              <span className="font-medium text-sky-400">D10 Transverse</span>,{" "}
              <span className="font-medium text-rose-400">D20 Alligator</span>, and{" "}
              <span className="font-medium text-red-500">D40 Potholes</span> with instant client-side threshold tuning.
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((item, idx) => {
            const Icon = item.icon
            return (
              <BlurFade key={item.label} delay={idx * 0.06} inView>
                <div className="group relative h-full rounded-xl border border-border/80 bg-card/85 p-4 backdrop-blur-sm transition hover:border-amber-500/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {item.label}
                    </span>
                    <Icon className={cn("size-4", item.accent)} />
                  </div>
                  <div className="mt-2 flex items-baseline gap-1 font-display text-2xl font-bold tracking-tight text-foreground">
                    <NumberTicker
                      value={item.value}
                      decimalPlaces={item.decimals}
                      className="text-foreground dark:text-foreground"
                    />
                    {item.suffix ? (
                      <span className="text-base font-semibold text-muted-foreground">
                        {item.suffix}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {item.sub}
                  </p>
                </div>
              </BlurFade>
            )
          })}
        </div>
      </div>
    </section>
  )
}
