"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "../../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card"
import { Upload } from "lucide-react"
import { pdf } from "@react-pdf/renderer"
import IGIReportPDF from "./IGIReportPDF"
import { toast } from "sonner"
import { Label } from "../../ui/label"
import { Input } from "../../ui/input"
import { apiClient } from "../../../lib/apiClient"

interface IGIReportData {
  ReportNumber?: string
  ReportDate?: string
  CaratWeight?: string
  ColorGrade?: string
  ClarityGrade?: string
  CutGrade?: string
  ShapeandCuttingStyle?: string
  Measurements?: string
  Polish?: string
  Symmetry?: string
  Fluorescence?: string
  Images?: {
    Proportions?: string
    QRCode?: string
  }
  [key: string]: any
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

  const handleSubmit = async (event: React.FormEvent) => {
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
      const response = await apiClient.uploadIGIReport<any>(uploadedFile, {
        clientName: clientName.trim(),
        onUploadProgress: (progressEvent?: any) => {
          if (!progressEvent || !progressEvent.total) return
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100)
          setLoadingProgress(Math.min(percent, 80))
        },
      })

      console.log("[v0] IGI Report Data:", response)

      setLoadingStatus("generating")
      setLoadingProgress(85)

      // Extract the data from the response (API returns { data, images, ... })
      const reportData = response?.data || response || {}
      
      // Merge the extracted data with client name
      const mergedData: IGIReportData = {
        ...(typeof reportData === 'object' ? reportData : {}),
        clientName: clientName.trim(),
      } as IGIReportData

      // Generate PDF with 14x8.5 inches fixed size
      const blob = await pdf(<IGIReportPDF data={mergedData} />).toBlob()

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
            <Button
              type="submit"
              className="w-full"
              disabled={!isFormComplete || isLoading}
            >
              {isLoading ? "Processing..." : "Generate IGI Report"}
            </Button>
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
