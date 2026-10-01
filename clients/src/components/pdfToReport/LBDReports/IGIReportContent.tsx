/* eslint-disable @typescript-eslint/no-explicit-any */

import { Document, Image, Page, StyleSheet, View } from "@react-pdf/renderer"
import LBDReportPDFSection1 from "./LBDReportPDFSection1"
import LBDReportPDFSection2 from "./LBDReportPDFSection2"
import LBDReportPDFSection3 from "./LBDReportPDFSection3"
import LBDReportPDFSection4 from "./LBDReportPDFSection4"

export const LBD_PDF_PAGE_WIDTH = 1008
export const LBD_PDF_PAGE_HEIGHT = 612

/** The image extractor splits the source report into these four vertical panels. */
const PANELS = [
  { key: "page1", left: 0, width: 0.248 },
  { key: "page2", left: 0.248, width: 0.253 },
  { key: "page3", left: 0.501, width: 0.293 },
  { key: "page4", left: 0.794, width: 0.206 },
] as const

const styles = StyleSheet.create({
  page: { backgroundColor: "#fff", position: "relative" },
  backgroundImage: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  panel: { position: "absolute", top: 0, height: "100%" },
})

const panelComponents = {
  page1: LBDReportPDFSection1,
  page2: LBDReportPDFSection2,
  page3: LBDReportPDFSection3,
  page4: LBDReportPDFSection4,
}

export interface LBDImageReportData {
  page_width?: number
  page_height?: number
  cache_bust?: string | number
  images?: Partial<Record<(typeof PANELS)[number]["key"], string>>
  image_urls?: Partial<Record<(typeof PANELS)[number]["key"], string>>
  [key: string]: any
}

/**
 * Rebuilds one complete LBD report page from page1-page4 returned by
 * POST /extract-images.
 *
 * The final PDF is always rendered at 14 x 8.5 inches, which maps to
 * 1008 x 612 in react-pdf.
 */
export default function IGIReportContent({
  data,
  backgroundImage,
  reportOpacity = 1,
}: {
  data: LBDImageReportData
  backgroundImage?: string
  reportOpacity?: number
}) {
  const pageWidth = LBD_PDF_PAGE_WIDTH
  const pageHeight = LBD_PDF_PAGE_HEIGHT
  const cacheBust = data?.cache_bust

  const addCacheBust = (url?: string) => {
    if (!url) return url
    if (!cacheBust) return url
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}v=${encodeURIComponent(String(cacheBust))}`
  }

  const imageUrls = Object.fromEntries(
    Object.entries(data?.image_urls || data?.images || {}).map(([key, value]) => [key, addCacheBust(value)]),
  ) as Partial<Record<(typeof PANELS)[number]["key"], string>>

  return (
    <Document>
      <Page size={[pageWidth, pageHeight]} style={{ ...styles.page, opacity: reportOpacity }}>
        {/* {backgroundImage ? <Image src={backgroundImage} style={styles.backgroundImage} /> : null} */}
        {PANELS.map((panel) => {
          const panelStyle = { left: pageWidth * panel.left, width: pageWidth * panel.width }
          const Section = panelComponents[panel.key]
          return (
            <View key={panel.key} style={[styles.panel, panelStyle]}>
              <Section data={{ ...data, image_urls: imageUrls }} />
            </View>
          )
        })}
      </Page>
    </Document>
  )
}
