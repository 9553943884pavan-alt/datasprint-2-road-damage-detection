import { useState } from "react"
import {
  Check,
  Columns2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileJson,
  Loader2,
  ScanSearch,
} from "lucide-react"

import { BorderBeam } from "@/components/magicui/border-beam"
import { Button } from "@/components/ui/button"
import type { Detection } from "@/lib/api"
import { formatPredictionString } from "@/lib/api"

type ViewMode = "annotated" | "original" | "split"

interface DetectionCanvasProps {
  imageUrl: string | null
  filename: string
  imageWidth: number
  imageHeight: number
  detections: Detection[]
  showLabels: boolean
  highlightedId: string | null
  onSelectDetection: (id: string | null) => void
  isLoading: boolean
  latencyMs: number | null
  fps: number | null
}

export function DetectionCanvas({
  imageUrl,
  filename,
  imageWidth,
  imageHeight,
  detections,
  showLabels,
  highlightedId,
  onSelectDetection,
  isLoading,
  latencyMs,
  fps,
}: DetectionCanvasProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("annotated")
  const [splitPct, setSplitPct] = useState(54)
  const [copiedType, setCopiedType] = useState<"json" | "kaggle" | null>(null)

  const handleCopy = async (kind: "json" | "kaggle") => {
    const payload =
      kind === "json"
        ? JSON.stringify(
            {
              filename,
              width: imageWidth,
              height: imageHeight,
              latency_ms: latencyMs,
              detections,
            },
            null,
            2
          )
        : formatPredictionString(detections)

    await navigator.clipboard.writeText(payload || "")
    setCopiedType(kind)
    setTimeout(() => setCopiedType(null), 1800)
  }

  const handleDownloadAnnotatedPng = () => {
    if (!imageUrl) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const w = img.naturalWidth || imageWidth || 960
      const h = img.naturalHeight || imageHeight || 640
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(img, 0, 0, w, h)
      const strokeW = Math.max(2, Math.round(Math.min(w, h) / 260))
      const fontSize = Math.max(12, Math.round(Math.min(w, h) / 42))
      ctx.font = `600 ${fontSize}px JetBrains Mono, monospace`

      for (const det of detections) {
        const [x1, y1, x2, y2] = det.bbox
        ctx.strokeStyle = det.color
        ctx.lineWidth = strokeW
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

        if (showLabels) {
          const text = `${det.code} ${(det.score * 100).toFixed(0)}%`
          const padX = 6
          const textW = ctx.measureText(text).width + padX * 2
          const boxH = fontSize + 8
          const ly = Math.max(0, y1 - boxH)
          ctx.fillStyle = det.color
          ctx.fillRect(x1, ly, textW, boxH)
          ctx.fillStyle = "#090D16"
          ctx.fillText(text, x1 + padX, ly + fontSize)
        }
      }

      const link = document.createElement("a")
      const stem = filename.replace(/\.[^.]+$/, "") || "road_inspection"
      link.download = `${stem}_annotated.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    }
    img.src = imageUrl
  }

  const safeW = imageWidth || 960
  const safeH = imageHeight || 640

  const renderSvgOverlay = () => {
    if (viewMode === "original" || !imageUrl) return null

    return (
      <svg
        viewBox={`0 0 ${safeW} ${safeH}`}
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 size-full"
        style={
          viewMode === "split"
            ? { clipPath: `inset(0 0 0 ${splitPct}%)` }
            : undefined
        }
      >
        {detections.map((det) => {
          const [x1, y1, x2, y2] = det.bbox
          const bw = Math.max(1, x2 - x1)
          const bh = Math.max(1, y2 - y1)
          const isHighlighted = highlightedId === det.id
          const tag = `${det.code} ${Math.round(det.score * 100)}%`
          const fontSize = Math.max(11, Math.min(18, safeW / 58))
          const pillW = tag.length * fontSize * 0.62 + 12
          const pillH = fontSize + 7
          const pillY = Math.max(0, y1 - pillH)

          return (
            <g
              key={det.id}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => onSelectDetection(det.id)}
              onMouseLeave={() => onSelectDetection(null)}
            >
              <rect
                x={x1}
                y={y1}
                width={bw}
                height={bh}
                rx={4}
                fill={det.color}
                fillOpacity={isHighlighted ? 0.24 : 0.08}
                stroke={det.color}
                strokeWidth={isHighlighted ? Math.max(3, safeW / 210) : Math.max(2, safeW / 340)}
              />
              {showLabels ? (
                <>
                  <rect
                    x={x1}
                    y={pillY}
                    width={pillW}
                    height={pillH}
                    rx={3}
                    fill={det.color}
                  />
                  <text
                    x={x1 + 6}
                    y={pillY + fontSize + 1}
                    fill="#090D16"
                    fontSize={fontSize}
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {tag}
                  </text>
                </>
              ) : null}
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
          <Button
            type="button"
            variant={viewMode === "annotated" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("annotated")}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Eye className="size-3.5" />
            Annotated
          </Button>
          <Button
            type="button"
            variant={viewMode === "original" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("original")}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <EyeOff className="size-3.5" />
            Original
          </Button>
          <Button
            type="button"
            variant={viewMode === "split" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("split")}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Columns2 className="size-3.5" />
            Split Compare
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {latencyMs !== null ? (
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-mono text-[11px] font-medium text-emerald-400">
              {latencyMs.toFixed(1)} ms ({fps?.toFixed(0)} FPS)
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!imageUrl}
            onClick={() => void handleCopy("json")}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            {copiedType === "json" ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <FileJson className="size-3.5" />
            )}
            JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!imageUrl}
            onClick={() => void handleCopy("kaggle")}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            {copiedType === "kaggle" ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            PredictionString
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!imageUrl}
            onClick={handleDownloadAnnotatedPng}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            <Download className="size-3.5" />
            PNG
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950/90 shadow-lg">
        <BorderBeam
          size={110}
          duration={7}
          colorFrom="#f59e0b"
          colorTo="#38bdf8"
          borderWidth={1.5}
        />

        {imageUrl ? (
          <div className="relative flex w-full items-center justify-center bg-black/50 p-1">
            <div className="relative inline-block max-w-full overflow-hidden">
              <img
                src={imageUrl}
                alt={filename}
                className="block max-h-[540px] w-auto max-w-full select-none"
              />
              {renderSvgOverlay()}

              {viewMode === "split" ? (
                <>
                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-amber-400 shadow-[0_0_12px_#f59e0b]"
                    style={{ left: `${splitPct}%` }}
                  >
                    <div className="absolute top-3 -left-16 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">
                      Original
                    </div>
                    <div className="absolute top-3 left-2 rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                      YOLO26m
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={splitPct}
                    onChange={(e) => setSplitPct(Number(e.target.value))}
                    aria-label="Split compare slider"
                    className="absolute inset-0 size-full cursor-ew-resize opacity-0"
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[340px] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <ScanSearch className="size-10 text-amber-500/70" />
            <div className="space-y-1">
              <p className="font-display text-base font-semibold text-foreground">
                Ready for Road Surface Inspection
              </p>
              <p className="text-xs text-muted-foreground">
                Upload a road image, paste from clipboard (Ctrl+V), or click a demo preset below.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/70 backdrop-blur-xs">
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <span className="font-mono text-xs font-medium text-amber-200">
              Running YOLO26m 768px Inference…
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
