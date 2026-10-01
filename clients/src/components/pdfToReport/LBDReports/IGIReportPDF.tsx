/* eslint-disable @typescript-eslint/no-explicit-any */

import { PDFViewer, Font } from "@react-pdf/renderer"
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

interface IGIReportPDFProps {
  data: any
  clientName?: string
  backgroundImage?: string
}

const IGIReportPDF: React.FC<IGIReportPDFProps> = ({ data, clientName, backgroundImage }) => {
  // IGIReportContent already returns a full <Document><Page>...</Page></Document>.
  // Do NOT wrap it in another <Document> here - nesting Documents (or wrapping
  // this whole thing in <PDFViewer> when generating a blob via pdf().toBlob())
  // is what causes Acrobat's "this file cannot be opened because it has no
  // pages" error. This component is for on-screen preview only.
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <IGIReportContent
        data={{ ...data, clientName }}
        backgroundImage={backgroundImage || "/igi-report-template.jpg"}
      />
    </PDFViewer>
  )
}

export default IGIReportPDF