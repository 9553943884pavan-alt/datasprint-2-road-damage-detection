import { ArrowRight, CheckCircle2, Cpu, Database, ExternalLink, Server, Shield } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HealthResponse } from "@/lib/api"

interface ArchitectureSectionProps {
  health: HealthResponse | null
}

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Road Frame Ingestion",
    detail: "EXIF-normalized RGB image uploaded via FastAPI multipart endpoint or live webcam capture.",
  },
  {
    step: "02",
    title: "768px Letterbox Preprocess",
    detail: "RGB → BGR array passed to root inference.py preserving exact training geometry & scale.",
  },
  {
    step: "03",
    title: "YOLO26m FP16 Backbone",
    detail: "Single-pass 44.06 MB champion weights (Epoch 38) executed on CUDA FP16 / CPU.",
  },
  {
    step: "04",
    title: "Class-Aware NMS (IoU 0.60)",
    detail: "Non-agnostic NMS keeps co-occurring crack + pothole overlap without suppressing adjacent distress.",
  },
  {
    step: "05",
    title: "Severity Triage & Export",
    detail: "Client-side slider filters detections at 60 FPS and computes 0–100 Road Integrity & Kaggle CSV.",
  },
]

export function ArchitectureSection({ health }: ArchitectureSectionProps) {
  return (
    <div className="space-y-6">
      <Card className="py-5">
        <CardHeader className="px-5 py-0">
          <CardTitle className="flex items-center gap-2 font-display text-base font-semibold">
            <Server className="size-4 text-amber-500" />
            End-to-End Inference Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pt-4 pb-0">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {PIPELINE_STEPS.map((item, idx) => (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-xl border border-border/70 bg-background/50 p-3.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-500">
                      STAGE {item.step}
                    </span>
                    {idx < PIPELINE_STEPS.length - 1 ? (
                      <ArrowRight className="hidden size-3.5 text-muted-foreground md:block" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    )}
                  </div>
                  <h4 className="mt-2 font-display text-sm font-semibold text-foreground">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="py-5">
          <CardHeader className="px-5 py-0">
            <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold">
              <Cpu className="size-4 text-sky-400" />
              Live Backend Runtime Diagnostics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-5 pt-3 pb-0 font-mono text-xs">
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Architecture</span>
              <span className="text-foreground">{health?.architecture ?? "YOLO26m (Epoch 38)"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Execution Device</span>
              <span className="text-emerald-400">
                {health ? `${health.device.toUpperCase()} (${health.device_name})` : "Loading…"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Weights SHA-256</span>
              <span className="truncate max-w-[230px] text-foreground">
                {health?.weights_sha256 ?? "9f9fd2b5d5181875..."}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Model Size / Input</span>
              <span className="text-foreground">
                {health?.weights_size_mb ?? 42.02} MiB · {health?.imgsz ?? 768}px · IoU {health?.iou_nms ?? 0.6}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Runtime Stack</span>
              <span className="text-foreground">
                PyTorch {health?.torch_version ?? "2.6.0"} · Ultralytics {health?.ultralytics_version ?? "8.4"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="py-5">
          <CardHeader className="px-5 py-0">
            <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold">
              <Shield className="size-4 text-emerald-500" />
              Reproducibility & Public Artifacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pt-3 pb-0 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              This demo invokes our exact competition root{" "}
              <span className="font-mono text-foreground">inference.py</span> and{" "}
              <span className="font-mono text-foreground">weights/best.pt</span> contract with zero
              modification. Competition training/validation images remain private per DataSprint 2.0
              guidelines.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline" className="font-mono text-[11px]">
                <Database className="mr-1 size-3" />
                CC BY-NC 4.0 Weights Dataset
              </Badge>
              <Badge variant="outline" className="font-mono text-[11px]">
                Docker Multi-Stage Ready (Port 7860)
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <a
                  href="https://www.kaggle.com/datasets/pavankumar9938/datasprint2-v3-yolo26m-weights"
                  target="_blank"
                  rel="noreferrer"
                >
                  Kaggle Input Dataset
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                <a
                  href="https://www.kaggle.com/code/pavankumar9938/datasprint-2-0-v3-yolo26m-inference-t4-benchmark"
                  target="_blank"
                  rel="noreferrer"
                >
                  Kaggle #1 Submission Notebook
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
