/* eslint-disable @typescript-eslint/no-explicit-any */

// InvoicePDF.tsx
import { Document, Page, View, StyleSheet, Text, Image } from "@react-pdf/renderer"
import InvoicePDFSection1 from "./InvoicePDFSection1-GradingScales"
import InvoicePDFSection2 from "./InvoicePDFSection2-GradingScales"
import InvoicePDFSection4 from "./InvoicePDFSection4-GradingScales"
import InvoicePDFSection5 from "./InvoicePDFSection5-GradingScales"
import { Font } from "@react-pdf/renderer"
import InvoicePDFSection3 from "./InvoicePDFSection3-GradingScales"
import { baseFont } from "../PDFStyles"

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

const styles = StyleSheet.create({
  page: {
    width: 1224,
    height: 792,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#fff",
    flexDirection: "column",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },
  titleContainer: {
    width: "100%",
    textAlign: "center",
    paddingTop: "156px",
    left: "10px",//15px
  },
  titleText: {
    fontFamily: baseFont,
    fontSize: 12,
    color: "#000",
    marginRight: "257px",
  },
  contentRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
})

export type PDFLayout = {
  section1?: { marginTop?: number; marginLeft?: number }
  section2?: { marginTop?: number; marginLeft?: number }
  section3?: { top?: number; left?: number }
  section4?: { marginTop?: number; marginLeft?: number }
  section5?: { marginTop?: number; marginLeft?: number }
  diaText?: { top?: number; left?: number }
}

export type SectionType = 'section1' | 'section2' | 'section3' | 'section4' | 'section5' | 'diaText'

export default function InvoicePDF({
  data,
  size = "14x8.5",
  offsets,
  layout,
  activeSection,
}: {
  data: any
  size?: "17x11" | "14x8.5"
  offsets?: { [key: string]: { x: number; y: number } }
  layout?: PDFLayout
  activeSection?: SectionType
}) {
  const isSmall = size === "14x8.5"

  const dimensions = isSmall
    ? { width: 1008, height: 612 }
    : { width: 1224, height: 792 }

  // 🔥 Dynamic background image based on size
  const backgroundImageSrc = isSmall
    ? "/14-8.jpg"
    : "/17-11.jpg"

  const titleContainerStyle = isSmall
    ? { ...styles.titleContainer, paddingTop: "42px", marginBottom: "4px",marginLeft: "7px" }  //14 *8.5
    : styles.titleContainer

  const contentRowStyle = isSmall
    ? { ...styles.contentRow, marginTop: "0px", marginLeft: "25px", gap: 8 }  //14 *8.5
    : styles.contentRow

  // Support both old offsets system and new layout system
  const section1Layout = layout?.section1 || {}
  const section2Layout = layout?.section2 || {}
  const section3Layout = layout?.section3 || {}
  const section4Layout = layout?.section4 || {}
  const section5Layout = layout?.section5 || {}
  const diaTextLayout = layout?.diaText || {}

  // Fallback to offsets if layout not provided
  const section1Offset = offsets?.section1 || { x: 0, y: 0 }
  const section2Offset = offsets?.section2 || { x: 0, y: 0 }
  const section3Offset = offsets?.section3 || { x: 0, y: 0 }
  const section4Offset = offsets?.section4 || { x: 0, y: 0 }
  const section5Offset = offsets?.section5 || { x: 0, y: 0 }

  // Merge layout and offsets (layout takes precedence)
  const section1Top = section1Layout.marginTop ?? (isSmall ? 38 : 42)
  const section1Left = section1Layout.marginLeft ?? (isSmall ? -14 : 103)

  const section4Top = section4Layout.marginTop ?? (isSmall ? 23 : 28)
  const section4Left = section4Layout.marginLeft ?? (isSmall ? 41 : 36)

  const section5Top = section5Layout.marginTop ?? (isSmall ? 21 : 28)
  const section5Left = section5Layout.marginLeft ?? (isSmall ? 18 : 14)

  const section2Top = section2Layout.marginTop ?? (isSmall ? -7 : 2)
  const section2Left = section2Layout.marginLeft ?? 50

  const section3Top = section3Layout.top ?? 426
  const section3Left = section3Layout.left ?? (isSmall ? 52.5 : 42.5)

  const diaTextTop = diaTextLayout.top ?? 485.4
  const diaTextLeft = diaTextLayout.left ?? 233

  const section1Style = {
    width: "215px",
    marginTop: `${section1Top}px`,
    marginLeft: `${section1Left}px`,
  }

  const section4Style = {
    width: "236px",
    height: "100%",
    marginLeft: `${section4Left}px`,
    marginTop: `${section4Top}px`,
    position: "relative" as const,
  }

  const section5Style = {
    width: "215px",
    marginTop: `${section5Top}px`,
    marginLeft: `${section5Left}px`,
  }

  const section2Style = {
    width: "183px",
    marginLeft: `${section2Left}px`,
    marginTop: `${section2Top}px`,
    position: "relative" as const,
    height: "100%" as const,
  }

  const diaTextPosition = {
    position: "absolute" as const,
    width: 30,
    height: 20,
    top: diaTextTop,
    left: diaTextLeft,
    transform: "rotate(-90deg)",
  }

  const section3Position = {
    width: 68,
    height: 170,
    position: "absolute" as const,
    left: `${section3Left}px`,
    top: section3Top,
    transform: "rotate(-90deg)",
  }

  return (
    <Document>
      <Page
        size={[dimensions.width, dimensions.height]}
        style={{ ...styles.page, width: dimensions.width, height: dimensions.height }}
      >
        {/* ✅ Dynamic background image */}
        {/* <Image src={backgroundImageSrc} style={styles.backgroundImage} /> */}

        <View style={titleContainerStyle}>
          <Text style={styles.titleText}>
            {data?.GIANATURALDIAMONDGRADINGREPORT?.GIAReportNumber}
          </Text>
        </View>

        <View style={contentRowStyle}>
          <View style={section1Style}>
            <InvoicePDFSection1 data={data} />
          </View>

          <View style={section4Style}>
            <View>
              <InvoicePDFSection4 data={data} />
              {/* <View style={diaTextPosition}>
                <Text
                  style={{
                    fontFamily: "OCR",
                    fontWeight: "light",
                    fontSize: 7.19,
                    textAlign: "right",
                    
                  }}
                >
                  DIA
                </Text>
              </View> */}
            </View>
          </View>

          <View style={section5Style}>
            <InvoicePDFSection5 data={data} />
          </View>

          <View style={section2Style}>
            <InvoicePDFSection2 data={data} />
            <View style={section3Position}>
              <InvoicePDFSection3 data={data} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
