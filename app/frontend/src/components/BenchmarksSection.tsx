import {
  BarChart3,
  CheckCircle2,
  Gauge,
  Layers,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"

import { BentoGrid, BentoGridItem } from "@/components/aceternity/bento-grid"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { BenchmarksData } from "@/lib/api"

interface BenchmarksSectionProps {
  benchmarks: BenchmarksData
}

export function BenchmarksSection({ benchmarks }: BenchmarksSectionProps) {
  const perClass = [
    { code: "D00", name: "Longitudinal Crack", ap50: 47.75, opt: "0.19", color: "#F59E0B" },
    { code: "D10", name: "Transverse Crack", ap50: 49.13, opt: "0.17 (+28.1% vs v2)", color: "#38BDF8" },
    { code: "D20", name: "Alligator Crack", ap50: 67.69, opt: "0.21", color: "#FB7185" },
    { code: "D40", name: "Pothole", ap50: 54.03, opt: "0.31", color: "#EF4444" },
  ]

  return (
    <BentoGrid className="md:grid-cols-3">
      {/* Item 1: Model Progression (2 cols) */}
      <BentoGridItem
        className="md:col-span-2"
        icon={<TrendingUp className="size-4 text-amber-500" />}
        title="Competition Trajectory: v2 Baseline → #1 Champion v3"
        description={`Ranked #${benchmarks.public_rank} on Kaggle Public Leaderboard (${benchmarks.public_lb.toFixed(5)}) with a +${benchmarks.lead_over_second.toFixed(2)} point lead over #2 and +18.17 pts over our initial v2 baseline.`}
        header={
          <div className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">v2 YOLO26s · 512px · Epoch 22</span>
              <span className="font-mono font-semibold text-muted-foreground">26.82890 LB</span>
            </div>
            <Progress value={54} className="h-2 opacity-60" />

            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-amber-400">
                v3 YOLO26m · 768px · Epoch 38 (Champion)
              </span>
              <span className="font-mono font-bold text-amber-400">44.99750 LB</span>
            </div>
            <Progress value={92} className="h-2.5" />

            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-[11px]">
              <div className="rounded-md border border-border/60 bg-card/70 p-2">
                <div className="text-muted-foreground">Clean Val</div>
                <div className="text-sm font-bold text-foreground">
                  {benchmarks.clean_val_score.toFixed(2)}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-card/70 p-2">
                <div className="text-muted-foreground">mAP@50</div>
                <div className="text-sm font-bold text-emerald-400">
                  {benchmarks.map50.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md border border-border/60 bg-card/70 p-2">
                <div className="text-muted-foreground">95% Bootstrap CI</div>
                <div className="text-sm font-bold text-foreground">
                  [{benchmarks.bootstrap_ci_low.toFixed(1)}, {benchmarks.bootstrap_ci_high.toFixed(1)}]
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Item 2: Speed & Footprint */}
      <BentoGridItem
        icon={<Gauge className="size-4 text-sky-400" />}
        title="Real-Time T4 Latency & VRAM"
        description="Official Kaggle T4 batch=1 benchmark verified across val (18.03 ms) and test (18.14 ms), hitting max Speed Score = 1.00."
        header={
          <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border/70 bg-background/50 p-3.5 font-mono">
            <div className="rounded-md border border-border/50 bg-card/60 p-2.5">
              <div className="text-[10px] text-muted-foreground">KAGGLE T4</div>
              <div className="mt-1 text-lg font-bold text-sky-400">
                {benchmarks.kaggle_t4_ms.toFixed(2)} ms
              </div>
              <div className="text-[10px] text-emerald-400">{benchmarks.kaggle_t4_fps} FPS</div>
            </div>
            <div className="rounded-md border border-border/50 bg-card/60 p-2.5">
              <div className="text-[10px] text-muted-foreground">VRAM FOOTPRINT</div>
              <div className="mt-1 text-lg font-bold text-foreground">
                {benchmarks.vram_mb.toFixed(1)} MB
              </div>
              <div className="text-[10px] text-muted-foreground">FP16 CUDA</div>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-400">
              <span>Competition Speed Bonus</span>
              <span className="font-bold">1.0000 / 1.00</span>
            </div>
          </div>
        }
      />

      {/* Item 3: Per-Class AP@50 */}
      <BentoGridItem
        icon={<BarChart3 className="size-4 text-amber-500" />}
        title="Per-Class AP@50 & Calibrated Optima"
        description="Higher 768px resolution unlocked D10 Transverse crack recall (+0.2813 AP@50 gain over v2) while lifting D20 Alligator to 0.6769."
        header={
          <div className="space-y-2.5 rounded-lg border border-border/70 bg-background/50 p-3.5">
            {perClass.map((cls) => (
              <div key={cls.code} className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="font-semibold text-foreground">{cls.code}</span>
                    <span className="text-muted-foreground">thr {cls.opt}</span>
                  </span>
                  <span className="font-bold text-foreground">{cls.ap50.toFixed(2)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${cls.ap50}%`, backgroundColor: cls.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        }
      />

      {/* Item 4: Cleanlab Audit & Robustness */}
      <BentoGridItem
        icon={<ShieldCheck className="size-4 text-emerald-500" />}
        title="Cleanlab ObjectLab & Drift Audit"
        description="500-bootstrap error analysis confirmed 0.9519 mean label quality and strong separation between clean and distressed frames."
        header={
          <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-border/70 bg-background/50 p-3.5 font-mono">
            <div className="rounded-md border border-border/60 bg-card/60 p-2.5">
              <div className="text-[10px] text-muted-foreground">CLEANLAB QUALITY</div>
              <div className="mt-1 text-lg font-bold text-emerald-400">
                {(benchmarks.cleanlab_quality * 100).toFixed(2)}%
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-card/60 p-2.5">
              <div className="text-[10px] text-muted-foreground">CLEAN VS DEFECT AUC</div>
              <div className="mt-1 text-lg font-bold text-amber-400">
                {benchmarks.clean_vs_defect_auc.toFixed(4)}
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-border/60 bg-card/60 px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">4-Bucket Stress mAP@50</span>
              <Badge variant="outline" className="font-mono text-emerald-400 border-emerald-500/40">
                {benchmarks.robustness_map50.toFixed(4)} ({benchmarks.robustness_gain_vs_v2}x vs v2)
              </Badge>
            </div>
          </div>
        }
      />

      {/* Item 5: Precision / Recall / Composite */}
      <BentoGridItem
        icon={<Layers className="size-4 text-rose-400" />}
        title="Operating Point & Final Proxy Score"
        description="Validated F1-optimal threshold (0.226) balances high municipal precision with multi-scale crack recall across 2,150 validation frames."
        header={
          <div className="space-y-2.5 rounded-lg border border-border/70 bg-background/50 p-3.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Precision @ 0.226</span>
              <span className="font-semibold text-foreground">
                {(benchmarks.precision * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recall @ 0.226</span>
              <span className="font-semibold text-foreground">
                {(benchmarks.recall * 100).toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Composite Proxy Score</span>
              <span className="font-bold text-amber-400">
                {benchmarks.composite_proxy.toFixed(2)} / 100
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>Reproducible on Kaggle T4 (v4 Complete)</span>
            </div>
          </div>
        }
      />
    </BentoGrid>
  )
}
