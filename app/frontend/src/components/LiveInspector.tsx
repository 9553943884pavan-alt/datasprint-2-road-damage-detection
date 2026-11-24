import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Minus,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Tag,
  UploadCloud,
  X,
} from "lucide-react"

import { HoverBorderGradient } from "@/components/aceternity/hover-border-gradient"
import { DetectionCanvas } from "@/components/DetectionCanvas"
import { AnimatedCircularProgressBar } from "@/components/magicui/animated-circular-progress-bar"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  apiUrl,
  CLASS_CONFIG,
  computeRoadTriage,
  type DamageCode,
  type PredictResponse,
  type SampleItem,
  predictImage,
} from "@/lib/api"

type ThresholdPreset = "f1_opt" | "per_class" | "high_prec" | "all" | "custom"

interface LiveInspectorProps {
  samples: SampleItem[]
}

const ALL_CLASSES: DamageCode[] = ["D00", "D10", "D20", "D40"]

const DEFAULT_PER_CLASS_THRESHOLDS: Record<DamageCode, number> = {
  D00: 0.19,
  D10: 0.17,
  D20: 0.21,
  D40: 0.31,
}

export function LiveInspector({ samples }: LiveInspectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null)

  const [threshold, setThreshold] = useState<number>(0.226)
  const [preset, setPreset] = useState<ThresholdPreset>("f1_opt")
  const [usePerClassOpt, setUsePerClassOpt] = useState<boolean>(false)
  const [perClassThresholds, setPerClassThresholds] = useState<
    Record<DamageCode, number>
  >(DEFAULT_PER_CLASS_THRESHOLDS)
  const [enabledClasses, setEnabledClasses] = useState<Record<DamageCode, boolean>>({
    D00: true,
    D10: true,
    D20: true,
    D40: true,
  })
  const [showLabels, setShowLabels] = useState<boolean>(true)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const [webcamOpen, setWebcamOpen] = useState<boolean>(false)
  const [webcamError, setWebcamError] = useState<string | null>(null)

  const updatePreviewUrl = useCallback((nextUrl: string) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  const runInferenceForFile = useCallback(
    async (file: File, sampleId: string | null = null) => {
      const objectUrl = URL.createObjectURL(file)
      updatePreviewUrl(objectUrl)
      setSelectedFile(file)
      setActiveSampleId(sampleId)
      setError(null)
      setIsLoading(true)

      try {
        const result = await predictImage(file, {
          minConf: 0.01,
          displayConf: threshold,
          usePerClassOpt,
        })
        setPrediction(result)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to run inference"
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [threshold, updatePreviewUrl, usePerClassOpt]
  )

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile()
          if (blob) {
            const pastedFile = new File([blob], "pasted_road_image.png", {
              type: blob.type || "image/png",
            })
            void runInferenceForFile(pastedFile)
            break
          }
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [runInferenceForFile])

  const handleLoadSample = async (sample: SampleItem) => {
    setError(null)
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl(sample.url))
      if (!res.ok) throw new Error(`Could not load sample (${res.status})`)
      const blob = await res.blob()
      const file = new File([blob], sample.filename, { type: "image/png" })
      await runInferenceForFile(file, sample.id)
    } catch (err) {
      setIsLoading(false)
      setError(err instanceof Error ? err.message : "Failed to load demo sample")
    }
  }

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setWebcamOpen(false)
  }, [])

  const startWebcam = async () => {
    setWebcamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      setWebcamOpen(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      })
    } catch (err) {
      setWebcamError(
        err instanceof Error
          ? err.message
          : "Camera access denied or unavailable in this browser."
      )
    }
  }

  const captureWebcamFrame = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], "webcam_capture.png", { type: "image/png" })
      stopWebcam()
      void runInferenceForFile(file)
    }, "image/png")
  }

  const applyPreset = (nextPreset: ThresholdPreset) => {
    setPreset(nextPreset)
    if (nextPreset === "f1_opt") {
      setUsePerClassOpt(false)
      setThreshold(0.226)
    } else if (nextPreset === "per_class") {
      setUsePerClassOpt(true)
    } else if (nextPreset === "high_prec") {
      setUsePerClassOpt(false)
      setThreshold(0.45)
    } else if (nextPreset === "all") {
      setUsePerClassOpt(false)
      setThreshold(0.01)
    }
  }

  const rawCountsByClass = useMemo(() => {
    const raw: Record<DamageCode, number> = { D00: 0, D10: 0, D20: 0, D40: 0 }
    if (!prediction) return raw
    for (const det of prediction.detections) {
      raw[det.code] += 1
    }
    return raw
  }, [prediction])

  const filteredDetections = useMemo(() => {
    if (!prediction) return []
    return prediction.detections.filter((det) => {
      if (!enabledClasses[det.code]) return false
      const thr = usePerClassOpt ? perClassThresholds[det.code] : threshold
      return det.score >= thr
    })
  }, [prediction, enabledClasses, usePerClassOpt, perClassThresholds, threshold])

  const triage = useMemo(
    () => computeRoadTriage(filteredDetections),
    [filteredDetections]
  )

  const gaugeColor =
    triage.integrity_score >= 82
      ? "#10b981"
      : triage.integrity_score >= 58
        ? "#f59e0b"
        : "#ef4444"

  return (
    <div className="space-y-6">
      {/* Top Upload & Preset Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <HoverBorderGradient
          containerClassName="lg:col-span-7 w-full"
          className="p-4 sm:p-5"
        >
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              const dropped = e.dataTransfer.files?.[0]
              if (dropped) void runInferenceForFile(dropped)
            }}
            className={`flex flex-col justify-between gap-4 rounded-xl border border-dashed p-4 transition sm:flex-row sm:items-center ${
              isDragging
                ? "border-amber-500 bg-amber-500/10"
                : "border-border/80 bg-background/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0]
                if (chosen) void runInferenceForFile(chosen)
              }}
            />

            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500">
                <UploadCloud className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-display text-sm font-semibold text-foreground">
                  Upload or Drop Road Photo
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP · Supports <span className="font-mono text-foreground">Ctrl+V</span> paste or live camera
                </p>
                {selectedFile ? (
                  <p className="font-mono text-[11px] text-amber-400">
                    Active: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5"
              >
                <ImagePlus className="size-4" />
                Browse File
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (webcamOpen ? stopWebcam() : void startWebcam())}
                className="gap-1.5"
              >
                <Camera className="size-4" />
                {webcamOpen ? "Close Cam" : "Camera"}
              </Button>
              <ShimmerButton
                type="button"
                disabled={!selectedFile || isLoading}
                onClick={() => selectedFile && void runInferenceForFile(selectedFile, activeSampleId)}
                className="px-4 py-2 text-xs font-semibold"
              >
                <Play className="mr-1.5 size-3.5 text-amber-400" />
                Inspect
              </ShimmerButton>
            </div>
          </div>
        </HoverBorderGradient>

        {/* Quick Demo Presets */}
        <Card className="lg:col-span-5 py-4 gap-3 bg-card/90">
          <CardHeader className="px-4 py-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                <Sparkles className="size-3.5 text-amber-500" />
                Synthetic Road Test Presets
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[10px]">
                Zero Competition Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {samples.map((sample) => {
                const isSelected = activeSampleId === sample.id
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => void handleLoadSample(sample)}
                    className={`group flex flex-col items-start rounded-lg border p-2.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/12"
                        : "border-border/70 bg-background/50 hover:border-amber-500/50 hover:bg-muted/60"
                    }`}
                  >
                    <span className="line-clamp-1 text-xs font-semibold text-foreground">
                      {sample.title}
                    </span>
                    <span className="mt-0.5 line-clamp-1 font-mono text-[10px] text-muted-foreground">
                      {sample.filename.replace("sample_", "").replace(".png", "")}
                    </span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {webcamOpen ? (
        <Card className="border-amber-500/40 py-4">
          <CardContent className="flex flex-col items-center gap-3 px-4 sm:flex-row">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-56 rounded-xl border border-border bg-black"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={captureWebcamFrame} className="gap-1.5">
                <Camera className="size-4" />
                Capture & Inspect Frame
              </Button>
              <Button type="button" variant="outline" onClick={stopWebcam} className="gap-1.5">
                <X className="size-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {webcamError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Camera Unavailable</AlertTitle>
          <AlertDescription>{webcamError}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Inference Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Viewport */}
        <div className="lg:col-span-7 xl:col-span-8">
          <DetectionCanvas
            imageUrl={previewUrl}
            filename={prediction?.filename ?? selectedFile?.name ?? "road_preview.png"}
            imageWidth={prediction?.width ?? 960}
            imageHeight={prediction?.height ?? 640}
            detections={filteredDetections}
            showLabels={showLabels}
            highlightedId={highlightedId}
            onSelectDetection={setHighlightedId}
            isLoading={isLoading}
            latencyMs={prediction?.latency_ms ?? null}
            fps={prediction?.fps ?? null}
          />
        </div>

        {/* Right Triage & Threshold Column */}
        <div className="space-y-4 lg:col-span-5 xl:col-span-4">
          {/* Integrity Gauge Card */}
          <Card className="py-4 gap-4">
            <CardHeader className="px-5 py-0">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-sm font-semibold">
                  Road Integrity & Triage
                </CardTitle>
                <Badge
                  variant={triage.total_count === 0 ? "secondary" : "default"}
                  className="font-mono text-[11px]"
                >
                  {triage.total_count} active defect{triage.total_count === 1 ? "" : "s"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-0">
              <div className="flex items-center gap-4">
                <AnimatedCircularProgressBar
                  max={100}
                  min={0}
                  value={prediction ? triage.integrity_score : 100}
                  gaugePrimaryColor={prediction ? gaugeColor : "#334155"}
                  gaugeSecondaryColor="rgba(148, 163, 184, 0.2)"
                  className="size-24 shrink-0 text-xl"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {triage.total_count === 0 ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="size-4 text-amber-500" />
                    )}
                    <span className="font-display text-sm font-semibold text-foreground">
                      {prediction ? triage.severity_tier : "Awaiting Frame"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {prediction
                      ? triage.recommended_action
                      : "Run an uploaded photo or sample preset to compute pavement maintenance priority."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Threshold & Class Filter Controls */}
          <Card className="py-4 gap-4">
            <CardHeader className="px-5 py-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 font-display text-sm font-semibold">
                  <SlidersHorizontal className="size-4 text-amber-500" />
                  Live Operating Threshold
                </CardTitle>
                {usePerClassOpt ? (
                  <div className="flex items-center gap-1.5">
                    <Badge
                      data-testid="threshold-value"
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/15 font-mono text-[11px] font-semibold text-amber-400"
                    >
                      Per-Class Mode
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPerClassThresholds(DEFAULT_PER_CLASS_THRESHOLDS)}
                      className="h-6 gap-1 px-2 text-[10px]"
                    >
                      <RotateCcw className="size-3" />
                      Reset Optima
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Decrease threshold by 0.01"
                      onClick={() => {
                        const next = Math.max(0.01, Number((threshold - 0.01).toFixed(3)))
                        setPreset("custom")
                        setUsePerClassOpt(false)
                        setThreshold(next)
                      }}
                      className="size-6 rounded-md border-border/70"
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span
                      data-testid="threshold-value"
                      className="min-w-[4.5rem] rounded bg-amber-500/15 px-2 py-0.5 text-center font-mono text-xs font-semibold text-amber-500"
                    >
                      {threshold.toFixed(3)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Increase threshold by 0.01"
                      onClick={() => {
                        const next = Math.min(0.9, Number((threshold + 0.01).toFixed(3)))
                        setPreset("custom")
                        setUsePerClassOpt(false)
                        setThreshold(next)
                      }}
                      className="size-6 rounded-md border-border/70"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 py-0">
              {usePerClassOpt ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
                  Tune each class cutoff below (box confidence score stays fixed; boxes with score{" "}
                  <span className="font-mono font-semibold text-amber-400">&ge;</span> cutoff are shown).
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Slider
                    aria-label="Live confidence threshold"
                    min={10}
                    max={900}
                    step={1}
                    value={[Math.round(threshold * 1000)]}
                    onValueChange={(vals) => {
                      const milli = vals[0] ?? 226
                      setPreset("custom")
                      setUsePerClassOpt(false)
                      setThreshold(Number((milli / 1000).toFixed(3)))
                    }}
                  />
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => applyPreset("all")}
                      className="cursor-pointer transition hover:text-foreground"
                    >
                      0.01 (Floor)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("f1_opt")}
                      className="cursor-pointer text-amber-500 transition hover:text-amber-400"
                    >
                      0.226 (F1 Opt)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreset("custom")
                        setUsePerClassOpt(false)
                        setThreshold(0.9)
                      }}
                      className="cursor-pointer transition hover:text-foreground"
                    >
                      0.90 (Strict)
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2">
                <Button
                  type="button"
                  size="sm"
                  variant={preset === "f1_opt" ? "default" : "outline"}
                  onClick={() => applyPreset("f1_opt")}
                  className="h-7 text-[11px]"
                >
                  F1 Opt 0.226
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={preset === "per_class" ? "default" : "outline"}
                  onClick={() => applyPreset("per_class")}
                  className="h-7 text-[11px]"
                >
                  Per-Class Opt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={preset === "high_prec" ? "default" : "outline"}
                  onClick={() => applyPreset("high_prec")}
                  className="h-7 text-[11px]"
                >
                  High Prec 0.45
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={preset === "all" ? "default" : "outline"}
                  onClick={() => applyPreset("all")}
                  className="h-7 text-[11px]"
                >
                  All &ge; 0.01
                </Button>
              </div>

              <p className="font-mono text-[10px] text-muted-foreground">
                {prediction
                  ? `Showing ${filteredDetections.length} of ${prediction.detections.length} detections (filter cutoff — predicted box scores are fixed)`
                  : "Adjust cutoff dynamically once an image is inspected."}
              </p>

              <Separator />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Tag className="size-3.5" />
                    Box Labels Overlay
                  </span>
                  <Switch checked={showLabels} onCheckedChange={setShowLabels} />
                </div>

                {ALL_CLASSES.map((code, idx) => {
                  const meta = CLASS_CONFIG[idx]
                  const count = triage.counts[code]
                  const rawCount = rawCountsByClass[code]
                  const classThr = perClassThresholds[code]
                  return (
                    <div
                      key={code}
                      className="space-y-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="font-mono text-xs font-semibold">{code}</span>
                          <span className="text-xs text-muted-foreground">{meta.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                            {prediction ? `${count}/${rawCount}` : count}
                          </span>
                          <Switch
                            checked={enabledClasses[code]}
                            onCheckedChange={(checked) =>
                              setEnabledClasses((prev) => ({ ...prev, [code]: checked }))
                            }
                          />
                        </div>
                      </div>

                      {usePerClassOpt ? (
                        <div className="flex items-center gap-2 pt-0.5">
                          <Slider
                            aria-label={`${code} confidence threshold`}
                            min={10}
                            max={900}
                            step={1}
                            value={[Math.round(classThr * 1000)]}
                            onValueChange={(vals) => {
                              const milli = vals[0] ?? Math.round(meta.opt_thr * 1000)
                              setPerClassThresholds((prev) => ({
                                ...prev,
                                [code]: Number((milli / 1000).toFixed(3)),
                              }))
                            }}
                            className="flex-1 py-1.5"
                          />
                          <span
                            data-testid={`perclass-value-${code}`}
                            className="w-16 shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-center font-mono text-[11px] font-semibold text-amber-400"
                          >
                            &ge; {classThr.toFixed(3)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detections Ledger */}
          <Card className="py-4 gap-3">
            <CardHeader className="px-5 py-0">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-sm font-semibold">
                  Detections Ledger
                </CardTitle>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {prediction ? `${prediction.detections.length} raw · ${filteredDetections.length} shown` : "—"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-3 py-0">
              <ScrollArea className="h-[210px] px-2">
                {filteredDetections.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-8 text-xs">Class</TableHead>
                        <TableHead className="h-8 text-xs">Conf</TableHead>
                        <TableHead className="h-8 text-xs">Area</TableHead>
                        <TableHead className="h-8 text-xs">Box [x1,y1,x2,y2]</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDetections.map((det) => (
                        <TableRow
                          key={det.id}
                          onMouseEnter={() => setHighlightedId(det.id)}
                          onMouseLeave={() => setHighlightedId(null)}
                          className={`cursor-pointer ${
                            highlightedId === det.id ? "bg-amber-500/15" : ""
                          }`}
                        >
                          <TableCell className="py-1.5 font-mono text-xs font-semibold">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: det.color }}
                              />
                              {det.code}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5 font-mono text-xs tabular-nums">
                            {(det.score * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="py-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                            {det.area_pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="py-1.5 font-mono text-[11px] text-muted-foreground">
                            [{det.bbox.map((v) => Math.round(v)).join(", ")}]
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex h-[170px] items-center justify-center text-center text-xs text-muted-foreground">
                    {prediction
                      ? "No detections above the current threshold & class filters."
                      : "Detections will populate here once an image is inspected."}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
