"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Upload } from "lucide-react"
import { pdf } from "@react-pdf/renderer"
import IGIReportContent from "./IGIReportContent"
import ReportIntensityButtons, { reportOpacity, type ReportIntensity } from "../ReportIntensityButtons"
import { toast } from "sonner"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { apiClient } from "../../../lib/apiClient"

// Matches the /extract-igi-report API response:
// {
//   data: { report_number, report_date, description, shape_and_cutting_style,
//           measurements, carat_weight, color_grade, clarity_grade, cut_grade,
//           depth_percent, table_percent, girdle, culet, crown_angle, pavilion_angle,
//           polish, symmetry, fluorescence, inscriptions, comments,
//           growth_process, diamond_type, is_laboratory_grown, light_performance_grade },
//   report_number: string,
//   images: { qr_code, barcode, proportions, clarity_characteristics_full, color_clarity_chart_full },
//   image_urls: { qr_code, barcode, proportions, clarity_characteristics_full, color_clarity_chart_full }
// }
// interface IGIApiResponse {
//   data?: Record<string, any>
//   report_number?: string
//   images?: Record<string, string>
//   image_urls?: Record<string, string>
//   [key: string]: any
// }


interface LBDResponse {
  success: boolean
  page_width: number
  page_height: number
  images: {
    page1: string
    page2: string
    page3: string
    page4: string
  }
}

export default function LBDReportsSection() {
  const [clientName, setClientName] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingStatus, setLoadingStatus] = useState<string>("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Invalid file type. Please upload a PDF file.")
        return
      }
      setUploadedFile(file)
      toast.success("PDF file selected successfully")
    }
  }

  const handleSubmit = async (event: React.FormEvent, intensity: ReportIntensity = 100) => {
    event.preventDefault()

    if (!uploadedFile) {
      toast.error("Please upload a PDF file")
      return
    }

    if (!clientName.trim()) {
      toast.error("Please enter a client name")
      return
    }

    setIsLoading(true)
    setLoadingStatus("uploading")
    setLoadingProgress(20)

    try {
      // Call the /extract-igi-report API
      const response = await apiClient.extractLBDReportImages(uploadedFile, {
        onUploadProgress: (progressEvent?: any) => {
          if (!progressEvent || !progressEvent.total) return
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          setLoadingProgress(Math.min(percent, 80))
        },
      })

      console.log("[v0] IGI Report Data:", response)

      // NOTE: the /extract-igi-report API does NOT return a `success` field -
      // its shape is simply { data, report_number, images, image_urls }.
      // Checking `response.success` here would always be falsy (undefined)
      // and throw on every request. Instead, validate the actual fields we
      // depend on downstream: the extracted `data` object and at least one
      // set of image references.
      if (!response) {
        throw new Error("No response received from API.")
      }

      if (!response.images) {
        throw new Error("No images returned from API.")
      }

      const requiredPages = ["page1", "page2", "page3", "page4"]

      for (const page of requiredPages) {
        if (!response.images[page as keyof typeof response.images]) {
          throw new Error(`${page} image is missing`)
        }
      }

      setLoadingStatus("generating")
      setLoadingProgress(85)

      // The API nests all report fields under `data`, and keeps image
      // references under `images`. Some endpoints also expose an
      // `image_urls` object, but the LBD report API may only return `images`.
      // In that case, fall back to `images` so the frontend can still resolve
      // and render the report assets.
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

      const images = Object.fromEntries(
        Object.entries(response.images).map(([key, value]) => [
          key,
          `${API_BASE_URL}/${String(value).replace(/^\/+/, "")}`,
        ])
      );

      const reportData = (response as any)?.data || {}
      const rawImageUrls = ("image_urls" in response ? (response as any).image_urls : response.images) || {}

      const absoluteImageUrls = Object.fromEntries(
        Object.entries(rawImageUrls).map(([key, value]) => [
          key,
          typeof value === "string" && value.startsWith("/")
            ? `${API_BASE_URL}${value}`
            : value,
        ])
      )

      const mergedData: Record<string, any> = {
        ...reportData,
        clientName: clientName.trim(),
        report_number: response?.report_number || reportData.report_number,
        images: response?.images || {},
        image_urls: absoluteImageUrls,
      }

      console.log("[v0] Merged Report Data:", mergedData)
      console.log("[v0] Image URLs in response:", mergedData.image_urls)

      // Generate PDF from IGIReportContent directly - it already returns a
      // valid <Document><Page>...</Page></Document> tree. `pdf().toBlob()`
      // requires the root element to be a <Document>; passing anything
      // wrapped in <PDFViewer> (a browser-only preview iframe) or nested
      // inside an extra <Document> produces a corrupt, page-less PDF that
      // Acrobat refuses to open. Use IGIReportPDF only for on-screen preview.
      const blob = await pdf(
        <IGIReportContent
          data={mergedData}
  backgroundImage="/igi-report-template.jpg"
    reportOpacity={reportOpacity(intensity)}
  />
      ).toBlob()

      setLoadingProgress(95)

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url

      const currentDate = new Date()
      const day = String(currentDate.getDate()).padStart(2, "0")
      const month = String(currentDate.getMonth() + 1).padStart(2, "0")
      const year = currentDate.getFullYear()
      const formattedDate = `${day}-${month}-${year}`

      link.download = `IGI_Report_${clientName.trim().replace(/\s+/g, "_")}_${formattedDate}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setLoadingProgress(100)
      setLoadingStatus("complete")

      toast.success("IGI report generated and downloaded successfully!")

      // Reset form
      setTimeout(() => {
        setClientName("")
        setUploadedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        setLoadingStatus("idle")
        setLoadingProgress(0)
      }, 1500)
    } catch (error: any) {
      console.error("[v0] IGI Report Error:", error)
      toast.error(
        error.message || "Failed to generate IGI report. Please ensure the backend is running and the PDF is valid.",
      )
      setLoadingStatus("idle")
      setLoadingProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const isFormComplete = uploadedFile && clientName.trim().length > 0

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {loadingStatus === "uploading" && "Uploading PDF"}
                {loadingStatus === "generating" && "Generating Report"}
                {loadingStatus === "complete" && "Complete"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {loadingStatus === "uploading" && "Processing your PDF and extracting data..."}
                {loadingStatus === "generating" && "Creating IGI report PDF..."}
                {loadingStatus === "complete" && "Your report is being downloaded..."}
              </p>
              <div className="w-48 h-2 bg-border rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">{loadingProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>LBD Diamonds Report Generator</CardTitle>
          <CardDescription>
            Upload a PDF document and enter client name to generate an IGI-formatted diamonds report (14 × 8.5 inches)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Name Input */}
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-sm font-medium">
                Client Name
              </Label>
              <Input
                id="clientName"
                type="text"
                placeholder="Enter client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={isLoading}
                className="transition-all focus:shadow-soft"
              />
              <p className="text-xs text-muted-foreground">This name will be added to the generated report</p>
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label htmlFor="pdf-upload" className="text-sm font-medium">
                PDF Document
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-accent/50 transition-colors">
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <Label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {uploadedFile ? "Change PDF file" : "Click to upload PDF"}
                  </span>
                  <span className="text-xs text-muted-foreground">PDF files only</span>
                </Label>
              </div>
              {uploadedFile && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
                  <span className="text-sm text-green-700 dark:text-green-300">{uploadedFile.name}</span>
                </div>
              )}
            </div>

            {/* Submit Button */}
      <ReportIntensityButtons
        onSelect={(intensity) => void handleSubmit({ preventDefault: () => undefined } as React.FormEvent, intensity)}
        disabled={!isFormComplete || isLoading}
      />
          </form>

          {!isFormComplete && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Please fill in both the client name and upload a PDF file to proceed
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
