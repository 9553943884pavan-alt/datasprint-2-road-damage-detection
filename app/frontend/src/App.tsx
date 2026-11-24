import { useEffect, useState } from "react"
import { BarChart3, Cpu, Layers, ScanLine } from "lucide-react"

import { ArchitectureSection } from "@/components/ArchitectureSection"
import { BatchInspector } from "@/components/BatchInspector"
import { BenchmarksSection } from "@/components/BenchmarksSection"
import { HeroTelemetry } from "@/components/HeroTelemetry"
import { LiveInspector } from "@/components/LiveInspector"
import { Navbar } from "@/components/Navbar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DEFAULT_BENCHMARKS,
  fetchHealth,
  fetchSamples,
  type HealthResponse,
  type SampleItem,
} from "@/lib/api"

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [samples, setSamples] = useState<SampleItem[]>([])
  const [isDark, setIsDark] = useState<boolean>(true)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchHealth(), fetchSamples()])
      .then(([healthData, sampleList]) => {
        if (cancelled) return
        setHealth(healthData)
        setSamples(sampleList)
        setHealthError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setHealthError(err instanceof Error ? err.message : "Backend unavailable")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const benchmarks = health?.benchmarks ?? DEFAULT_BENCHMARKS

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar
        health={health}
        healthError={healthError}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      <HeroTelemetry benchmarks={benchmarks} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6">
        <Tabs defaultValue="live" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto h-auto p-1">
              <TabsTrigger value="live" className="gap-1.5 py-2">
                <ScanLine className="size-4 text-amber-500" />
                Live Inspector
              </TabsTrigger>
              <TabsTrigger value="batch" className="gap-1.5 py-2">
                <Layers className="size-4 text-sky-400" />
                Batch Inspection
              </TabsTrigger>
              <TabsTrigger value="benchmarks" className="gap-1.5 py-2">
                <BarChart3 className="size-4 text-emerald-400" />
                Benchmarks & Audit
              </TabsTrigger>
              <TabsTrigger value="architecture" className="gap-1.5 py-2">
                <Cpu className="size-4 text-rose-400" />
                Model Card
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent forceMount value="live" className="data-[state=inactive]:hidden">
            <LiveInspector samples={samples} />
          </TabsContent>

          <TabsContent forceMount value="batch" className="data-[state=inactive]:hidden">
            <BatchInspector />
          </TabsContent>

          <TabsContent forceMount value="benchmarks" className="data-[state=inactive]:hidden">
            <BenchmarksSection benchmarks={benchmarks} />
          </TabsContent>

          <TabsContent forceMount value="architecture" className="data-[state=inactive]:hidden">
            <ArchitectureSection health={health} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t border-border/70 bg-card/50 py-4 text-center text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <span>
            Team PavanKumar9938 · Anveshan DataSprint 2.0 (#1 Kaggle Public LB: 44.99750)
          </span>
          <span className="font-mono text-[11px]">
            React + Vite + Tailwind CSS + shadcn/ui + Magic UI + Aceternity UI · FastAPI + YOLO26m
          </span>
        </div>
      </footer>
    </div>
  )
}

export default App
