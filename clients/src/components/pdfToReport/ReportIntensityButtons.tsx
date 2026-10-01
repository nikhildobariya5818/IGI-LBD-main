"use client"

import { Button } from "../ui/button"

export type ReportIntensity = 25 | 50 | 75 | 100

const INTENSITIES: ReportIntensity[] = [25, 50, 75, 100]

export default function ReportIntensityButtons({
  onSelect,
  disabled = false,
  label = "Submit report",
}: {
  onSelect: (intensity: ReportIntensity) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {INTENSITIES.map((intensity) => (
          <Button
            key={intensity}
            type="button"
            variant={intensity === 100 ? "default" : "outline"}
            onClick={() => onSelect(intensity)}
            disabled={disabled}
          >
            Submit {intensity}%
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        100% keeps the original report. Lower percentages make the generated report lighter.
      </p>
    </div>
  )
}

export function reportOpacity(intensity: ReportIntensity) {
  return intensity / 100
}
