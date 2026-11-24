import { useRef, useState } from "react"
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FolderUp,
  Layers,
  Loader2,
  Play,
} from "lucide-react"

import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type BatchResponse, predictBatch } from "@/lib/api"

export function BatchInspector() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [confThreshold, setConfThreshold] = useState(0.226)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batchResult, setBatchResult] = useState<BatchResponse | null>(null)

  const handleRunBatch = async () => {
    if (!files.length) return
    setError(null)
    setIsLoading(true)
    try {
      const res = await predictBatch(files, confThreshold)
      setBatchResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch inference failed")
    } finally {
      setIsLoading(false)
    }
  }

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 px-5 lg:flex-row lg:items-center lg:justify-between">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? [])
              if (selected.length) setFiles(selected)
            }}
          />

          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <Layers className="size-4 text-amber-500" />
              Corridor Batch Inspection & Kaggle CSV Generator
            </h3>
            <p className="text-xs text-muted-foreground">
              Select multiple road survey frames to run sequential YOLO26m inference and export{" "}
              <span className="font-mono text-foreground">submission.csv</span> or structured JSON.
            </p>
            {files.length > 0 ? (
              <p className="font-mono text-xs text-amber-400">
                {files.length} image{files.length === 1 ? "" : "s"} queued
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-48 space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-muted-foreground">Threshold</span>
                <span className="text-amber-500">{confThreshold.toFixed(3)}</span>
              </div>
              <Slider
                aria-label="Batch confidence threshold"
                min={50}
                max={850}
                step={10}
                value={[Math.round(confThreshold * 1000)]}
                onValueChange={(v) => setConfThreshold(Number(((v[0] ?? 226) / 1000).toFixed(3)))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="gap-1.5"
              >
                <FolderUp className="size-4" />
                Select Images
              </Button>
              <ShimmerButton
                type="button"
                disabled={!files.length || isLoading}
                onClick={() => void handleRunBatch()}
                className="px-5 py-2 text-xs font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin text-amber-400" />
                ) : (
                  <Play className="mr-1.5 size-3.5 text-amber-400" />
                )}
                Run Batch
              </ShimmerButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Batch Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {batchResult ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="py-4">
              <CardContent className="px-4 py-0">
                <p className="text-xs text-muted-foreground">Images Processed</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {batchResult.total_images}
                </p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="px-4 py-0">
                <p className="text-xs text-muted-foreground">Damaged Frames</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-500">
                  {batchResult.damaged_images}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({batchResult.damaged_pct}%)
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="px-4 py-0">
                <p className="text-xs text-muted-foreground">Mean Latency</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-400">
                  {batchResult.mean_latency_ms} ms
                </p>
              </CardContent>
            </Card>
            <Card className="py-4">
              <CardContent className="px-4 py-0">
                <p className="text-xs text-muted-foreground">Class Breakdown</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <Badge variant="outline">D00: {batchResult.aggregate_counts.D00}</Badge>
                  <Badge variant="outline">D10: {batchResult.aggregate_counts.D10}</Badge>
                  <Badge variant="outline">D20: {batchResult.aggregate_counts.D20}</Badge>
                  <Badge variant="outline">D40: {batchResult.aggregate_counts.D40}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="py-4">
            <CardHeader className="flex flex-row items-center justify-between px-5 py-0">
              <CardTitle className="font-display text-sm font-semibold">
                Batch Inspection Ledger
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      batchResult.kaggle_csv,
                      "submission.csv",
                      "text/csv;charset=utf-8;"
                    )
                  }
                  className="gap-1.5 text-xs"
                >
                  <FileSpreadsheet className="size-3.5" />
                  Kaggle CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadFile(
                      JSON.stringify(batchResult, null, 2),
                      "batch_inspection.json",
                      "application/json"
                    )
                  }
                  className="gap-1.5 text-xs"
                >
                  <Download className="size-3.5" />
                  Batch JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Integrity</TableHead>
                    <TableHead>D00 / D10 / D20 / D40</TableHead>
                    <TableHead>Top Conf</TableHead>
                    <TableHead>Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchResult.items.map((item) => (
                    <TableRow key={item.filename}>
                      <TableCell className="font-mono text-xs">{item.filename}</TableCell>
                      <TableCell className="text-xs">{item.severity_tier}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold tabular-nums">
                        {item.integrity_score}/100
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {item.counts.D00} / {item.counts.D10} / {item.counts.D20} /{" "}
                        {item.counts.D40}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {(item.top_score * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-emerald-400">
                        {item.latency_ms} ms
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
