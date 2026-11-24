export type DamageCode = "D00" | "D10" | "D20" | "D40"

export interface ClassMeta {
  code: DamageCode
  name: string
  color: string
  opt_thr: number
  ap50: number
  severity_weight: number
  action: string
}

export interface BenchmarksData {
  public_lb: number
  public_rank: number
  lead_over_second: number
  clean_val_score: number
  map50: number
  map50_95: number
  precision: number
  recall: number
  f1: number
  opt_thr: number
  kaggle_t4_ms: number
  kaggle_t4_fps: number
  colab_t4_ms: number
  vram_mb: number
  robustness_map50: number
  robustness_gain_vs_v2: number
  composite_proxy: number
  cleanlab_quality: number
  clean_vs_defect_auc: number
  bootstrap_ci_low: number
  bootstrap_ci_high: number
}

export interface HealthResponse {
  status: string
  model_loaded: boolean
  architecture: string
  device: string
  device_name: string
  weights_sha256: string
  weights_size_mb: number
  imgsz: number
  iou_nms: number
  max_det: number
  conf_floor: number
  ultralytics_version: string
  torch_version: string
  classes: ClassMeta[]
  benchmarks: BenchmarksData
}

export interface SampleItem {
  id: string
  filename: string
  title: string
  subtitle: string
  url: string
}

export interface Detection {
  id: string
  class_id: number
  code: DamageCode
  label: string
  color: string
  score: number
  bbox: [number, number, number, number]
  area_pct: number
  opt_thr: number
}

export interface PredictSummary {
  counts: Record<DamageCode, number>
  total_count: number
  integrity_score: number
  severity_tier: string
  recommended_action: string
  threshold_mode: string
  display_conf: number
}

export interface PredictResponse {
  filename: string
  width: number
  height: number
  latency_ms: number
  fps: number
  device: string
  min_conf: number
  detections: Detection[]
  summary_at_default: PredictSummary
  prediction_string: string
  annotated_base64?: string
}

export interface BatchItemResult {
  filename: string
  image_id: string
  width: number
  height: number
  latency_ms: number
  total_count: number
  counts: Record<DamageCode, number>
  integrity_score: number
  severity_tier: string
  top_score: number
  detections: Detection[]
  prediction_string: string
}

export interface BatchResponse {
  total_images: number
  damaged_images: number
  damaged_pct: number
  conf_threshold: number
  mean_latency_ms: number
  aggregate_counts: Record<DamageCode, number>
  items: BatchItemResult[]
  kaggle_csv: string
}

export const CLASS_CONFIG: Record<number, ClassMeta> = {
  0: {
    code: "D00",
    name: "Longitudinal Crack",
    color: "#F59E0B",
    opt_thr: 0.19,
    ap50: 0.4775,
    severity_weight: 14,
    action: "Crack sealing",
  },
  1: {
    code: "D10",
    name: "Transverse Crack",
    color: "#38BDF8",
    opt_thr: 0.17,
    ap50: 0.4913,
    severity_weight: 16,
    action: "Joint routing & seal",
  },
  2: {
    code: "D20",
    name: "Alligator Crack",
    color: "#FB7185",
    opt_thr: 0.21,
    ap50: 0.6769,
    severity_weight: 26,
    action: "Base mill & overlay",
  },
  3: {
    code: "D40",
    name: "Pothole",
    color: "#EF4444",
    opt_thr: 0.31,
    ap50: 0.5403,
    severity_weight: 35,
    action: "Urgent full-depth patch",
  },
}

export const DEFAULT_BENCHMARKS: BenchmarksData = {
  public_lb: 44.9975,
  public_rank: 1,
  lead_over_second: 1.44267,
  clean_val_score: 46.07,
  map50: 0.5465,
  map50_95: 0.2422,
  precision: 0.6106,
  recall: 0.5032,
  f1: 0.5498,
  opt_thr: 0.226,
  kaggle_t4_ms: 18.144,
  kaggle_t4_fps: 55.1,
  colab_t4_ms: 21.3,
  vram_mb: 148.1,
  robustness_map50: 0.2775,
  robustness_gain_vs_v2: 2.69,
  composite_proxy: 50.55,
  cleanlab_quality: 0.9519,
  clean_vs_defect_auc: 0.9454,
  bootstrap_ci_low: 44.731,
  bootstrap_ci_high: 48.169,
}

export const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(apiUrl("/api/health"))
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return res.json()
}

export async function fetchSamples(): Promise<SampleItem[]> {
  const res = await fetch(apiUrl("/api/samples"))
  if (!res.ok) {
    throw new Error(`Failed to load samples (${res.status})`)
  }
  const data = (await res.json()) as { samples: SampleItem[] }
  return data.samples
}

export async function predictImage(
  file: File,
  options: {
    minConf?: number
    includeFloor?: boolean
    displayConf?: number
    usePerClassOpt?: boolean
  } = {}
): Promise<PredictResponse> {
  const params = new URLSearchParams({
    min_conf: String(options.minConf ?? 0.01),
    include_floor: String(options.includeFloor ?? false),
    display_conf: String(options.displayConf ?? 0.226),
    use_per_class_opt: String(options.usePerClassOpt ?? false),
  })
  const form = new FormData()
  form.append("file", file)

  const res = await fetch(apiUrl(`/api/predict?${params.toString()}`), {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `Prediction failed (${res.status})`)
  }
  return res.json()
}

export async function predictBatch(
  files: File[],
  confThreshold: number
): Promise<BatchResponse> {
  const params = new URLSearchParams({
    conf_threshold: String(confThreshold),
  })
  const form = new FormData()
  for (const file of files) {
    form.append("files", file)
  }
  const res = await fetch(apiUrl(`/api/predict/batch?${params.toString()}`), {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || `Batch prediction failed (${res.status})`)
  }
  return res.json()
}

export function computeRoadTriage(filtered: Detection[]): Omit<PredictSummary, "threshold_mode" | "display_conf"> {
  const counts: Record<DamageCode, number> = {
    D00: 0,
    D10: 0,
    D20: 0,
    D40: 0,
  }
  let penalty = 0
  for (const det of filtered) {
    counts[det.code] += 1
    const weight = CLASS_CONFIG[det.class_id]?.severity_weight ?? 15
    penalty += weight * Math.min(1, det.score / 0.35)
  }

  const integrity_score = Math.max(0, Math.min(100, Math.round(100 - penalty)))

  let severity_tier = "Clean Road"
  let recommended_action = "No actionable surface distress above operating threshold."

  if (filtered.length > 0) {
    if (counts.D40 > 0 || integrity_score < 55) {
      severity_tier = "Critical — Urgent Pothole Repair"
      recommended_action =
        "Dispatch patching crew immediately; pothole or severe structural risk detected."
    } else if (counts.D20 > 0 || integrity_score < 78) {
      severity_tier = "Moderate — Scheduled Patch"
      recommended_action =
        "Schedule localized mill-and-overlay maintenance to arrest fatigue propagation."
    } else {
      severity_tier = "Low — Routine Seal"
      recommended_action =
        "Perform preventive crack sealing during next scheduled corridor sweep."
    }
  }

  return {
    counts,
    total_count: filtered.length,
    integrity_score,
    severity_tier,
    recommended_action,
  }
}

export function formatPredictionString(detections: Detection[]): string {
  return detections
    .map((d) => {
      const [x1, y1, x2, y2] = d.bbox
      return `${d.class_id} ${d.score.toFixed(4)} ${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`
    })
    .join(" ")
}
