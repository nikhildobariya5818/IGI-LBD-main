// editor.tsx
'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PDFViewer, pdf } from '@react-pdf/renderer'
import InvoicePDF, { PDFLayout, SectionType } from '@/components/pdfToReport/StandardReports/InvoicePDF'
import InvoicePDFGradingScales from '@/components/pdfToReport/StandardReports/InvoicePDF-GradingScales'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Download,
  RotateCcw,
  ArrowLeftCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface EditorState {
  data: any
  size: '17x11' | '14x8.5'
  pdfName: string
  fileName: string
  useGradingScales: boolean
}

const SECTION_OPTIONS = [
  { label: 'First Section', value: 'section1' },
  { label: 'Mini-Diamound section', value: 'section2' },
  { label: '90° section', value: 'section3' },
  { label: 'Diamound section', value: 'section4' },
  { label: 'Qr-code section', value: 'section5' },
  { label: 'DiaText', value: 'diaText' },
] as const

type Section = typeof SECTION_OPTIONS[number]['value']

// Extract section values for iteration
const SECTIONS = SECTION_OPTIONS.map((opt) => opt.label.replace(/ /g, '').toLowerCase()) as Section[]

// ✅ FIX: These MUST match the defaultLayout inside InvoicePDF.tsx exactly.
// When size="17x11" (large). If you support "14x8.5" you'd need a separate set.
const INVOICE_PDF_DEFAULTS_LARGE: PDFLayout = {
  section1: { marginTop: 42, marginLeft: 112 },
  section2: { marginTop: 7, marginLeft: 35 },
  section3: { left: 49.5, top: 416 },
  section4: { marginTop: 28, marginLeft: 36 },
  section5: { marginTop: 28, marginLeft: 14 },
  diaText: { top: 485.4, left: 233 },
}

const INVOICE_PDF_DEFAULTS_SMALL: PDFLayout = {
  section1: { marginTop: 38, marginLeft: -5 },
  section2: { marginTop: 3, marginLeft: 37 },
  section3: { left: 52.5, top: 416 },
  section4: { marginTop: 23, marginLeft: 36 },
  section5: { marginTop: 21, marginLeft: 18 },
  diaText: { top: 485.4, left: 233 },
}

// GradingScales report defaults (different from normal reports)
const GRADING_SCALES_DEFAULTS_LARGE: PDFLayout = {
  section1: { marginTop: 42, marginLeft: 103 },
  section2: { marginTop: 2, marginLeft: 50 },
  section3: { left: 42.5, top: 426 },
  section4: { marginTop: 28, marginLeft: 36 },
  section5: { marginTop: 28, marginLeft: 14 },
  diaText: { top: 485.4, left: 233 },
}

const GRADING_SCALES_DEFAULTS_SMALL: PDFLayout = {
  section1: { marginTop: 38, marginLeft: -14 },
  section2: { marginTop: -7, marginLeft: 50 },
  section3: { left: 52.5, top: 426 },
  section4: { marginTop: 23, marginLeft: 41 },
  section5: { marginTop: 21, marginLeft: 18 },
  diaText: { top: 485.4, left: 233 },
}

export default function PDFEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [selectedSection, setSelectedSection] = useState<Section>('section1')
  const [stepSize, setStepSize] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloading, setIsDownloading] = useState(false)

  const selectedSectionLabel = useMemo(
    () => SECTION_OPTIONS.find((section) => section.value === selectedSection)?.label ?? selectedSection,
    [selectedSection]
  )

  // ✅ FIX: layout starts as undefined so InvoicePDF uses its own defaults on first render.
  // Once any section is moved, we initialize layout FROM the InvoicePDF defaults so
  // untouched sections stay exactly where they were.
  const [layout, setLayout] = useState<PDFLayout | undefined>(undefined)

  useEffect(() => {
    try {
      const dataStr = searchParams.get('data')
      const sizeStr = searchParams.get('size') as '17x11' | '14x8.5' | null
      const pdfName = searchParams.get('pdfName') || ''
      const fileName = searchParams.get('fileName') || 'report.pdf'
      const useGradingScalesStr = searchParams.get('useGradingScales') || 'false'
      const useGradingScales = useGradingScalesStr === 'true'

      if (dataStr) {
        const parsedData = JSON.parse(decodeURIComponent(dataStr))
        setEditorState({
          data: parsedData,
          size: sizeStr || '17x11',
          pdfName,
          fileName,
          useGradingScales,
        })
        setLayout(undefined)
      }
    } catch (error) {
      console.error('Error loading editor data:', error)
      toast.error('Failed to load PDF data')
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  // ✅ FIX: Editor's "zero point" is the actual InvoicePDF defaults, not all-zeros.
  // This means when the editor initialises layout for the first time (on first move),
  // every untouched section keeps its correct InvoicePDF default value.
  // For GradingScales reports, use different defaults.
  const getInvoiceDefaults = useCallback((): PDFLayout => {
    const isSmall = editorState?.size === '14x8.5'
    const isGradingScales = editorState?.useGradingScales

    if (isGradingScales) {
      return isSmall
        ? GRADING_SCALES_DEFAULTS_SMALL
        : GRADING_SCALES_DEFAULTS_LARGE
    }

    return isSmall
      ? INVOICE_PDF_DEFAULTS_SMALL
      : INVOICE_PDF_DEFAULTS_LARGE
  }, [editorState?.size, editorState?.useGradingScales])

  // What the controls display. If layout is still undefined, show InvoicePDF defaults.
  const effectiveLayout = useMemo(
    () => layout ?? getInvoiceDefaults(),
    [layout, getInvoiceDefaults]
  )

  // ✅ CORE FIX: When updating a section, seed ALL other sections from InvoicePDF
  // defaults if this is the very first edit (layout === undefined).
  // This guarantees only the touched section moves.
  const updateSectionValue = useCallback(
    (
      section: Section,
      property: 'marginTop' | 'marginLeft' | 'top' | 'left',
      delta: number,
      absolute?: number
    ) => {
      setLayout((prev) => {
        // If layout has never been set, seed it from InvoicePDF's own defaults
        // so every OTHER section stays exactly where InvoicePDF placed it.
        const base: PDFLayout = prev ?? getInvoiceDefaults()
        const defaults = getInvoiceDefaults()

        const sectionData = base[section as keyof PDFLayout] as any
        const defaultSectionData = defaults[section as keyof PDFLayout] as any

        // If section doesn't exist in layout, use the default value for that property
        let currentValue = sectionData?.[property]
        if (currentValue === undefined && defaultSectionData) {
          currentValue = defaultSectionData[property]
        }

        const newValue =
          absolute !== undefined ? absolute : (currentValue ?? 0) + delta

        return {
          ...base,
          [section]: {
            ...(sectionData || {}),
            [property]: newValue,
          },
        }
      })
    },
    [getInvoiceDefaults]
  )

const handleArrowMove = useCallback(
  (section: Section, direction: 'up' | 'down' | 'left' | 'right') => {
    const delta = direction === 'up' || direction === 'left' ? -stepSize : stepSize

    if (section === 'section4' || section === 'diaText') {
      const property = direction === 'up' || direction === 'down' ? 'top' : 'left'
      updateSectionValue(section, property, delta)
    } else {
      const property = direction === 'up' || direction === 'down' ? 'marginTop' : 'marginLeft'
      updateSectionValue(section, property, delta)
    }
  },
  [stepSize, updateSectionValue]
)

  const handleInputChange = useCallback(
    (section: Section, property: 'marginTop' | 'marginLeft' | 'top' | 'left', value: string) => {
      const numValue = parseFloat(value) || 0
      updateSectionValue(section, property, 0, numValue)
    },
    [updateSectionValue]
  )

  const resetLayout = useCallback(() => {
    setLayout(undefined)
    toast.success('Layout reset to original structure')
  }, [])

  const handleDownload = useCallback(async () => {
    if (!editorState?.data) {
      toast.error('No PDF data available')
      return
    }

    setIsDownloading(true)
    try {
      const PDFComponent = editorState.useGradingScales ? InvoicePDFGradingScales : InvoicePDF
      const blob = await pdf(
        <PDFComponent data={editorState.data} size={editorState.size} layout={layout} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = editorState.fileName
      a.click()
      URL.revokeObjectURL(url)

      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download PDF')
    } finally {
      setIsDownloading(false)
    }
  }, [editorState, layout])

  const sectionLayout = useMemo(
    () => effectiveLayout[selectedSection as keyof PDFLayout],
    [effectiveLayout, selectedSection]
  )

  const isAbsolutePositioning = useMemo(
    () => selectedSection === 'section3' || selectedSection === 'diaText',
    [selectedSection]
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading PDF editor...</p>
        </div>
      </div>
    )
  }

  if (!editorState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Failed to load PDF data. Please go back and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex gap-6 h-screen max-h-[calc(100vh-3rem)]">
        {/* Left Panel - Controls */}
        <div className="w-80 flex flex-col gap-6 overflow-y-auto">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="gap-2 w-fit"
            >
              <ArrowLeftCircle className="w-4 h-4" />
              Back to Processor
            </Button>
            <h1 className="text-2xl font-bold text-foreground">PDF Layout Editor</h1>
            <p className="text-sm text-muted-foreground">Adjust section positions and download</p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {SECTIONS.map((section) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedSection === section
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                >
                  {section.replace(/([A-Z])/g, ' $1').trim()}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Step Size (px)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="number"
                min="1"
                max="50"
                value={stepSize}
                onChange={(e) => setStepSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">Arrow buttons move by this amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Position Controls
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({selectedSection})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {isAbsolutePositioning ? (
                  <>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'up')}
                        title="Move up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'left')}
                        title="Move left"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'down')}
                        title="Move down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'right')}
                        title="Move right"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'up')}
                        title="Decrease marginTop"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'left')}
                        title="Decrease marginLeft"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'down')}
                        title="Increase marginTop"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArrowMove(selectedSection, 'right')}
                        title="Increase marginLeft"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-3 border-t space-y-3">
                {isAbsolutePositioning ? (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="top" className="text-xs">
                        Top
                      </Label>
                      <Input
                        id="top"
                        type="number"
                        value={(sectionLayout as any)?.top ?? 0}
                        onChange={(e) => handleInputChange(selectedSection, 'top', e.target.value)}
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="left" className="text-xs">
                        Left
                      </Label>
                      <Input
                        id="left"
                        type="number"
                        value={(sectionLayout as any)?.left ?? 0}
                        onChange={(e) => handleInputChange(selectedSection, 'left', e.target.value)}
                        step="0.1"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="marginTop" className="text-xs">
                        Margin Top
                      </Label>
                      <Input
                        id="marginTop"
                        type="number"
                        value={(sectionLayout as any)?.marginTop ?? 0}
                        onChange={(e) => handleInputChange(selectedSection, 'marginTop', e.target.value)}
                        step="0.1"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="marginLeft" className="text-xs">
                        Margin Left
                      </Label>
                      <Input
                        id="marginLeft"
                        type="number"
                        value={(sectionLayout as any)?.marginLeft ?? 0}
                        onChange={(e) => handleInputChange(selectedSection, 'marginLeft', e.target.value)}
                        step="0.1"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button onClick={resetLayout} variant="outline" className="w-full gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset Layout
            </Button>
          </div>
        </div>

        {/* Right Panel - PDF Preview */}
        <div className="flex-1 bg-muted/30 rounded-lg border border-border overflow-hidden">
          <PDFViewer style={{ width: '100%', height: '100%' }}>
            {editorState.useGradingScales ? (
              <InvoicePDFGradingScales
                data={editorState.data}
                size={editorState.size}
                layout={layout}
                activeSection={selectedSection}
              />
            ) : (
              <InvoicePDF
                data={editorState.data}
                size={editorState.size}
                layout={layout}
                activeSection={selectedSection}
              />
            )}
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}
