/* eslint-disable @typescript-eslint/no-explicit-any */

import { Document, Page, View, StyleSheet, Text, Image, Font } from "@react-pdf/renderer"
import IGIReportContent from "./IGIReportContent"

// Register fonts
const dinProRegular = "/fonts/DINPro-Light_13935.ttf"
const dinProBold = "/fonts/DINPro-Medium_13936.ttf"

Font.register({
  family: "DINPro",
  fonts: [
    {
      src: dinProRegular,
      fontWeight: "normal",
    },
    {
      src: dinProBold,
      fontWeight: "bold",
    },
  ],
})

Font.register({
  family: "OCR",
  src: "/fonts/OCR-a___.ttf",
})

Font.register({
  family: "Helvetica-Light",
  src: "/fonts/Helvetica-Light.ttf",
  fontWeight: "light",
})

Font.registerHyphenationCallback((word) => {
  return [word]
})

// Fixed size: 14 × 8.5 inches = 1008 × 612 points
const styles = StyleSheet.create({
  page: {
    width: 1008,
    height: 612,
    fontSize: 9,
    fontFamily: "Helvetica",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 1008,
    height: 612,
    zIndex: 0,
  },
  contentOverlay: {
    position: "relative",
    width: "100%",
    height: "100%",
    zIndex: 1,
    padding: 0,
  },
})

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
  clientName?: string
  Images?: {
    Proportions?: string
    QRCode?: string
  }
  [key: string]: any
}

interface IGIReportPDFProps {
  data: IGIReportData
}

const IGIReportPDF: React.FC<IGIReportPDFProps> = ({ data }) => {
  return (
    <Document>
      <Page size={[1008, 612]} style={styles.page}>
        {/* Background Image */}
        <Image
          src="/images/igi-report-template.jpg"
          style={styles.backgroundImage}
        />

        {/* Content Overlay */}
        <View style={styles.contentOverlay}>
          <IGIReportContent data={data} />
        </View>
      </Page>
    </Document>
  )
}

export default IGIReportPDF
