import { Document, Image, Page, StyleSheet } from "@react-pdf/renderer"

const PAGE_WIDTH = 1224
const PAGE_HEIGHT = 792

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  reportImage: {
    maxWidth: PAGE_WIDTH - 72,
    maxHeight: PAGE_HEIGHT - 72,
    objectFit: "contain",
  },
})

export default function CenterReportPDF({ imageSrc, opacity = 1 }: { imageSrc: string; opacity?: number }) {
  return (
    <Document>
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={[styles.page, { opacity }]}>
        <Image src={imageSrc} style={styles.reportImage} />
      </Page>
    </Document>
  )
}
